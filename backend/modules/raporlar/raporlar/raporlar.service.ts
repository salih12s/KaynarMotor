/*
 * Rapor iş kuralları: hangi kayıtların rapora gireceği (repository) ve toplamlar (raporlar.hesap.ts) bir araya gelir.
 * HTTP bilmez (express yok). Kâr alanlarının admin dışındakilerden gizlenmesi server.js'teki kariGizle ara katmanındadır.
 */
import { GecersizIstek, YetkiHatasi } from '../../../core/dogrulama/dogrula';
import type { Kullanici, Veritabani } from '../../../core/tipler';
import { parcalariEkle } from '../../../shared/altKayitlar';
import { aralikHesapla, genelHesapla, gunlukHesapla, yatirimciRaporuHesapla } from './raporlar.hesap';
import * as repo from './raporlar.repository';
import type { AralikSorgusu, FisKarSorgusu, GunlukSorgusu, YatirimciOzetSorgusu, YatirimciRaporSorgusu } from './raporlar.schemas';

/** Bugünün UTC tarihi (YYYY-AA-GG). Test için saat dışarıdan verilebilir. */
const bugunUtc = (simdi: Date): string => simdi.toISOString().split('T')[0];

/** Günlük rapor: o gün tamamlanan iş emri, aksesuar, motor satışı ve o güne ait e-ticaret satışları. */
export const gunluk = async (db: Veritabani, sorgu: GunlukSorgusu, simdi: Date = new Date()) => {
  const hedefTarih = sorgu.tarih || bugunUtc(simdi);
  return gunlukHesapla(hedefTarih, {
    isEmirleri: await repo.gunlukIsEmirleri(db, hedefTarih),
    aksesuarlar: await repo.gunlukAksesuarlar(db, hedefTarih),
    motorlar: await repo.gunlukMotorlar(db, hedefTarih),
    eticaret: await repo.gunlukEticaret(db, hedefTarih),
  });
};

/** Tarih aralığı raporu (parçalar iş emri/aksesuar kayıtlarına eklenir, stok değeri ve yedek parça dahil). */
export const aralik = async (db: Veritabani, sorgu: AralikSorgusu) => {
  const { baslangic, bitis } = sorgu;
  if (!baslangic || !bitis) throw new GecersizIstek('Başlangıç ve bitiş tarihi gerekli');

  const isEmirleri = await parcalariEkle(db, await repo.aralikIsEmirleri(db, baslangic, bitis), 'parcalar', 'is_emri_id',
    ['takilan_parca', 'adet', 'birim_fiyat', 'toplam_fiyat', 'maliyet'], ['birim_fiyat', 'toplam_fiyat', 'maliyet']);
  const aksesuarlar = await parcalariEkle(db, await repo.aralikAksesuarlar(db, baslangic, bitis), 'aksesuar_parcalar', 'aksesuar_id',
    ['urun_adi', 'adet', 'maliyet', 'satis_fiyati'], ['maliyet', 'satis_fiyati']);
  const motorlar = await repo.aralikMotorlar(db, baslangic, bitis);
  const eticaret = await repo.aralikEticaret(db, baslangic, bitis);
  const yedekParcalar = await repo.aralikYedekParcalar(db, baslangic, bitis);
  const stok = await repo.motorStokToplami(db);

  return aralikHesapla(baslangic, bitis, {
    isEmirleri, aksesuarlar, motorlar, eticaret, yedekParcalar,
    motorStokToplam: parseFloat(stok.toplam_alis || 0),
  });
};

/** Genel (tüm zamanlar) özet. */
export const genel = async (db: Veritabani) =>
  genelHesapla({
    isEmirleri: await repo.genelIsEmirleri(db),
    aksesuarlar: await repo.genelAksesuarlar(db),
    motorlar: await repo.genelMotorlar(db),
    eticaret: await repo.genelEticaret(db),
    yedekParcalar: await repo.genelYedekParcalar(db),
  });

export const fisKar = (db: Veritabani, sorgu: FisKarSorgusu) => repo.fisKar(db, sorgu.baslangic, sorgu.bitis);

export const personeller = (db: Veritabani) => repo.personeller(db);

/**
 * Yatırımcının kendi stok/satış/kâr raporu. Yatırımcı yalnızca KENDİ verisini görür; admin `yatirimci_id` ile herhangi
 * birini görebilir; diğer roller göremez.
 */
export const yatirimciRaporu = async (db: Veritabani, kullanici: Kullanici, sorgu: YatirimciRaporSorgusu) => {
  let yatirimciId: number | null;
  if (kullanici.rol === 'yatirimci') {
    yatirimciId = kullanici.id;
  } else if (kullanici.rol === 'admin') {
    yatirimciId = sorgu.yatirimci_id ? parseInt(sorgu.yatirimci_id) : null;
    if (!yatirimciId) throw new GecersizIstek('yatirimci_id gerekli');
  } else {
    throw new YetkiHatasi('Yetkiniz yok');
  }
  const stoktakiler = await repo.yatirimciStoktakiler(db, yatirimciId);
  const satilanlar = await repo.yatirimciSatilanlar(db, yatirimciId, sorgu.baslangic, sorgu.bitis);
  return yatirimciRaporuHesapla(stoktakiler, satilanlar);
};

export const yatirimciOzet = (db: Veritabani, sorgu: YatirimciOzetSorgusu) => repo.yatirimciOzetleri(db, sorgu.baslangic, sorgu.bitis);
