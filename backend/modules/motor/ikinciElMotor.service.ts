/*
 * İkinci el motor iş kuralları: kâr hesabı, alan düzeyinde yetki (kim neyi değiştirebilir/görebilir), bağlı vitrin
 * ilanının senkronu, müşteri otomatik kaydı. HTTP bilmez (express yok). Denetim günlüğü controller'da yazılır.
 * Okuma görünümü (kim hangi alanı görür) ikinciElMotor.gorunum.ts içindedir.
 */
import { BulunamadiHatasi, YetkiHatasi } from '../../core/dogrula';
import { bosuSifir } from '../../core/sayi';
import type { BaglamDb, Kullanici, Veritabani } from '../../core/tipler';
import { upsertMusteri } from '../musteriler/musteriler.service';
import { motorKapsami, muhasebeMotorGorur, sanitizeMotor, sanitizeOzet } from './ikinciElMotor.gorunum';
import type { MotorSatiri } from './ikinciElMotor.gorunum';
import type { MotorFiltresi, MotorGuncelleGovdesi, MotorOlusturGovdesi } from './ikinciElMotor.schemas';
import * as repo from './ikinciElMotor.repository';

/** Parçalı ödeme dağılımını JSON string olarak normalize eder. */
export const odemeyiNormalle = (v: unknown): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return null; }
};

const sayi = (v: unknown): number => parseFloat(v as string) || 0;

/** Kâr = satış − alış − masraf − komisyoncu tutarı. Yatırımcı payı işletme kârından ayrıca düşülür (raporlarda). */
export const karHesapla = (satis: number, alis: number, masraf: number, komisyonTutar: number): number =>
  satis - alis - masraf - komisyonTutar;

// ---------------------------------------------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------------------------------------------

export const ozet = async (db: Veritabani, kullanici: Kullanici) => sanitizeOzet(await repo.ozet(db), kullanici);

export const listele = async (db: Veritabani, kullanici: Kullanici, filtre: MotorFiltresi) => {
  const satirlar = await repo.listele(db, filtre, motorKapsami(kullanici));
  return satirlar.map((r) => sanitizeMotor(r, kullanici));
};

export const detay = async (db: Veritabani, id: number, kullanici: Kullanici) => {
  const satir = await repo.idyeGoreBul(db, id);
  if (!satir) throw new BulunamadiHatasi('Kayıt bulunamadı');
  // Yatırımcı (vitrin modu hariç) başka birine ait motoru göremez
  if (kullanici.rol === 'yatirimci' && !kullanici.liste_fiyati_gor && satir.yatirimci_id !== kullanici.id) {
    throw new YetkiHatasi('Bu kayda erişim yetkiniz yok');
  }
  // Satılmış motor: listeyle AYNI kural (eskiden liste gizliyor ama id ile erişim açıktı)
  if (kullanici.rol !== 'admin' && kullanici.rol !== 'yatirimci' && !kullanici.satis_gecmisi_gor && !kullanici.motor_satis_yetkisi
      && !muhasebeMotorGorur(kullanici) && satir.durum === 'tamamlandi') {
    throw new BulunamadiHatasi('Kayıt bulunamadı');
  }
  return sanitizeMotor(satir, kullanici);
};

// ---------------------------------------------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------------------------------------------

/**
 * Motor satışı/stok kaydı ekler. Motor kaydı ve müşteri kayıtları TEK işlemde yazılır: biri patlarsa hiçbiri kalmaz
 * (eskiden kayıt oluşup kullanıcı hata görüyor, yeniden deneyince çift kayıt çıkıyordu).
 */
