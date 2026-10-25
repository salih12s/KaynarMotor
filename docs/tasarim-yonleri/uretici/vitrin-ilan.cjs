// Vitrin ilan detay sayfası (A ve B için ortak, koyu site yüzü). Çıktı: gorsel/vitrin-ilan.jpg
const fs = require('node:fs');
const path = require('node:path');
const KOK = 'C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor';
const { chromium } = require(path.join(KOK, 'node_modules', '@playwright', 'test'));
const HTML = path.join(__dirname, 'html');

const ozellik = [['Marka', 'Honda'], ['Model', 'CB650R'], ['Yıl', '2021'], ['Durum', 'İkinci el'], ['Kilometre', '14.200 km'], ['Motor hacmi', '649 cc'], ['Segment', 'Naked']];
const sayfa = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap"><style>
*{box-sizing:border-box}body{margin:0;background:#121211;color:#F2F2F0;font-family:'Barlow',sans-serif;font-variant-numeric:tabular-nums}
svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
.bc{font-family:'Barlow Condensed',sans-serif}
nav{height:64px;display:flex;align-items:center;padding:0 40px;border-bottom:1px solid #2C2C2A;gap:28px}
.pill{height:38px;padding:0 18px;border-radius:19px;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700}
.wrap{max-width:1200px;margin:0 auto;padding:28px 40px 60px;display:grid;grid-template-columns:1fr 400px;gap:32px}
.kart{background:#1A1A19;border:1px solid #2C2C2A;border-radius:14px}
.r{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #2C2C2A;font-size:15px}.r span{color:#9A9A94}.r b{font-weight:600}
.btn{height:44px;border-radius:22px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px}
</style></head><body>
<nav><div class="bc" style="font-size:24px;font-weight:700;letter-spacing:.05em">KAYNAR <span style="color:#E0453A">MOTOR</span></div><div style="flex:1"></div><span class="pill" style="background:#C62828">Servise Git</span></nav>
<div class="wrap">
<div>
<div style="display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:600;color:#B9B9B3;margin-bottom:16px"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>İlanlara dön</div>
<div class="kart" style="overflow:hidden"><img src="foto3.jpg" alt="Honda CB650R" style="display:block;width:100%;height:480px;object-fit:cover"></div>
<h2 class="bc" style="font-size:34px;margin:30px 0 10px">Açıklama</h2>
<p style="margin:0;color:#D8D8D4;line-height:1.7;font-size:16px;max-width:60ch">Dört silindirli motoruyla CB650R. Kışın kullanılmamış, kapalı garajda muhafaza edilmiştir. İkinci anahtarı ve kitapçığı mevcut.</p>
<ul style="color:#D8D8D4;line-height:1.9;font-size:16px;padding-left:20px;margin:14px 0 0"><li>Ekspertiz raporu mevcuttur</li><li>Takas ve kredi kartına taksit imkânı</li><li>Noter satışı aynı gün yapılır</li></ul>
</div>
<div>
<div class="kart" style="padding:24px">
<div style="font-size:13.5px;color:#9A9A94;font-weight:600">İkinci el motor</div>
<h1 class="bc" style="font-size:34px;line-height:1.08;margin:8px 0 14px;font-weight:600">Honda CB650R 2021 – Neo Sports Café, Garaj Motoru</h1>
<div class="bc" style="font-size:50px;font-weight:700;line-height:1">665.000 <span style="font-size:34px">₺</span></div>
<div style="margin-top:10px;font-size:14.5px;color:#B9B9B3;display:flex;align-items:center;gap:6px">12 taksitle ayda <b style="color:#F2F2F0">75.913 ₺</b><svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M6 9l6 6 6-6"/></svg></div>
<div style="border-top:1px solid #2C2C2A;margin:20px 0 16px"></div>
${[['Burak Aydın', '0500 663 10 59'], ['Kaan Tekin', '0500 707 46 93']].map(([ad, t]) => `<div style="font-weight:700;margin:12px 0 8px">${ad}</div><div style="display:flex;gap:10px"><span class="btn" style="flex:1;background:#C62828"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>${t}</span><span class="btn" style="flex:1;border:1.5px solid #3FB97A;color:#3FB97A"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>WhatsApp</span></div>`).join('')}
</div>
<h2 class="bc" style="font-size:30px;margin:28px 0 4px">Özellikler</h2>
${ozellik.map(([a, b]) => `<div class="r"><span>${a}</span><b>${b}</b></div>`).join('')}
</div></div></body></html>`;
fs.writeFileSync(path.join(HTML, 'vitrin-ilan.html'), sayfa);
(async () => {
  const t = await chromium.launch({ channel: 'chrome' });
  const k = await t.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const s = await k.newPage();
  await s.goto('file:///' + HTML.split(path.sep).join('/') + '/vitrin-ilan.html', { waitUntil: 'networkidle' });
  await s.evaluate(() => document.fonts.ready);
  await s.screenshot({ path: path.join(__dirname, 'gorsel', 'vitrin-ilan.jpg'), type: 'jpeg', quality: 86, fullPage: true });
  await t.close();
  console.log('ok');
})();
