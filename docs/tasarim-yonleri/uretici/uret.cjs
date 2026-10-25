// Tüm sayfaları üretir ve ekran görüntüsünü alır. Kullanım: node uret.cjs [sayfa-adı]
const fs = require('node:fs');
const path = require('node:path');
const { SAYFALAR, kabuk, ctx } = require('./sayfalar.cjs');
const { sayfaHtml } = require('./ortak.cjs');

const KOK = 'C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor';
const { chromium } = require(path.join(KOK, 'node_modules', '@playwright', 'test'));
const HTML = path.join(__dirname, 'html');
const GORSEL = path.join(__dirname, 'gorsel');
fs.mkdirSync(HTML, { recursive: true });
fs.mkdirSync(GORSEL, { recursive: true });
const VARLIK = path.join(__dirname, '..', 'varlik');
for (const [k, h] of [['logo-kirpik.png', 'logo-kirpik.png'], ['foto1k.jpg', 'foto1.jpg'], ['foto2k.jpg', 'foto2.jpg'], ['foto3k2.jpg', 'foto3.jpg']]) fs.copyFileSync(path.join(VARLIK, k), path.join(HTML, h));

const sadece = process.argv[2];
const yonler = ['a', 'b'];
const dosyalar = [];
for (const sf of SAYFALAR) {
  if (sadece && sf.ad !== sadece) continue;
  for (const d of yonler) {
    const c = ctx(d);
    let govde, ek = '', yukseklik;
    if (sf.form) ({ govde, ek, yukseklik } = sf.form(c));
    else govde = sf.govde(c);
    const icerik = kabuk(d, { aktif: sf.aktif, alt: sf.alt, baslik: sf.baslik, govde, ek, yukseklik });
    const ad = `${d}-${sf.ad}`;
    fs.writeFileSync(path.join(HTML, ad + '.html'), sayfaHtml(d, icerik, ad));
    dosyalar.push(ad);
  }
}

(async () => {
  const tarayici = await chromium.launch({ channel: 'chrome' });
  const baglam = await tarayici.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'tr-TR' });
  for (const ad of dosyalar) {
    const sayfa = await baglam.newPage();
    await sayfa.goto('file:///' + HTML.split(path.sep).join('/') + '/' + ad + '.html', { waitUntil: 'networkidle' });
    await sayfa.evaluate(() => document.fonts.ready);
    await sayfa.waitForTimeout(300);
    await sayfa.screenshot({ path: path.join(GORSEL, ad + '.jpg'), type: 'jpeg', quality: 86, fullPage: true });
    const yuk = await sayfa.evaluate(() => document.documentElement.scrollHeight);
    console.log('ok', ad, yuk);
    await sayfa.close();
  }
  await tarayici.close();
})().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