export const olustur = async (db: BaglamDb, govde: MotorOlusturGovdesi, kullanici: Kullanici) => {
  const satir = await db.withTransaction(async (tx) => {
    const alis = bosuSifir(govde.alis_fiyati);
    const satis = bosuSifir(govde.satis_fiyati);
    const masraf = bosuSifir(govde.masraflar);
    const komisyonTutar = bosuSifir(govde.komisyoncu_tutari);

    // Yatırımcı ataması ve yatırımcı kârı YALNIZCA admin tarafından yapılır (PUT'taki canKar kuralıyla aynı); başkasının
    // gönderdiği değer yok sayılır. Kâr satış esnasında elle (tutar olarak) girilir, işletme kârından düşer.
    const yatirimciId = kullanici.rol === 'admin' && govde.yatirimci_id ? parseInt(String(govde.yatirimci_id)) : null;

    const kayit = await repo.ekle(tx, {
      tarih: govde.tarih || new Date(), plaka: govde.plaka, marka: govde.marka, model: govde.model, km: bosuSifir(govde.km),
      alis, satis, noterAlis: bosuSifir(govde.noter_alis), noterSatis: bosuSifir(govde.noter_satis), masraf,
      kar: karHesapla(satis, alis, masraf, komisyonTutar),
      alici_adi: govde.alici_adi, alici_tc: govde.alici_tc, alici_telefon: govde.alici_telefon, alici_adres: govde.alici_adres,
      odeme_sekli: govde.odeme_sekli || 'nakit', aciklama: govde.aciklama, durum: govde.durum || 'stokta',
      tamamlamaTarihi: govde.durum === 'tamamlandi' ? new Date() : null, stok_tipi: govde.stok_tipi || 'sahip',
      yil: bosuSifir(govde.yil) || null, satici_adi: govde.satici_adi || null, satici_tc: govde.satici_tc || null,
      kalan_odeme: bosuSifir(govde.kalan_odeme), fatura_kesildi: govde.fatura_kesildi || false,
      yevmiye_no: govde.yevmiye_no || null, satis_tarihi: govde.satis_tarihi || null,
      komisyoncu_adi: govde.komisyoncu_adi || null, komisyoncu_telefon: govde.komisyoncu_telefon || null, komisyonTutar,
      yatirimciId,
      yatirimciOran: yatirimciId ? bosuSifir(govde.yatirimci_kar_orani) : 0,
      yatirimciKar: yatirimciId ? bosuSifir(govde.yatirimci_kar) : 0,
      listeFiyati: bosuSifir(govde.liste_fiyati), odemeDetay: odemeyiNormalle(govde.odeme_detaylari),
      vitrin_baslik: govde.vitrin_baslik || null, vitrin_aciklama: govde.vitrin_aciklama || null,
      vitrin_segment: govde.vitrin_segment || null, vitrin_cc: bosuSifir(govde.vitrin_cc) || null, vitrin_hasar: govde.vitrin_hasar || null,
    });

    // Müşteri auto-collect (aynı işlemde)
    if (govde.satici_adi) await upsertMusteri(govde.satici_adi, null, null, tx);
    if (govde.alici_adi) await upsertMusteri(govde.alici_adi, govde.alici_telefon, govde.alici_adres, tx);
    if (govde.komisyoncu_adi) await upsertMusteri(govde.komisyoncu_adi, govde.komisyoncu_telefon, null, tx);
    return kayit;
  });
  return sanitizeMotor(satir, kullanici) as MotorSatiri;
};

/**
 * Motor kaydı, bağlı vitrin ilanının yayından kalkması/fiyatı ve müşteri kayıtları TEK işlemde yazılır; ilan senkronu
 * patlarsa motor güncellemesi de geri alınır (eskiden satış kaydedilir ama ilan yayında kalırdı). Satır FOR UPDATE ile
 * kilitlenir: eşzamanlı güncellemeler sıraya girer.
 *
 * KISMİ GÜNCELLEME: istek gövdesinde hiç gönderilmeyen alan (undefined) mevcut kayıttaki değeriyle korunur. Formlar farklı
 * alan kümeleri gönderir (ör. Motor Stok formunda satış alanları yoktur); eksik alanın 0/NULL yazılıp satış verisini
 * silmesi engellenir. Açıkça gönderilen değer (boş metin dahil) uygulanır.
 */
