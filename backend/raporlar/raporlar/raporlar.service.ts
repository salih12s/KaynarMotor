/*
 * Rapor iş kuralları: hangi kayıtların rapora gireceği (repository) ve toplamlar (raporlar.hesap.ts) bir araya gelir.
 * HTTP bilmez (express yok). Kâr alanlarının admin dışındakilerden gizlenmesi server.js'teki kariGizle ara katmanındadır.
 */
import { GecersizIstek, YetkiHatasi } from '../../platform/lib/dogrulama/dogrula';
import type { Kullanici, Veritabani } from '../../platform/lib/tipler';
import { parcalariEkle } from '../../platform/lib/altKayitlar';
import { TR_SAAT_FARKI } from '../../platform/database/sqlText';
import { aralikHesapla, genelHesapla, gunlukHesapla, yatirimciRaporuHesapla } from './raporlar.hesap';
import * as repo from './raporlar.repository';
import type { AralikSorgusu, FisKarSorgusu, GunlukSorgusu, YatirimciOzetSorgusu, YatirimciRaporSorgusu } from './raporlar.schemas';

/** Bugünün TÜRKİYE tarihi (YYYY-AA-GG; sabit UTC+3). Test için saat dışarıdan verilebilir. */
const bugunTr = (simdi: Date): string => new Date(simdi.getTime() + TR_SAAT_FARKI * 3_600_000).toISOString().split('T')[0];

const TARIH_BICIMI = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * YYYY-AA-GG biçiminde GERÇEK bir takvim günü mü? `Date.parse('2026-02-31')` hata vermez, 3 Mart'a kayar; bu yüzden gün/ay/yıl
 * geri karşılaştırılır (artık yıl dahil doğru çalışır).
 */
const gecerliTarihMi = (deger: unknown): boolean => {
  if (typeof deger !== 'string') return false;
  const m = TARIH_BICIMI.exec(deger);
  if (!m) return false;
  const [y, a, g] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(y, a - 1, g));
  return d.getUTCFullYear() === y && d.getUTCMonth() === a - 1 && d.getUTCDate() === g;
};

/** Verilmişse (boş değilse) tarih geçerli olmalı; hata mesajı alan adını söyler. Boş/yok: çağıranın kuralı (varsayılan ya da "gerekli"). */
const tarihKontrol = (alan: string, deger: unknown) => {
  if (deger === undefined || deger === null || deger === '') return;
  if (!gecerliTarihMi(deger)) throw new GecersizIstek(`${alan} geçerli bir tarih olmalı (YYYY-AA-GG)`);
};

/** İsteğe bağlı başlangıç/bitiş çifti: biçim ve sıra. Önceden bozuk tarih sessizce boş rapor döndürüyordu (hata mı "kayıt yok" mu belli değildi). */
const aralikKontrol = (baslangic: unknown, bitis: unknown) => {
  tarihKontrol('baslangic', baslangic);
  tarihKontrol('bitis', bitis);
  if (typeof baslangic === 'string' && typeof bitis === 'string' && baslangic && bitis && baslangic > bitis) {
    throw new GecersizIstek('Başlangıç tarihi bitiş tarihinden sonra olamaz');
  }
};

/** Günlük rapor: o gün tamamlanan iş emri, aksesuar, motor satışı ve o güne ait e-ticaret satışları. */
export const gunluk = async (db: Veritabani, sorgu: GunlukSorgusu, simdi: Date = new Date()) => {
  tarihKontrol('tarih', sorgu.tarih);
  const hedefTarih = sorgu.tarih || bugunTr(simdi);
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
  aralikKontrol(baslangic, bitis);

  const isEmirleri = await parcalariEkle(
    db,
    await repo.aralikIsEmirleri(db, baslangic, bitis),
    'parcalar',
    'is_emri_id',
    ['takilan_parca', 'adet', 'birim_fiyat', 'toplam_fiyat', 'maliyet'],
    ['birim_fiyat', 'toplam_fiyat', 'maliyet'],
  );
  const aksesuarlar = await parcalariEkle(
    db,
    await repo.aralikAksesuarlar(db, baslangic, bitis),
    'aksesuar_parcalar',
    'aksesuar_id',
    ['urun_adi', 'adet', 'maliyet', 'satis_fiyati'],
    ['maliyet', 'satis_fiyati'],
  );
  const motorlar = await repo.aralikMotorlar(db, baslangic, bitis);
  const eticaret = await repo.aralikEticaret(db, baslangic, bitis);
  const yedekParcalar = await repo.aralikYedekParcalar(db, baslangic, bitis);
  const stok = await repo.motorStokToplami(db);

  return aralikHesapla(baslangic, bitis, {
    isEmirleri,
    aksesuarlar,
    motorlar,
    eticaret,
    yedekParcalar,
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

export const fisKar = async (db: Veritabani, sorgu: FisKarSorgusu) => {
  aralikKontrol(sorgu.baslangic, sorgu.bitis);
  return repo.fisKar(db, sorgu.baslangic, sorgu.bitis);
};

export const personeller = (db: Veritabani) => repo.personeller(db);

/**
 * Yatırımcının kendi stok/satış/kâr raporu. Yatırımcı yalnızca KENDİ verisini görür; admin `yatirimci_id` ile herhangi
 * birini görebilir; diğer roller göremez.
 */
export const yatirimciRaporu = async (db: Veritabani, kullanici: Kullanici, sorgu: YatirimciRaporSorgusu) => {
  aralikKontrol(sorgu.baslangic, sorgu.bitis);
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

export const yatirimciOzet = async (db: Veritabani, sorgu: YatirimciOzetSorgusu) => {
  aralikKontrol(sorgu.baslangic, sorgu.bitis);
  return repo.yatirimciOzetleri(db, sorgu.baslangic, sorgu.bitis);
};
