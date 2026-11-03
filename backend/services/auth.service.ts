/*
 * Kimlik doğrulama ve kullanıcı yönetimi iş kuralları. HTTP bilmez (express yok): hataları IstemciHatasi sınıflarıyla
 * bildirir. Denetim günlüğü (kim ne yaptı, IP) HTTP katmanında, controller'da yazılır.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { kullaniciOnbellegiTemizle, sifreParmagi } from '../middleware/auth';
import { degisiklikOzeti } from '../lib/degisiklik';
import { BulunamadiHatasi, GecersizIstek, IstemciHatasi, sifreSorunu } from '../lib/dogrulama/dogrula';
import { isUniqueViolation } from '../database/db';
import type { BaglamDb, Kullanici, Veritabani } from '../lib/tipler';
import type { GirisGovdesi, KullaniciOlusturGovdesi, SifreGovdesi, YetkiGovdesi } from '../schemas/auth.schemas';
import { YETKI_ALANLARI } from '../schemas/auth.schemas';
import * as repo from '../repositories/auth.repository';

// Kullanıcı yokken de bcrypt çalıştırmak için (yanıt süresinden kullanıcı adı sızmasın)
const SAHTE_OZET = bcrypt.hashSync('sahte-sifre-zaman-esitleme', 10);

const GECERSIZ_GIRIS = 'Geçersiz kullanıcı adı veya şifre';

/**
 * Başarısız giriş denemesi (401). Controller bunu yakalayıp LOGIN_FAILED günlüğü yazar; yanıt mesajı kullanıcının var
 * olup olmadığını sızdırmaz (her iki durumda aynı).
 */
export class GirisHatasi extends IstemciHatasi {
  kullaniciId: number | undefined;
  kullaniciAdi: string;
  detay: string;
  constructor(kullaniciId: number | undefined, kullaniciAdi: string, detay: string) {
    super(GECERSIZ_GIRIS, 401);
    this.name = 'GirisHatasi';
    this.kullaniciId = kullaniciId;
    this.kullaniciAdi = kullaniciAdi;
    this.detay = detay;
  }
}

const metinMi = (v: unknown): v is string => typeof v === 'string';

const KULLANICI_ADI_ALINMIS = 'Bu kullanıcı adı zaten kullanılıyor';

/**
 * "Ad var mı?" kontrolü ile INSERT arasında aynı adla ikinci bir istek araya girebilir (kontrol-sonra-yaz yarışı); UNIQUE kısıt
 * veriyi korur ama veritabanı hatası 500 olarak sızardı. Ön kontrolle aynı 400 yanıtına çevrilir; başka hatalar olduğu gibi iletilir.
 */
const kullaniciAdiCakismasiniCevir = (hata: unknown): never => {
  if (isUniqueViolation(hata)) throw new GecersizIstek(KULLANICI_ADI_ALINMIS);
  throw hata;
};

/** Kullanıcı adı ve ad soyad dolu metin mi? (nesne/dizi/boşluk reddedilir) */
const adlarGecerli = (kullaniciAdi: unknown, adSoyad: unknown): boolean =>
  metinMi(kullaniciAdi) && metinMi(adSoyad) && kullaniciAdi.trim() !== '' && adSoyad.trim() !== '';

// ---------------------------------------------------------------------------------------------------------------
// Giriş / kayıt / oturum
// ---------------------------------------------------------------------------------------------------------------

/** Herkese açık kayıt: hesap admin onayı bekler. */
export const kayitOl = async (db: Veritabani, govde: KullaniciOlusturGovdesi) => {
  const { kullanici_adi, sifre, ad_soyad } = govde;
  if (!adlarGecerli(kullanici_adi, ad_soyad) || !sifre) throw new GecersizIstek('Tüm alanlar zorunludur');
  const sifreHatasi = sifreSorunu(sifre);
  if (sifreHatasi) throw new GecersizIstek(sifreHatasi);

  if (await repo.kullaniciAdiVarMi(db, kullanici_adi as string)) throw new GecersizIstek(KULLANICI_ADI_ALINMIS);

  const ozet = await bcrypt.hash(sifre as string, 10);
  try {
    return await repo.kayitEkle(db, kullanici_adi as string, ozet, ad_soyad as string);
  } catch (hata) {
    return kullaniciAdiCakismasiniCevir(hata);
  }
};

