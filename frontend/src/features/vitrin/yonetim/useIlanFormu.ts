import { useState, type ChangeEvent } from 'react';
import { vitrinService } from '../vitrinApi';
import { sifirMotorService } from '../../motor/motorApi';
import { urlDenDataUrl } from './gorselIsle';
import { useGorselListesi } from './useGorselListesi';
import type { AksesuarStok, Motor, SifirMotor, VitrinIlan } from '../../../shared/tipler';
import type { Bildir } from './tipler';

/** İlan formunun alanları; sayısal alanlar yazılırken metin, kayıttan gelirken sayı olabilir. */
export interface IlanFormu {
  baslik: string;
  aciklama: string;
  fiyat: string | number;
  video_url: string;
  marka: string;
  model: string;
  yil: string | number;
  segment: string;
  motor_cc: string | number;
  km: string | number;
  hasar_kaydi: string;
  motor_durumu: string;
  yayinda: boolean;
  siralama: number;
  one_cikan: boolean;
  stok_motor_id: number | null;
  sifir_motor_id: number | null;
  rubik_link: string;
}

const bosUrun: IlanFormu = {
  baslik: '',
  aciklama: '',
  fiyat: '',
  video_url: '',
  marka: '',
  model: '',
  yil: '',
  segment: '',
  motor_cc: '',
  km: '',
  hasar_kaydi: '',
  motor_durumu: 'ikinci_el',
  yayinda: true,
  siralama: 0,
  one_cikan: false,
  stok_motor_id: null,
  sifir_motor_id: null,
  rubik_link: '',
};

// İlan ekleme/düzenleme penceresinin tüm durumu: alanlar, görseller (sıralama/sürükleme), video, stoktan doldurma, kaydetme.
// `yenile`: kaydedince ilan listesini yeniden yükler; `urunler`: yeni ilanın sıra numarası için.
interface IlanFormuGirdisi {
  kategori: string;
  isMotor: boolean;
  urunler: VitrinIlan[];
  videoLimitMb: number;
  bildir: Bildir;
  yenile: () => void;
}

