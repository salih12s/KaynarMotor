/*
 * E2E yardımcıları.
 *
 * "Kurulum" (arrange) adımları arayüzden değil API'den yapılır: hızlıdır ve asıl sınanan akıştan bağımsızdır
 * (örn. satış testi için stoktaki motoru API ile ekleriz; arayüzde yalnızca SATIŞ sınanır).
 * Her test kendi verisini benzersiz bir sonekle kurar: sıra değişse ya da tekrar koşsa sonuç değişmez (isolation).
 */
const API = process.env.E2E_API;

const benzersiz = (onek) => `${onek}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

const istek = async (yontem, yol, govde, token) => {
  const yanit = await fetch(`${API}${yol}`, {
    method: yontem,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: govde ? JSON.stringify(govde) : undefined,
  });
  const metin = await yanit.text();
  let veri = null;
  try {
    veri = metin ? JSON.parse(metin) : null;
  } catch {
    veri = metin;
  }
  return { durum: yanit.status, veri };
};

// Benzersiz plaka (tabloda olduğu gibi, boşluksuz yazılır): "34TST1234"
const plakaUret = () => `34TST${Math.floor(1000 + Math.random() * 9000)}`;

// Test veritabanındaki admin ile oturum açar, jeton döner
const adminJetonu = async () => {
  const r = await istek('POST', '/auth/login', { kullanici_adi: 'admin', sifre: process.env.E2E_ADMIN_SIFRE });
  if (r.durum !== 200) throw new Error(`Admin girişi başarısız (${r.durum}): test veritabanında admin hesabı ve ADMIN_INITIAL_PASSWORD uyumlu mu?`);
  return r.veri.token;
};

// Yetkisiz bir personel hesabı açar (rol kısıtı testi için); kullanıcı adı ve parolayı döner
const personelOlustur = async (adminToken) => {
  const kullanici_adi = benzersiz('e2e_p_').toLowerCase();
  const sifre = `E2e-${Math.random().toString(36).slice(2, 10)}-1`;
  const r = await istek('POST', '/auth/users', { kullanici_adi, sifre, ad_soyad: 'E2E Personel', rol: 'personel' }, adminToken);
  if (r.durum !== 201) throw new Error(`Personel oluşturulamadı (${r.durum})`);
  return { kullanici_adi, sifre };
};

// Stokta bir motor ekler (satış testinin başlangıç verisi)
const stokMotoruEkle = async (adminToken, plaka) => {
  const r = await istek(
    'POST',
    '/ikinci-el-motor',
    { plaka, marka: 'Honda', model: 'PCX', yil: 2021, km: 12000, alis_fiyati: 100000, durum: 'stokta' },
    adminToken,
  );
  if (r.durum !== 201) throw new Error(`Stok motoru eklenemedi (${r.durum}): ${JSON.stringify(r.veri)}`);
  return r.veri;
};

const motorGetir = async (adminToken, id) => (await istek('GET', `/ikinci-el-motor/${id}`, undefined, adminToken)).veri;

// Arayüzden giriş (login formu). Başarılıysa ana sayfaya yönlenir.
const girisYap = async (page, kullaniciAdi, sifre) => {
  await page.goto('/login');
  await page.getByLabel('Kullanıcı Adı').fill(kullaniciAdi);
  await page.getByLabel('Şifre').fill(sifre);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
};

// Girişin BİTMESİNİ bekler (admin servis sayfasına yönlenir): ardından hemen başka sayfaya gidilirse giriş yarıda kalırdı
const adminGirisi = async (page) => {
  await girisYap(page, 'admin', process.env.E2E_ADMIN_SIFRE);
  await page.waitForURL(/\/servis$/);
};

module.exports = { plakaUret, benzersiz, istek, adminJetonu, personelOlustur, stokMotoruEkle, motorGetir, girisYap, adminGirisi };