/**
 * Giriş. Şifre HER ZAMAN doğrulanır (kullanıcı yoksa sahte özetle): yanıt ve süre, kullanıcı adının var olup olmadığını
 * ve hesabın onay durumunu şifreyi bilmeyen birine sızdırmaz. "Henüz onaylanmadı" yalnızca DOĞRU şifre için gösterilir.
 * Token yalnızca kimliği taşır; rol ve yetkiler her istekte veritabanından okunur (core/middleware/auth).
 */
export const giris = async (db: Veritabani, govde: GirisGovdesi) => {
  const { kullanici_adi, sifre } = govde;
  // Tür denetimi: { $ne: 1 } gibi nesne/dizi gönderilirse sorguya ve bcrypt'e hiç girmez (eskiden 500 veriyordu)
  if (!metinMi(kullanici_adi) || !metinMi(sifre)) throw new IstemciHatasi(GECERSIZ_GIRIS, 401);

  const kullanici = await repo.kullaniciAdinaGoreBul(db, kullanici_adi);
  const gecerli = await bcrypt.compare(sifre, kullanici ? kullanici.sifre : SAHTE_OZET);
  if (!kullanici || !gecerli) {
    throw new GirisHatasi(kullanici ? kullanici.id : undefined, kullanici_adi, kullanici ? 'Yanlış şifre' : 'Kullanıcı bulunamadı');
  }
  if (kullanici.onay_durumu !== 'onaylandi') throw new IstemciHatasi('Hesabınız henüz onaylanmadı', 403);

  // sv: şifre parmak izi; şifre sıfırlanınca bu token geçersiz olur (core/middleware/auth)
  const token = jwt.sign({ id: kullanici.id, kullanici_adi: kullanici.kullanici_adi, sv: sifreParmagi(kullanici.sifre) }, process.env.JWT_SECRET as string, {
    expiresIn: '24h',
    algorithm: 'HS256',
  });

  return {
    token,
    user: {
      id: kullanici.id,
      kullanici_adi: kullanici.kullanici_adi,
      ad_soyad: kullanici.ad_soyad,
      rol: kullanici.rol,
      aksesuar_yetkisi: kullanici.aksesuar_yetkisi,
      motor_satis_yetkisi: kullanici.motor_satis_yetkisi,
      eticaret_yetkisi: kullanici.eticaret_yetkisi,
      servis_yetkisi: kullanici.servis_yetkisi,
      aksesuar_stok_yetkisi: kullanici.aksesuar_stok_yetkisi,
      yedek_parca_yetkisi: kullanici.yedek_parca_yetkisi,
      motor_vitrin_yetkisi: kullanici.motor_vitrin_yetkisi,
      aksesuar_vitrin_yetkisi: kullanici.aksesuar_vitrin_yetkisi,
      liste_fiyati_gor: kullanici.liste_fiyati_gor,
      alis_fiyati_gor: kullanici.alis_fiyati_gor,
      satis_fiyati_gor: kullanici.satis_fiyati_gor,
      kar_gor: kullanici.kar_gor,
      musteri_gor: kullanici.musteri_gor,
      satis_gecmisi_gor: kullanici.satis_gecmisi_gor,
      motor_satis_gor: kullanici.motor_satis_gor,
    },
  };
};

