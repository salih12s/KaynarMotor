/*
 * Akış 3: Stoktaki motoru sat.
 * Kurulum API'den (stokta bir motor), asıl sınanan arayüz: plakayı öneri listesinden seç → form dolsun → fiyat ve alıcıyı gir → kaydet.
 * Sorular: satış listede görünüyor mu? Veritabanında motor "tamamlandi" olup fiyatı doğru kaydedildi mi? (Para söz konusu:
 * ekranda görünenle sunucuda saklanan aynı mı diye iki taraftan da bakılır.)
 */
const { test, expect } = require('@playwright/test');
const { plakaUret, benzersiz, adminJetonu, stokMotoruEkle, motorGetir, adminGirisi } = require('./yardimci');

// Satış penceresini açar ve plakayı öneri listesinden seçer. `yazilan`: plakadan klavyeyle girilen kısım.
const plakayiSec = async (page, plaka, yazilan) => {
  await page.getByRole('button', { name: 'Motor Satış' }).click();
  const pencere = page.getByRole('dialog');
  await expect(pencere).toBeVisible();
  await pencere.getByLabel('Plaka').fill(yazilan);
  await page.getByRole('option', { name: plaka }).click();
  return pencere;
};

test('stoktaki motor satılır: satış listesinde görünür ve veritabanında tamamlandı olarak saklanır', async ({ page }) => {
  const plaka = plakaUret();
  const alici = `E2E Alıcı ${benzersiz('A')}`;
  const jeton = await adminJetonu();
  const motor = await stokMotoruEkle(jeton, plaka);

  await adminGirisi(page);
  await page.goto('/ikinci-el-motor');
  await expect(page.getByRole('button', { name: 'Motor Satış' })).toBeVisible(); // sayfa yüklendi

  // --- Satış penceresi: stoktaki plakayı seç, form kendiliğinden dolsun ---
  const pencere = await plakayiSec(page, plaka, plaka.slice(0, 5));
  await expect(pencere.getByLabel('Marka')).toHaveValue('Honda');
  await expect(pencere.getByLabel('Model')).toHaveValue('PCX');
  await expect(pencere.getByLabel('Alış Fiyatı (₺)')).toHaveValue('100000.00');

  // --- Satış bilgileri ---
  await pencere.getByLabel('Satış Fiyatı (₺)').fill('135000');
  await pencere.getByLabel('Ad Soyad', { exact: true }).fill(alici);
  await pencere.getByRole('button', { name: 'Kaydet' }).click();

  // --- Ekranda ---
  await expect(pencere).toBeHidden();
  const satir = page.getByRole('row').filter({ hasText: plaka });
  await expect(satir).toBeVisible();
  await expect(satir).toContainText('Honda');
  await expect(satir).toContainText(alici);
  await expect(satir).toContainText('135.000');

  // --- Sunucuda ---
  const kayit = await motorGetir(jeton, motor.id);
  expect(kayit.durum).toBe('tamamlandi');
  expect(Number(kayit.satis_fiyati)).toBe(135000);
  expect(Number(kayit.alis_fiyati)).toBe(100000); // satışta alış fiyatı bozulmadı
});

test('satıştan sonra Motor Stok: motor "Stokta" çipinden çıkar, "Satılan" çipine geçer (iki ekran tutarlı)', async ({ page }) => {
  const plaka = plakaUret();
  const jeton = await adminJetonu();
  const motor = await stokMotoruEkle(jeton, plaka);
  const stoktaCipi = () => page.getByText(/^Stokta: \d+$/);
  const satilanCipi = () => page.getByText(/^Satılan: \d+$/);
  const satir = () => page.getByRole('row').filter({ hasText: plaka });

  await adminGirisi(page);
  await page.goto('/motor-stok');
  await stoktaCipi().click();
  await expect(satir()).toBeVisible(); // satıştan önce stokta

  await page.goto('/ikinci-el-motor');
  const pencere = await plakayiSec(page, plaka, plaka.slice(0, 5));
  await pencere.getByLabel('Satış Fiyatı (₺)').fill('120000');
  await pencere.getByRole('button', { name: 'Kaydet' }).click();
  await expect(pencere).toBeHidden();

  await page.goto('/motor-stok');
  await stoktaCipi().click();
  await expect(satir()).toHaveCount(0); // artık stokta değil
  await satilanCipi().click();
  await expect(satir()).toBeVisible(); // satılanlar arasında
  expect((await motorGetir(jeton, motor.id)).durum).toBe('tamamlandi');
});

// BİLİNEN HATA (test.fail = "bu testin başarısız olması beklenir"): plaka TAM yazılıp öneriye tıklanırsa form dolmuyor.
// Neden: Plaka alanı yazılan metni `value` olarak tutuyor; MUI Autocomplete, seçilen öneri mevcut değere eşitse onChange'i çağırmaz,
// bu yüzden stok kaydının bilgileri (marka, model, fiyat...) forma taşınmaz. Düzeltilince bu test "beklenmedik şekilde geçti"
// diye uyarır; o zaman `test.fail` satırı `test` yapılmalı.
test.fail('BİLİNEN HATA: plaka tam yazılıp öneri seçilince marka/model/alış fiyatı forma dolmalı', async ({ page }) => {
  const plaka = plakaUret();
  await stokMotoruEkle(await adminJetonu(), plaka);
  await adminGirisi(page);
  await page.goto('/ikinci-el-motor');
  const pencere = await plakayiSec(page, plaka, plaka); // plakanın TAMAMI yazılır
  await expect(pencere.getByLabel('Marka')).toHaveValue('Honda', { timeout: 3000 });
});
