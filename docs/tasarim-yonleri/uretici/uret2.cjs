// Kalan sayfaları üretir. Kullanım: node uret2.cjs [ad]
const fs = require('node:fs');
const path = require('node:path');
const { kabuk, ctx } = require('./sayfalar.cjs');
const { sayfaHtml } = require('./ortak.cjs');
const { RAPOR, FORM, girisHtml, gecmisHtml, telefonHtml } = require('./sayfalar2.cjs');
const KOK = 'C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor';
const { chromium } = require(path.join(KOK, 'node_modules', '@playwright', 'test'));
const HTML = path.join(__dirname, 'html');
const GORSEL = path.join(__dirname, 'gorsel');
const sadece = process.argv[2];

const FORMMETA = {
  'f-aksesuar-satis': ['aksesuar', 'Aksesuar Satış', 'Aksesuarlar'], 'f-aksesuar-stok': ['aksesuar', 'Aksesuar Stok', 'Aksesuar Stok'], 'f-eticaret': ['eticaret', undefined, 'E-Ticaret'],
  'f-yedek-satis': ['yedek', 'Yedek Parça Satış', 'Yedek Parça'], 'f-yedek-stok': ['yedek', 'Yedek Parça Stok', 'Yedek Parça Stok'], 'f-motor-stok': ['motor', 'Motor Stok', 'Motor Stok'],
  'f-musteri': ['musteriler', undefined, 'Müşteriler'], 'f-kullanici': ['kullanicilar', undefined, 'Kullanıcılar'], 'f-vitrin-ilan': ['vitrin', undefined, 'Vitrin / Site'], 'f-vitrin-personel': ['vitrin', undefined, 'Vitrin / Site'],
};
const isler = []; // [ad, html, genislik]
for (const d of ['a', 'b']) {
  for (const [ad, fn] of Object.entries(RAPOR)) {
    const c = ctx(d);
    const aktif = ad === 'eticaret-platform' ? 'eticaret' : 'raporlar';
    const baslik = ad === 'eticaret-platform' ? 'E-Ticaret' : 'Raporlar';
    isler.push([`${d}-${ad}`, sayfaHtml(d, kabuk(d, { aktif, baslik, govde: fn(c) }), ad), 1440]);
  }
  for (const [ad, fn] of Object.entries(FORM)) {
    const c = ctx(d);
    const [aktif, alt, baslik] = FORMMETA[ad];
    const r = fn(c);
    isler.push([`${d}-${ad}`, sayfaHtml(d, kabuk(d, { aktif, alt, baslik, govde: r.govde, ek: r.ek, yukseklik: r.yukseklik }), ad), 1440]);
  }
  isler.push([`${d}-giris2`, girisHtml(d, 'giris'), 1440], [`${d}-kayit`, girisHtml(d, 'kayit'), 1440], [`${d}-gecmis`, gecmisHtml(d), 390], [`${d}-telefon2`, telefonHtml(d), 390]);
}

(async () => {
  const t = await chromium.launch({ channel: 'chrome' });
  for (const [ad, html, w] of isler) {
    if (sadece && !ad.includes(sadece)) continue;
    fs.writeFileSync(path.join(HTML, ad + '.html'), html);
    const k = await t.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: w === 390 ? 2 : 1.5 });
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
