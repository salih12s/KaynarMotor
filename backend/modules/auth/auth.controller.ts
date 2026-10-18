/* Kimlik doğrulama HTTP katmanı: isteği okur, servisi çağırır, denetim günlüğünü (kim, ne, hangi IP) yazar, yanıtı verir. */
import { ISLEM_TIPLERI, logAktivite } from '../../core/gunluk/activityLogger';
import { pool } from '../../core/veritabani/db';
import { dogrula } from '../../core/dogrulama/dogrula';
import { sarmala } from '../../core/http/kontrolcu';
import {
  girisGovdesi, kullaniciOlusturGovdesi, sifreGovdesi, yetkiGovdesi,
} from './auth.schemas';
import * as servis from './auth.service';
import { GirisHatasi } from './auth.service';

/**
 * Gövde düz bir nesne değilse (boş, dizi, metin) boş nesne sayılır: eskiden alanlar `undefined` okunup "Tüm alanlar
 * zorunludur"/401 verilirdi; sözleşme (durum kodu ve mesaj) aynı kalsın diye şema hatasına çevrilmez.
 */
const govdeyiOku = (req: { body?: unknown }): unknown =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};

export const kayitOl = sarmala('Register hatası:', async (req, res) => {
  const kayit = await servis.kayitOl(pool, dogrula(kullaniciOlusturGovdesi, govdeyiOku(req)));
  await logAktivite({
    kullanici_id: kayit.id, kullanici_adi: kayit.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.REGISTER, islem_detay: `${kayit.ad_soyad} kayıt oldu`, ip_adresi: req.ip,
  });
  res.status(201).json({ message: 'Kayıt başarılı. Admin onayı bekleniyor.', user: kayit });
});

export const giris = sarmala('Login hatası:', async (req, res) => {
  let sonuc;
  try {
    sonuc = await servis.giris(pool, dogrula(girisGovdesi, govdeyiOku(req)));
  } catch (hata) {
    // Başarısız deneme iz bırakır (kullanıcı yoksa kullanıcı id'siz); yanıt iki durumda da aynıdır
    if (hata instanceof GirisHatasi) {
      await logAktivite({
        kullanici_id: hata.kullaniciId, kullanici_adi: hata.kullaniciAdi,
        islem_tipi: ISLEM_TIPLERI.LOGIN_FAILED, islem_detay: hata.detay, ip_adresi: req.ip,
      });
    }
    throw hata;
  }
  await logAktivite({
    kullanici_id: sonuc.user.id, kullanici_adi: sonuc.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.LOGIN, islem_detay: 'Giriş yapıldı', ip_adresi: req.ip,
  });
  res.json(sonuc);
});

export const cikis = sarmala('Logout hatası:', async (req, res) => {
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.LOGOUT, islem_detay: 'Çıkış yapıldı', ip_adresi: req.ip,
  });
  res.json({ message: 'Çıkış başarılı' });
});

export const oturumDogrula = sarmala('Oturum doğrulama hatası:', async (req, res) => {
  res.json(await servis.oturumDogrula(pool, req.user));
});

export const personelListesi = sarmala('Personel listesi hatası:', async (_req, res) => {
  res.json(await servis.personelListesi(pool));
});

export const kullanicilar = sarmala('Kullanıcı listesi hatası:', async (_req, res) => {
  res.json(await servis.kullanicilar(pool));
});

export const onayla = sarmala('Kullanıcı onay hatası:', async (req, res) => {
  const id = Number(req.params.id);
  await servis.onayla(pool, id);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.APPROVE,
    islem_detay: `Kullanıcı #${id} onaylandı`, hedef_tablo: 'kullanicilar', hedef_id: id,
  });
  res.json({ message: 'Kullanıcı onaylandı' });
});

export const reddet = sarmala('Kullanıcı red hatası:', async (req, res) => {
  const id = Number(req.params.id);
  await servis.reddet(pool, id);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.REJECT,
    islem_detay: `Kullanıcı #${id} reddedildi`, hedef_tablo: 'kullanicilar', hedef_id: id,
  });
  res.json({ message: 'Kullanıcı reddedildi' });
});

export const kullaniciSil = sarmala('Kullanıcı silme hatası:', async (req, res) => {
  await servis.kullaniciSil(pool, Number(req.params.id), req.user);
  res.json({ message: 'Kullanıcı silindi' });
});

export const kullaniciOlustur = sarmala('Kullanıcı oluşturma hatası:', async (req, res) => {
  const kayit = await servis.kullaniciOlustur(pool, dogrula(kullaniciOlusturGovdesi, govdeyiOku(req)));
  const etiket = ({ yatirimci: 'Yatırımcı', muhasebeci: 'Muhasebeci' } as Record<string, string>)[kayit.rol] || 'Kullanıcı';
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.REGISTER,
    islem_detay: `${etiket} oluşturuldu: ${kayit.ad_soyad}`, hedef_tablo: 'kullanicilar', hedef_id: kayit.id,
  });
  res.status(201).json(kayit);
});

export const sifreSifirla = sarmala('Şifre sıfırlama hatası:', async (req, res) => {
  const id = Number(req.params.id);
  await servis.sifreSifirla(pool, id, dogrula(sifreGovdesi, govdeyiOku(req)));
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.UPDATE,
    islem_detay: `Kullanıcı #${id} şifresi sıfırlandı`, hedef_tablo: 'kullanicilar', hedef_id: id,
  });
  res.json({ message: 'Şifre güncellendi' });
});

export const yatirimcilar = sarmala('Yatırımcı listesi hatası:', async (_req, res) => {
  res.json(await servis.yatirimcilar(pool));
});

export const yetkileriGuncelle = sarmala('Yetki güncelleme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  await servis.yetkileriGuncelle(pool, id, dogrula(yetkiGovdesi, govdeyiOku(req)));
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.APPROVE,
    islem_detay: `Kullanıcı #${id} yetkileri güncellendi`, hedef_tablo: 'kullanicilar', hedef_id: id,
  });
  res.json({ message: 'Yetkiler güncellendi' });
});

export const sonAktiviteler = sarmala('Aktivite listesi hatası:', async (_req, res) => {
  res.json(await servis.sonAktiviteler(pool));
});

export const kullaniciAktiviteleri = sarmala('Kullanıcı aktivite hatası:', async (req, res) => {
  res.json(await servis.kullaniciAktiviteleri(pool, Number(req.params.id)));
});