export const useIlanFormu = ({ kategori, isMotor, urunler, videoLimitMb, bildir, yenile }: IlanFormuGirdisi) => {
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState<IlanFormu>(bosUrun);
  const [editId, setEditId] = useState<number | null>(null);
  const gorselListesi = useGorselListesi(bildir); // base64 data URL dizisi; ilki kapak
  const { gorseller, setGorseller } = gorselListesi;
  const [saving, setSaving] = useState(false);
  const [sifirGorselYukleniyor, setSifirGorselYukleniyor] = useState(false);

  // video: videoFile = yeni seçilen base64; videoVar = üründe zaten video var mı; videoSil = mevcudu kaldır
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoAdi, setVideoAdi] = useState('');
  const [videoVar, setVideoVar] = useState(false);
  const [videoSil, setVideoSil] = useState(false);
  const [videoYukleniyor, setVideoYukleniyor] = useState(false);

  // Stoktan aksesuar seçilince TÜM bilgileri otomatik doldur
  const secStokAksesuar = (urun: AksesuarStok | null) => {
    if (!urun) return;
    // Müşteriye gösterilecek detayları açıklamaya derle (kategori, beden, renk, marka)
    const detaylar = [
      urun.marka ? `Marka: ${urun.marka}` : null,
      urun.kategori ? `Kategori: ${urun.kategori}` : null,
      urun.beden ? `Beden: ${urun.beden}` : null,
      urun.renk ? `Renk: ${urun.renk}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    setForm((f) => ({
      ...f,
      baslik: urun.stok_adi || f.baslik,
      marka: urun.marka || f.marka,
      fiyat: urun.satis_fiyati || f.fiyat,
      aciklama: f.aciklama || detaylar,
    }));
  };

  // Stoktan motor seçilince temel bilgileri forma doldur (tekrar elle girilmesin)
  const secStokMotor = (motor: Motor | null) => {
    if (!motor) {
      setForm((f) => ({ ...f, stok_motor_id: null }));
      return;
    }
    setForm((f) => ({
      ...f,
      stok_motor_id: motor.id,
      sifir_motor_id: null,
      marka: motor.marka || f.marka,
      model: motor.model || f.model,
      yil: motor.yil || f.yil,
      km: motor.km || f.km,
      // Stoktaki ilan fiyatı sitede de aynen kullanılır
      fiyat: motor.liste_fiyati || motor.satis_fiyati || f.fiyat,
      baslik: motor.vitrin_baslik || f.baslik || [motor.marka, motor.model, motor.yil].filter(Boolean).join(' '),
      aciklama: motor.vitrin_aciklama || f.aciklama,
      segment: motor.vitrin_segment || f.segment,
      motor_cc: motor.vitrin_cc || f.motor_cc,
      hasar_kaydi: motor.vitrin_hasar || f.hasar_kaydi,
    }));
  };

  // Sıfır stoktan model seçilince bilgiler ve FOTOĞRAFLAR stoktan gelir (müşteri bir kez girer; fiyat stokla senkron kalır)
  const secSifirMotor = async (model: SifirMotor | null) => {
    if (!model) {
      setForm((f) => ({ ...f, sifir_motor_id: null }));
      return;
    }
    setForm((f) => ({
      ...f,
      sifir_motor_id: model.id,
      stok_motor_id: null,
      marka: model.marka || f.marka,
      model: model.model || f.model,
      yil: model.yil || f.yil,
      km: '',
      motor_cc: model.motor_cc || f.motor_cc,
      segment: model.segment || f.segment,
      fiyat: model.liste_fiyati || f.fiyat,
      baslik: f.baslik || [model.marka, model.model, model.yil].filter(Boolean).join(' '),
      aciklama: model.aciklama || f.aciklama,
    }));
    if (!model.gorsel_sayisi) return;
    setSifirGorselYukleniyor(true);
    try {
      const { data } = await sifirMotorService.getById(model.id);
      setGorseller(await Promise.all((data.gorsel_idler || []).map((gid) => urlDenDataUrl(sifirMotorService.gorselUrl(gid)))));
    } catch {
      bildir('Stoktaki fotoğraflar getirilemedi; elle ekleyebilirsiniz', 'warning');
    }
    setSifirGorselYukleniyor(false);
  };

  const resetVideo = () => {
    setVideoFile(null);
    setVideoAdi('');
    setVideoVar(false);
    setVideoSil(false);
  };

  const openNew = () => {
    const nextSira = urunler.reduce((max, u) => Math.max(max, Number(u.siralama) || 0), -1) + 1;
    setForm({ ...bosUrun, siralama: nextSira });
    setGorseller([]);
    setEditId(null);
    resetVideo();
    setDlgOpen(true);
  };

  const openEdit = async (urun: VitrinIlan) => {
    try {
      const res = await vitrinService.getById(urun.id);
      const d = res.data;
      setForm({
        baslik: d.baslik || '',
        aciklama: d.aciklama || '',
        fiyat: d.fiyat || '',
        video_url: d.video_url || '',
        marka: d.marka || '',
        model: d.model || '',
        yil: d.yil || '',
        segment: d.segment || '',
        motor_cc: d.motor_cc || '',
        km: d.km || '',
        hasar_kaydi: d.hasar_kaydi || '',
        motor_durumu: d.motor_durumu || 'ikinci_el',
        yayinda: d.yayinda,
        siralama: d.siralama || 0,
        one_cikan: !!d.one_cikan,
        stok_motor_id: d.stok_motor_id || null,
        sifir_motor_id: d.sifir_motor_id || null,
        rubik_link: d.rubik_link || '',
      });
      // mevcut görselleri data URL olarak getir (endpoint'ten)
      setGorseller(await Promise.all((d.gorsel_idler || []).map((gid) => urlDenDataUrl(vitrinService.gorselUrl(gid)))));
      // Mevcut video base64'ünü forma çekmeyiz (büyük olabilir); sadece var/yok bilgisini tutarız
      setVideoFile(null);
      setVideoAdi('');
      setVideoSil(false);
      setVideoVar(!!d.video_dosya_id);
      setEditId(urun.id);
      setDlgOpen(true);
    } catch {
      bildir('Ürün yüklenemedi', 'error');
    }
  };

  const handleVideoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    // Sunucunun kabul ettiği sınırı (veritabanı paket sınırı) aşan video yüklenmeden uyarılır
    if (file.size > videoLimitMb * 1024 * 1024) {
      bildir(`Video çok büyük (en fazla ~${videoLimitMb} MB). Lütfen sıkıştırın.`, 'warning');
      return;
    }
    setVideoYukleniyor(true);
    const reader = new FileReader();
    reader.onload = () => {
      setVideoFile(reader.result as string);
      setVideoAdi(file.name);
      setVideoSil(false);
      setVideoYukleniyor(false);
    };
    reader.onerror = () => {
      bildir('Video okunamadı', 'error');
      setVideoYukleniyor(false);
    };
    reader.readAsDataURL(file);
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoAdi('');
    if (videoVar) setVideoSil(true); // kaydedince sunucudaki mevcut video silinsin
  };

  const handleSave = async () => {
    if (!form.baslik.trim()) {
      bildir('Başlık zorunlu', 'warning');
      return;
    }
    if (isMotor && !(form.segment || '').trim()) {
      bildir('Motor ilanı için segment seçin', 'warning');
      return;
    }
    // Rubik linki girildiyse basit URL kontrolü (opsiyonel alan)
    const rubik = (form.rubik_link || '').trim();
    if (rubik && !/^https?:\/\/.+\..+/i.test(rubik)) {
      bildir('Geçerli bir Rubik ödeme linki girin (https:// ile başlamalı)', 'warning');
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = { ...form, kategori, gorseller };
    if (videoFile)
      payload.video = videoFile; // yeni video yüklendi
    else if (videoSil) payload.video_sil = true; // mevcut video kaldırıldı
    try {
      if (editId) await vitrinService.update(editId, payload);
      else await vitrinService.create(payload);
      setDlgOpen(false);
      bildir('Kaydedildi');
      yenile();
    } catch {
      bildir('Kaydedilemedi', 'error');
    }
    setSaving(false);
  };

  const kapat = () => setDlgOpen(false);

  return {
    dlgOpen,
    kapat,
    form,
    setForm,
    editId,
    ...gorselListesi,
    saving,
    sifirGorselYukleniyor,
    videoFile,
    videoAdi,
    videoVar,
    videoSil,
    videoYukleniyor,
    secStokAksesuar,
    secStokMotor,
    secSifirMotor,
    openNew,
    openEdit,
    handleVideoFile,
    removeVideo,
    handleSave,
  };
};

export type IlanFormuDurumu = ReturnType<typeof useIlanFormu>;