export const guncelle = async (db: BaglamDb, id: number, govde: MotorGuncelleGovdesi, kullanici: Kullanici) => {
  const satir = await db.withTransaction(async (tx) => {
    const mevcut = await repo.kilitleyerekOku(tx, id);
    if (!mevcut) throw new BulunamadiHatasi('Kayıt bulunamadı');

    // Yatırımcı kendi motoru dışındakini güncelleyemez
    if (kullanici.rol === 'yatirimci' && mevcut.yatirimci_id !== kullanici.id) {
      throw new YetkiHatasi('Bu kayda erişim yetkiniz yok');
    }

    const isAdmin = kullanici.rol === 'admin';
    const ms = !!kullanici.motor_satis_yetkisi;
    const canAlis = isAdmin || kullanici.alis_fiyati_gor || ms;
    const canKar = isAdmin; // yatırımcı/kâr alanlarını yalnızca admin değiştirir
    const canListe = isAdmin || kullanici.liste_fiyati_gor;
    // Motor Satış yetkisi satış fiyatı ve müşteri bilgisini düzenlemeyi kapsar
    const canSatis = isAdmin || kullanici.satis_fiyati_gor || ms;
    const canMusteri = isAdmin || kullanici.musteri_gor || ms;

    const g = govde as Record<string, any>;
    const al = (alan: string) => (g[alan] !== undefined ? g[alan] : mevcut[alan]);
    // Ödeme dağılımı body'de yoksa mevcut değeri koru (kısmi güncellemeyi bozma)
    const odemeDetay = g.odeme_detaylari !== undefined ? odemeyiNormalle(g.odeme_detaylari) : (mevcut.odeme_detaylari || null);
    const durum = al('durum');

    // Hassas alanlar: yetkisi olmayan kullanıcının gönderdiği (boş/null) değerle veriyi bozmamak için DB değerini koru
    const alis = canAlis ? bosuSifir(al('alis_fiyati')) : sayi(mevcut.alis_fiyati);
    const nAlis = canSatis ? bosuSifir(al('noter_alis')) : sayi(mevcut.noter_alis);
    const satis = canSatis ? bosuSifir(al('satis_fiyati')) : sayi(mevcut.satis_fiyati);
    const nSatis = canSatis ? bosuSifir(al('noter_satis')) : sayi(mevcut.noter_satis);
    // masraflar kâr hesabına girer; diğer maliyet alanlarıyla aynı yetkiye bağlıdır.
    // Yetkisi olmayan kullanıcının boş göndermesiyle kâr bozulmasın diye DB değeri korunur.
    const masraf = canAlis ? bosuSifir(al('masraflar')) : sayi(mevcut.masraflar);
    // Müşteri/komisyon alanları: yetkisi olmayan personelin boş göndermesiyle veri bozulmasın
    const komisyonTutar = canMusteri ? bosuSifir(al('komisyoncu_tutari')) : sayi(mevcut.komisyoncu_tutari);
    const aliciAdi = canMusteri ? al('alici_adi') : mevcut.alici_adi;
    const aliciTc = canMusteri ? al('alici_tc') : mevcut.alici_tc;
    const aliciTel = canMusteri ? al('alici_telefon') : mevcut.alici_telefon;
    const aliciAdres = canMusteri ? al('alici_adres') : mevcut.alici_adres;
    const saticiAdi = canMusteri ? (al('satici_adi') || null) : mevcut.satici_adi;
    const saticiTc = canMusteri ? (al('satici_tc') || null) : mevcut.satici_tc;
    const komAdi = canMusteri ? (al('komisyoncu_adi') || null) : mevcut.komisyoncu_adi;
    const komTel = canMusteri ? (al('komisyoncu_telefon') || null) : mevcut.komisyoncu_telefon;
    const kar = karHesapla(satis, alis, masraf, komisyonTutar);
    const yatirimciId: number | null = canKar
      ? (g.yatirimci_id ? parseInt(String(g.yatirimci_id)) : (g.yatirimci_id === null ? null : (mevcut.yatirimci_id || null)))
      : (mevcut.yatirimci_id || null);
    const yatirimciOran = canKar ? (yatirimciId ? bosuSifir(al('yatirimci_kar_orani')) : 0) : sayi(mevcut.yatirimci_kar_orani);
    // Yatırımcı kârı: satışta elle girilen tutar. Body'de yoksa (örn. stok düzenleme) mevcut değeri koru.
    const yatirimciKar = !yatirimciId ? 0
      : (canKar && g.yatirimci_kar !== undefined ? bosuSifir(g.yatirimci_kar) : sayi(mevcut.yatirimci_kar));
    const listeFiyati = canListe ? bosuSifir(al('liste_fiyati')) : sayi(mevcut.liste_fiyati);
    const yeniSatildi = durum === 'tamamlandi' && mevcut.durum !== 'tamamlandi';

    const guncel = await repo.guncelle(tx, id, {
      tarih: al('tarih'), plaka: al('plaka'), marka: al('marka'), model: al('model'), km: bosuSifir(al('km')),
      alis, satis, noterAlis: nAlis, noterSatis: nSatis, masraf, kar,
      aliciAdi, aliciTc, aliciTel, aliciAdres, odeme_sekli: al('odeme_sekli'), aciklama: al('aciklama'), durum,
      tamamlamaTarihi: yeniSatildi ? new Date() : null,
      stok_tipi: al('stok_tipi') || 'sahip', yil: bosuSifir(al('yil')) || null, saticiAdi, saticiTc,
      kalan_odeme: bosuSifir(al('kalan_odeme')), fatura_kesildi: al('fatura_kesildi') || false, yevmiye_no: al('yevmiye_no') || null,
      eski_kayit: g.eski_kayit !== undefined ? g.eski_kayit : null, satis_tarihi: g.satis_tarihi || null,
      komAdi, komTel, komisyonTutar,
      yatirimciId, yatirimciOran, yatirimciKar, listeFiyati, odemeDetay,
      vitrin_baslik: al('vitrin_baslik') || null, vitrin_aciklama: al('vitrin_aciklama') || null,
      vitrin_segment: al('vitrin_segment') || null, vitrin_cc: bosuSifir(al('vitrin_cc')) || null, vitrin_hasar: al('vitrin_hasar') || null,
    });

    // Motor yeni satıldıysa, bağlı vitrin/site ilanını otomatik yayından kaldır
    if (yeniSatildi) await repo.vitrinIlaniniYayindanKaldir(tx, id);

    // İlan fiyatı değiştiyse bağlı site ilanının fiyatını da güncelle (ilan fiyatı = site fiyatı)
    if (canListe && listeFiyati > 0 && listeFiyati !== sayi(mevcut.liste_fiyati)) await repo.vitrinFiyatiniGuncelle(tx, id, listeFiyati);

    // Müşteri auto-collect (aynı işlemde)
    if (g.satici_adi) await upsertMusteri(g.satici_adi, null, null, tx);
    if (g.alici_adi) await upsertMusteri(g.alici_adi, g.alici_telefon, g.alici_adres, tx);
    if (g.komisyoncu_adi) await upsertMusteri(g.komisyoncu_adi, g.komisyoncu_telefon, null, tx);
    return guncel;
  });
  return sanitizeMotor(satir, kullanici) as MotorSatiri;
};

/** Yalnızca admin siler. Bağlı vitrin ilanı yetim kalmasın: yayından kaldırılır ve bağlantı koparılır (tek işlem). */
export const sil = async (db: BaglamDb, id: number, kullanici: Kullanici) => {
  if (kullanici.rol !== 'admin') throw new YetkiHatasi('Silme yetkiniz yok');
  await db.withTransaction(async (tx) => {
    await repo.vitrinBaglantisiniKopar(tx, id);
    await repo.sil(tx, id);
  });
};
