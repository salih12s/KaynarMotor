/*
 * E2E (uçtan uca) testler: gerçek tarayıcı (makinedeki Chrome) + gerçek frontend + gerçek backend + yerel TEST veritabanı.
 *
 * Çalıştırma (kökten): npm run test:e2e   (yerel MariaDB açık olmalı: bkz. docs/YOL-HARITASI.md "Yerel ortam")
 *
 * Veritabanı: her koşuda SIFIRDAN kurulan tek kullanımlık "test_kaynar_e2e" (bkz. e2e/veritabaniHazirla.cjs). Bağlantı bilgileri
 * backend/.env.mariadb.test'ten alınır, yalnızca veritabanı adı değiştirilir. Çalışan başka bir geliştirme sunucusu varsa YENİDEN
 * KULLANILMAZ (port doluysa test başlamaz): yanlışlıkla kaynar_dev'e yazılmasın.
 */
const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('@playwright/test');

const KOK = __dirname;

// "ANAHTAR=değer" satırlarını okur (yorum ve boş satırlar atlanır); dotenv bağımlılığı eklememek için elle
const ortamOku = (dosya) => {
  const ortam = {};
  for (const satir of fs.readFileSync(dosya, 'utf8').split(/\r?\n/)) {
    const m = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) ortam[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return ortam;
};

const E2E_VERITABANI = 'test_kaynar_e2e';
const ortam = { ...ortamOku(path.join(KOK, 'backend', '.env.mariadb.test')), DB_NAME: E2E_VERITABANI };

if (!['127.0.0.1', 'localhost'].includes(ortam.DB_HOST)) {
  throw new Error(`Güvenlik: E2E yalnızca yerel veritabanı sunucusunda çalışır (host="${ortam.DB_HOST}").`);
}

const API_PORT = process.env.E2E_API_PORT || ortam.PORT || '5100';
const WEB_PORT = process.env.E2E_WEB_PORT || '3100';

// Testlerin (işçi süreçlerin) okuyacağı değerler
process.env.E2E_API = `http://localhost:${API_PORT}/api`;
process.env.E2E_ADMIN_SIFRE = ortam.ADMIN_INITIAL_PASSWORD;

module.exports = defineConfig({
  testDir: './e2e',
  // Aynı veritabanında sırayla: testler benzersiz veri kurar ama sayaçlar (Toplam: N) ortak olduğu için paralel koşturmayız
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: 'e2e/sonuclar',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: 'chrome', // makinedeki Chrome: ayrı tarayıcı indirmeye gerek yok
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // önce veritabanını sıfırla, sonra sunucuyu aç (backend şemayı ve admin hesabını açılışta kurar)
      command: 'node ../e2e/veritabaniHazirla.cjs && npx tsx server.ts',
      cwd: path.join(KOK, 'backend'),
      url: `http://localhost:${API_PORT}/api/health`,
      env: { ...ortam, PORT: API_PORT, FRONTEND_URL: `http://localhost:${WEB_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm start -- --port ${WEB_PORT}`,
      cwd: path.join(KOK, 'frontend'),
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
