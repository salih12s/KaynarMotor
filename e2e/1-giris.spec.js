/*
 * Akış 1: Giriş ve rol kısıtı.
 * Sorular: doğru parola içeri alıyor mu? (happy path) · yanlış parola reddediliyor mu? (negative) ·
 * yetkisiz kullanıcı yönetici sayfalarına giremiyor mu? (rol kontrolü gerçekten arayüzde var mı?)
 */
const { test, expect } = require('@playwright/test');
const { adminJetonu, personelOlustur, girisYap, adminGirisi } = require('./yardimci');

test('doğru parola: admin giriş yapar ve uygulamanın içine düşer', async ({ page }) => {
  await adminGirisi(page);
  await expect(page).toHaveURL(/\/servis$/); // admin'in ilk sayfası
  await expect(page.getByRole('heading', { name: 'Servis', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yeni İş Emri' })).toBeVisible();
});

test('yanlış parola: hata mesajı görünür, giriş sayfasında kalır', async ({ page }) => {
  await girisYap(page, 'admin', 'kesinlikle-yanlis-parola');
  await expect(page.getByRole('alert')).toHaveText('Geçersiz kullanıcı adı veya şifre');
  await expect(page).toHaveURL(/\/login$/);
});

test('olmayan kullanıcı: yanlış parolayla AYNI mesaj (hesabın var olup olmadığı sızmaz)', async ({ page }) => {
  await girisYap(page, 'var-olmayan-kullanici', 'herhangi-bir-parola');
  await expect(page.getByRole('alert')).toHaveText('Geçersiz kullanıcı adı veya şifre');
});

test('yetkisiz personel: yetki bekleme ekranını görür, Raporlar ve Servis sayfalarına giremez', async ({ page }) => {
  const personel = await personelOlustur(await adminJetonu());
  await girisYap(page, personel.kullanici_adi, personel.sifre);
  await expect(page.getByText('Hesabınıza henüz bir yetki tanımlanmamış')).toBeVisible();

  for (const yol of ['/raporlar', '/servis']) {
    await page.goto(yol);
    await expect(page).toHaveURL(/localhost:3100\/$/); // ana sayfaya geri yönlendirilir
    await expect(page.getByText('Hesabınıza henüz bir yetki tanımlanmamış')).toBeVisible();
    await expect(page.getByText('Toplam Gelir')).toHaveCount(0);
  }
});