/** Güncel oturum bilgisi (rol ve yetkiler veritabanından taze okunur). */
export const oturumDogrula = async (db: Veritabani, kullanici: Kullanici) => {
  const satir = await repo.oturumBilgisi(db, kullanici.id);
  if (!satir) throw new BulunamadiHatasi('Kullanıcı bulunamadı');
  return { user: satir };
};

export const personelListesi = (db: Veritabani) => repo.personelListesi(db);

// ---------------------------------------------------------------------------------------------------------------
// Kullanıcı yönetimi (yalnızca admin; kural routes'taki isAdmin kapısında)
// ---------------------------------------------------------------------------------------------------------------

export const kullanicilar = (db: Veritabani) => repo.kullanicilar(db);

export const onayla = async (db: Veritabani, id: number) => {
  if ((await repo.rolBul(db, id)) === null) throw new BulunamadiHatasi('Kullanıcı bulunamadı');
  await repo.onayDurumuAyarla(db, id, 'onaylandi');
  kullaniciOnbellegiTemizle(id);
};

/** Reddedilen kullanıcının açık oturumu hemen geçersiz olur (önbellek temizlenir). Admin hesabı reddedilemez (girişi kapanırdı). */
export const reddet = async (db: Veritabani, id: number) => {
  const rol = await repo.rolBul(db, id);
  if (rol === null) throw new BulunamadiHatasi('Kullanıcı bulunamadı');
  if (rol === 'admin') throw new GecersizIstek('Admin hesabı reddedilemez');
  await repo.onayDurumuAyarla(db, id, 'reddedildi');
  kullaniciOnbellegiTemizle(id);
};

/**
 * Kullanıcıyı siler (kendini ve admin hesaplarını silemez: arayüzdeki kuralın sunucudaki karşılığı). Oluşturduğu iş emirleri
 * KORUNUR: yalnızca bağlantı boşaltılır (eskiden FK yüzünden "Sunucu hatası" veriyor ve kullanıcı silinemiyordu).
 * Silinen kullanıcının token'ı hemen geçersiz olur.
 */
export const kullaniciSil = async (db: BaglamDb, id: number, silen: Kullanici, iz?: { hedef?: string }) => {
  if (id === silen.id) throw new GecersizIstek('Kendinizi silemezsiniz');
  const rol = await repo.rolBul(db, id);
  if (rol === null) throw new BulunamadiHatasi('Kullanıcı bulunamadı');
  if (rol === 'admin') throw new GecersizIstek('Admin hesabı silinemez');
  if (iz) iz.hedef = (await repo.kullaniciAdiBul(db, id)) ?? undefined; // silmeden ÖNCE: günlükte "kim silindi" için
  await db.withTransaction(async (tx) => {
    await repo.isEmirleriBaginiKopar(tx, id);
    await repo.kullaniciSil(tx, id);
  });
  kullaniciOnbellegiTemizle(id);
};

const GECERLI_ROLLER = ['personel', 'yatirimci', 'muhasebeci'];

/**
 * Admin kullanıcı/yatırımcı/muhasebeci oluşturur (hesap hemen onaylı). Rol verilmezse "personel"; bilinmeyen rol (admin dahil:
 * API ile admin oluşturulamaz) sessizce başka role çevrilmez, açıkça reddedilir.
 */
export const kullaniciOlustur = async (db: Veritabani, govde: KullaniciOlusturGovdesi) => {
  const { kullanici_adi, sifre, ad_soyad, rol } = govde;
  if (!adlarGecerli(kullanici_adi, ad_soyad) || !sifre) throw new GecersizIstek('Kullanıcı adı, şifre ve ad soyad zorunludur');
  const sifreHatasi = sifreSorunu(sifre);
  if (sifreHatasi) throw new GecersizIstek(sifreHatasi);
  const yeniRol = rol === undefined || rol === null ? 'personel' : (rol as string);
  if (!GECERLI_ROLLER.includes(yeniRol)) throw new GecersizIstek('Geçersiz rol');

  if (await repo.kullaniciAdiVarMi(db, kullanici_adi as string)) throw new GecersizIstek(KULLANICI_ADI_ALINMIS);

  const ozet = await bcrypt.hash(sifre as string, 10);
  try {
    return await repo.adminKullaniciEkle(db, kullanici_adi as string, ozet, ad_soyad as string, yeniRol);
  } catch (hata) {
    return kullaniciAdiCakismasiniCevir(hata);
  }
};

