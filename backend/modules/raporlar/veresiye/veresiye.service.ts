/*
 * Veresiye (açık borç) iş kuralları: dört kaynağın (motor, servis, aksesuar, yedek parça) kalan ödemeleri tek listede
 * birleşir, en yeni önce sıralanır, kaynak bazında özetlenir. HTTP bilmez (express yok).
 */
import type { Veritabani } from '../../../core/tipler';
import { parcalariEkle } from '../../../shared/altKayitlar';
import * as repo from './veresiye.repository';

type Satir = Record<string, any>;

const f = (v: unknown): number => parseFloat((v || 0) as string);

export type KaynakAnahtari = 'motor' | 'servis' | 'aksesuar' | 'yedek_parca';

export interface Borc {
  kaynak: string;
  kaynak_key: KaynakAnahtari;
  id: number;
  fis_no?: unknown;
  musteri_adi: string;
  telefon: string;
  kalan_odeme: number;
  toplam_tutar: number;
  tarih: unknown;
  aciklama: string;
  detay: Record<string, any>;
}

/** Dört kaynağın satırlarını tek borç listesine ve özete çevirir (saf fonksiyon: veritabanı yok). */
export const borclariBirlestir = (g: { motor: Satir[]; servis: Satir[]; aksesuar: Satir[]; yedek: Satir[] }) => {
  const kaynaklar: Borc[] = [];

  g.motor.forEach((r) => kaynaklar.push({
    kaynak: 'Motor Satış',
    kaynak_key: 'motor',
    id: r.id,
    musteri_adi: r.musteri_adi || '-',
    telefon: r.telefon || '',
    kalan_odeme: f(r.kalan_odeme),
    toplam_tutar: f(r.toplam_tutar),
    tarih: r.tarih,
    aciklama: `${r.plaka || ''} ${r.marka || ''} ${r.model || ''}`.trim(),
    detay: {
      plaka: r.plaka, marka: r.marka, model: r.model, yil: r.yil, km: r.km,
      odeme_sekli: r.odeme_sekli, alici_tc: r.alici_tc, alici_adres: r.alici_adres,
      alis_fiyati: f(r.alis_fiyati),
      noter_satis: f(r.noter_satis),
      fatura_kesildi: r.fatura_kesildi, yevmiye_no: r.yevmiye_no,
      notlar: r.notlar, durum: r.durum,
    },
  }));

  g.servis.forEach((r) => kaynaklar.push({
    kaynak: 'Servis',
    kaynak_key: 'servis',
    id: r.id,
    fis_no: r.fis_no,
    musteri_adi: r.musteri_adi || '-',
    telefon: r.telefon || '',
    kalan_odeme: f(r.kalan_odeme),
    toplam_tutar: f(r.toplam_tutar),
    tarih: r.tarih,
    aciklama: `Fiş #${r.fis_no} • ${r.marka || ''} ${r.model_tip || ''}`.trim(),
    detay: {
      fis_no: r.fis_no, marka: r.marka, model_tip: r.model_tip, km: r.km,
      adres: r.adres, ariza_sikayetler: r.ariza_sikayetler, notlar: r.notlar,
      odeme_detaylari: r.odeme_detaylari, durum: r.durum,
      tahmini_toplam_ucret: f(r.tahmini_toplam_ucret),
      parcalar: r.parcalar,
    },
  }));

  g.aksesuar.forEach((r) => kaynaklar.push({
    kaynak: 'Aksesuar',
    kaynak_key: 'aksesuar',
    id: r.id,
    musteri_adi: r.musteri_adi || '-',
    telefon: r.telefon || '',
    kalan_odeme: f(r.kalan_odeme),
    toplam_tutar: f(r.toplam_tutar),
    tarih: r.tarih,
    aciklama: (r.parcalar && r.parcalar.length ? r.parcalar.map((x: Satir) => x.urun_adi).filter(Boolean).join(', ') : '') || r.notlar || '',
    detay: {
      odeme_sekli: r.odeme_sekli, odeme_detaylari: r.odeme_detaylari,
      durum: r.durum, notlar: r.notlar, parcalar: r.parcalar,
    },
  }));

  g.yedek.forEach((r) => kaynaklar.push({
    kaynak: 'Yedek Parça',
    kaynak_key: 'yedek_parca',
    id: r.id,
    musteri_adi: r.musteri_adi || '-',
    telefon: r.telefon || '',
    kalan_odeme: f(r.kalan_odeme),
    toplam_tutar: f(r.toplam_tutar),
    tarih: r.tarih,
    aciklama: r.urun_adi || '',
    detay: {
      urun_adi: r.urun_adi,
      alis_fiyati: f(r.alis_fiyati),
      satis_fiyati: f(r.toplam_tutar),
    },
  }));

  // Tarihe göre sırala (en yeni önce); tarihi olmayan en sona
  kaynaklar.sort((a, b) => {
    const da = a.tarih ? new Date(a.tarih as string).getTime() : 0;
    const db = b.tarih ? new Date(b.tarih as string).getTime() : 0;
    return db - da;
  });

  const kaynakToplami = (anahtar: KaynakAnahtari) => kaynaklar.filter((s) => s.kaynak_key === anahtar).reduce((s, x) => s + x.kalan_odeme, 0);
  return {
    borclar: kaynaklar,
    ozet: {
      motor: kaynakToplami('motor'),
      servis: kaynakToplami('servis'),
      aksesuar: kaynakToplami('aksesuar'),
      yedek_parca: kaynakToplami('yedek_parca'),
      toplam: kaynaklar.reduce((s, x) => s + (x.kalan_odeme || 0), 0),
      kayit_sayisi: kaynaklar.length,
    },
  };
};

/** Tüm açık borçlar (kalan_odeme > 0) tek listede. */
export const borclar = async (db: Veritabani) => {
  const motor = await repo.motorBorclari(db);
  // json_agg karşılığı: parçalar ayrı sorguyla eklenir
  const servis = await parcalariEkle(db, await repo.servisBorclari(db), 'parcalar', 'is_emri_id',
    ['takilan_parca', 'adet', 'birim_fiyat', 'toplam_fiyat'], ['birim_fiyat', 'toplam_fiyat']);
  const aksesuar = await parcalariEkle(db, await repo.aksesuarBorclari(db), 'aksesuar_parcalar', 'aksesuar_id',
    ['urun_adi', 'adet', 'satis_fiyati'], ['satis_fiyati']);
  const yedek = await repo.yedekParcaBorclari(db);
  return borclariBirlestir({ motor, servis, aksesuar, yedek });
};
