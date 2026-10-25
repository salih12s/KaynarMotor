// Telefon sayfaları. Kullanım: node uret4.cjs [ad]
const fs = require('node:fs');
const path = require('node:path');
const { ctx } = require('./sayfalar.cjs');
const { TEL, telSayfa, telGiris, telSite } = require('./telefon3.cjs');
const KOK = 'C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor';
const { chromium } = require(path.join(KOK, 'node_modules', '@playwright', 'test'));
const HTML = path.join(__dirname, 'html');
const GORSEL = path.join(__dirname, 'gorsel');
const sadece = process.argv[2];
const isler = [];
for (const d of ['a', 'b']) {
  const c = ctx(d);
  for (const [ad, fn] of Object.entries(TEL)) isler.push([`${d}-${ad}`, telSayfa(c, fn(c))]);
  isler.push([`${d}-tel-giris`, telGiris(c)]);
}
for (const a of ['ana', 'liste', 'ilan']) isler.push([`site-tel-${a}`, telSite(a)]);
(async () => {
  const t = await chromium.launch({ channel: 'chrome' });
  const k = await t.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const [ad, html] of isler) {
    if (sadece && !ad.includes(sadece)) continue;
    fs.writeFileSync(path.join(HTML, ad + '.html'), html);
    const s = await k.newPage();
    await s.goto('file:///' + HTML.split(path.sep).join('/') + '/' + ad + '.html', { waitUntil: 'networkidle' });
    await s.evaluate(() => document.fonts.ready);
    const yuk = await s.evaluate(() => Math.max(document.documentElement.scrollHeight, 844));
    await s.setViewportSize({ width: 390, height: yuk });
    await s.waitForTimeout(250);
    await s.screenshot({ path: path.join(GORSEL, ad + '.jpg'), type: 'jpeg', quality: 84 });
    console.log('ok', ad);
    await s.close();
  }
  await t.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