/**
 * Şifre sıfırlar. Şifreler artık düz metin SAKLANMAZ ve gösterilemez; unutan kullanıcıya yönetici yeni bir şifre belirler.
 * Eski token'lar (şifre parmak izi eski) bir sonraki istekte düşer.
 */
export const sifreSifirla = async (db: Veritabani, id: number, govde: SifreGovdesi) => {
  const sorun = sifreSorunu(govde.sifre);
  if (sorun) throw new GecersizIstek(sorun);
  const ozet = await bcrypt.hash(govde.sifre as string, 10);
  if ((await repo.sifreGuncelle(db, id, ozet)) === 0) throw new BulunamadiHatasi('Kullanıcı bulunamadı');
  kullaniciOnbellegiTemizle(id);
};

export const yatirimcilar = (db: Veritabani) => repo.onayliYatirimcilar(db);

const BOOLEAN_METINLERI = new Map<string, boolean>([
  ['true', true],
  ['false', false],
  ['1', true],
  ['0', false],
]);

/**
 * Yetki bayrağı değeri: true/false, 1/0 ya da "true"/"false"/"1"/"0" metni. Eskiden `!!değer` kullanılıyordu: "false" metni doğru
 * sayılıp yetki VERİYORDU. Anlaşılmayan değer sessizce true/false olmaz, 400 döner.
 */
const yetkiDegeri = (alan: string, deger: unknown): boolean => {
  if (typeof deger === 'boolean') return deger;
  if (deger === 1 || deger === 0) return deger === 1;
  if (typeof deger === 'string' && BOOLEAN_METINLERI.has(deger)) return BOOLEAN_METINLERI.get(deger) as boolean;
  throw new GecersizIstek(`${alan} true ya da false olmalı`);
};

/** Alan bazlı yetki bayraklarını günceller; yalnızca bilinen alanlar işlenir, değerler açıkça boolean'a çevrilir. Etki anında. */
export const yetkileriGuncelle = async (db: Veritabani, id: number, govde: YetkiGovdesi, iz?: { degisiklik?: string; hedef?: string }) => {
  const alanlar: Array<[string, boolean]> = [];
  for (const alan of YETKI_ALANLARI) {
    if (alan in govde) alanlar.push([alan, yetkiDegeri(alan, (govde as Record<string, unknown>)[alan])]);
  }
  if (alanlar.length === 0) throw new GecersizIstek('Güncellenecek geçerli alan yok');
  // Denetim izi: `iz` verilirse (controller) güncellemeden ÖNCE eski değerler okunur; verilmezse ek sorgu yoktur
  const eski = iz ? await repo.yetkileriOku(db, id, alanlar.map(([kolon]) => kolon)) : undefined;
  if ((await repo.yetkiGuncelle(db, id, alanlar)) === 0) throw new BulunamadiHatasi('Kullanıcı bulunamadı');
  if (iz && eski) {
    iz.hedef = String(eski.kullanici_adi ?? '');
    iz.degisiklik = degisiklikOzeti(eski, Object.fromEntries(alanlar), alanlar.map(([kolon]) => kolon));
  }
  kullaniciOnbellegiTemizle(id); // yetki değişikliği (alma ve verme) anında uygulanır
};

export const sonAktiviteler = (db: Veritabani) => repo.sonAktiviteler(db);

export const kullaniciAktiviteleri = (db: Veritabani, kullaniciId: number) => repo.kullaniciAktiviteleri(db, kullaniciId);
