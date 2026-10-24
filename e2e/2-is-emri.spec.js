/*
 * Akış 2: İş emri oluştur → listede gör → düzenle → tamamla.
 * Ek olarak önbellek kararını gerçek tarayıcıda sınar: pencere kapanınca yeni kayıt 30 sn beklemeden listede görünmeli
 * (useIsEmirleri'nde yenileme/geçersiz kılma yoksa liste eski kalırdı).
 */
const { test, expect } = require('@playwright/test');
const { benzersiz, adminGirisi } = require('./yardimci');

test('iş emri oluşturulur, listede görünür, düzenlenip tamamlanır', async ({ page }) => {
  const musteri = `E2E ${benzersiz('M')}`;
  await adminGirisi(page);
  await expect(page).toHaveURL(/\/servis$/);
  await expect(page.getByRole('row').nth(1)).toBeVisible(); // liste yüklendi (başlık hariç en az bir satır)

  // --- Oluştur ---
  await page.getByRole('button', { name: 'Yeni İş Emri' }).click();
  const pencere = page.getByRole('dialog');
  await expect(pencere).toBeVisible();
  await pencere.getByLabel('Ad Soyad').fill(musteri);
  await pencere.getByLabel('Telefon').fill('05551234567');
  await pencere.getByLabel('KM').fill('12345');
  await pencere.getByLabel('Marka').fill('Yamaha');
  await pencere.getByLabel('Model/Tip').fill('MT-07');
  await pencere.getByLabel('Arıza / Şikayetler').fill('Periyodik bakım ve zincir ayarı');
  await pencere.getByRole('button', { name: 'Kaydet' }).click();

  // --- Listede görünür (önbellek taze mi? 30 sn beklemeden) ---
  await expect(pencere).toBeHidden();
  const satir = page.getByRole('row', { name: new RegExp(musteri) });
  await expect(satir).toBeVisible();
  await expect(satir).toContainText('Yamaha MT-07');
  await expect(satir).toContainText('Bekl'); // yeni iş emri "Beklemede"

  // --- Düzenle ve tamamla ---
  await satir.getByTestId('EditIcon').click();
  await expect(pencere).toBeVisible();
  await expect(pencere.getByLabel('Ad Soyad')).toHaveValue(musteri); // kayıt veritabanından doğru yüklendi
  await pencere.getByRole('combobox', { name: 'Durum' }).click();
  await page.getByRole('option', { name: 'Tamamlandı' }).click();
  await pencere.getByRole('button', { name: 'Güncelle' }).click();

  await expect(pencere).toBeHidden();
  const tamamlanan = page.getByRole('row', { name: new RegExp(musteri) });
  await expect(tamamlanan).toContainText('Tamam');
  await expect(tamamlanan).not.toContainText('Bekl');
});

test('zorunlu alan: müşteri adı boşken sunucuya istek gitmez, pencere açık kalır', async ({ page }) => {
  await adminGirisi(page);
  await expect(page.getByRole('row').nth(1)).toBeVisible();
  const gonderilenler = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/is-emirleri')) gonderilenler.push(r.url());
  });

  await page.getByRole('button', { name: 'Yeni İş Emri' }).click();
  const pencere = page.getByRole('dialog');
  await pencere.getByLabel('Marka').fill('Honda');
  await pencere.getByRole('button', { name: 'Kaydet' }).click();

  await expect(pencere).toBeVisible();
  await page.waitForTimeout(500); // olası geç gelen isteğe zaman tanı
  expect(gonderilenler).toHaveLength(0);
});
