/**
 * ARAMA (ILIKE -> LOWER(x) LIKE LOWER(?)) canlıdaki davranışla birebir aynı mı?
 *
 * Canlı PostgreSQL'den alınan "arama kehaneti" (scripts/mariadb/railwayAramaAl.js -> _arama.json):
 * gerçek veriden türetilmiş 300+ sözcük için hangi kayıtların bulunduğu. Aynı sözcükler yerel
 * MariaDB kopyasında aranır; bulunan kayıt numaraları BİREBİR aynı olmalıdır (Türkçe İ/ı/ş/ç harfleri dahil).
 *
 * Çalıştırma (backend klasöründe): node --test tests/integration/arama.test.js
 * Gerekli: yerel MariaDB ve .env.mariadb.test (kaynar_test); test canlı yedeği oraya kendisi yükler.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..', '..');
const ENV = path.join(BACKEND, '.env.mariadb.test');
process.loadEnvFile(ENV);
const { pool } = require('../../core/db');

const YEDEK = path.join(process.env.USERPROFILE || process.env.HOME, 'KaynarMariaDB', 'railway-yedek', '_arama.json');
const kehanet = JSON.parse(fs.readFileSync(YEDEK, 'utf8'));

// Başka testlerin değiştirdiği veri karışmasın: arama kendi veritabanına (kaynar_test) canlı yedeği yükleyip çalışır.
test.before(() => {
  require('child_process').execFileSync(process.execPath, ['--import', 'tsx', 'scripts/mariadb/yedektenYukle.js', '--env', ENV], { cwd: BACKEND, stdio: 'pipe' });
});
test.after(() => pool.end());

for (const [ad, harita] of Object.entries(kehanet.sonuclar)) {
  const [, tablo, kolonlar] = /^(\w+)\((.*)\)$/.exec(ad);
  test(`${tablo}: ${Object.keys(harita).length} arama sözcüğü canlıyla aynı kayıtları bulur`, async () => {
    const kosul = kolonlar.split(',').map((k) => `LOWER(${k}) LIKE LOWER($1)`).join(' OR ');
    const farklar = [];
    for (const [sozcuk, beklenen] of Object.entries(harita)) {
      const r = await pool.query(`SELECT id FROM ${tablo} WHERE ${kosul} ORDER BY id`, [`%${sozcuk}%`]);
      const gelen = r.rows.map((x) => x.id);
      if (JSON.stringify(gelen) !== JSON.stringify(beklenen)) {
        farklar.push(`"${sozcuk}": canlı ${beklenen.length} kayıt, MariaDB ${gelen.length} kayıt`);
      }
    }
    assert.deepEqual(farklar, []);
  });
}
