// Detay pencereleri ve yazdırma çıktıları. Kullanım: node uret3.cjs [ad]
const fs = require('node:fs');
const path = require('node:path');
const { kabuk, ctx } = require('./sayfalar.cjs');
const { sayfaHtml } = require('./ortak.cjs');
const { DETAY, yazdirmaHtml } = require('./sayfalar3.cjs');
const KOK = 'C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor';
const { chromium } = require(path.join(KOK, 'node_modules', '@playwright', 'test'));
const HTML = path.join(__dirname, 'html');
const GORSEL = path.join(__dirname, 'gorsel');
const sadece = process.argv[2];
const META = {
  'd-motor-satis': ['motor', 'Motor Satış', 'Motor Satış'], 'd-motor-stok': ['motor', 'Motor Stok', 'Motor Stok'], 'd-hizli-satis': ['motor', 'Motor Stok', 'Motor Stok'],
  'd-aksesuar': ['aksesuar', 'Aksesuar Satış', 'Aksesuarlar'], 'd-eticaret': ['eticaret', undefined, 'E-Ticaret'], 'd-musteri': ['musteriler', undefined, 'Müşteriler'],
  'd-veresiye': ['veresiye', undefined, 'Veresiye'], 'd-rapor-motor': ['raporlar', undefined, 'Raporlar'], 'd-rapor-is': ['raporlar', undefined, 'Raporlar'], 'd-rapor-aks': ['raporlar', undefined, 'Raporlar'],
  'd-platform': ['eticaret', undefined, 'E-Ticaret'], 'd-sifre': ['kullanicilar', undefined, 'Kullanıcılar'], 'd-silme': ['musteriler', undefined, 'Müşteriler'],
};
const isler = [];
for (const d of ['a', 'b']) {
  for (const [ad, fn] of Object.entries(DETAY)) {
    const c = ctx(d);
    const r = fn(c);
    const [aktif, alt, baslik] = META[ad];
    isler.push([`${d}-${ad}`, sayfaHtml(d, kabuk(d, { aktif, alt, baslik, govde: r.govde, ek: r.ek, yukseklik: r.yukseklik }), ad), 1440]);
  }
  isler.push([`${d}-yazdirma`, yazdirmaHtml(d), 1000]);
}
(async () => {
  const t = await chromium.launch({ channel: 'chrome' });
  for (const [ad, html, w] of isler) {
    if (sadece && !ad.includes(sadece)) continue;
    fs.writeFileSync(path.join(HTML, ad + '.html'), html);
    const k = await t.newContext({ viewport: { width: w, height: w === 1000 ? 560 : 900 }, deviceScaleFactor: 1.5 });
    const s = await k.newPage();
    await s.goto('file:///' + HTML.split(path.sep).join('/') + '/' + ad + '.html', { waitUntil: 'networkidle' });
    await s.evaluate(() => document.fonts.ready);
    await s.waitForTimeout(200);
    await s.screenshot({ path: path.join(GORSEL, ad + '.jpg'), type: 'jpeg', quality: 86, fullPage: true });
    console.log('ok', ad);
    await k.close();
  }
  await t.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
