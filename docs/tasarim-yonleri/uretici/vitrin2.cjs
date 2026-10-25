// Sitenin (müşterinin gördüğü yüz) kalan sayfaları: ana sayfa, motor seçimi, aksesuar, yedek parça, servis, nakliye, sigorta, taksit.
// A ve B'de ortaktır; koyu zemin, sarı rozet yok, kırmızı hover çerçevesi yok, fiyat beyaz.
const fs = require('node:fs');
const path = require('node:path');
const KOK = 'C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor';
const { chromium } = require(path.join(KOK, 'node_modules', '@playwright', 'test'));
const HTML = path.join(__dirname, 'html');
const GORSEL = path.join(__dirname, 'gorsel');
const sadece = process.argv[2];

const I = {
  ev: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>', hesap: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2"/>',
  giris: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l4 4-4 4M14 12H4"/>', ara: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  ok: '<path d="M5 12h14M13 6l6 6-6 6"/>', tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  sohbet: '<path d="M4 5h16v11H9l-5 4z"/>', motor: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5L9 9h5l4.5 7.5M14 9l-1.5-3H10"/>',
  aks: '<path d="M12 4a2 2 0 0 1 2 2c0 1-1 1.5-2 2v2M3 18l9-8 9 8z"/>', disli: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  servis: '<path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.7-8.7z"/>', kamyon: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8zM6 19a1.5 1.5 0 1 0 .01 0M17 19a1.5 1.5 0 1 0 .01 0"/>',
  kalkan: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
};
const svg = (k, s = '') => `<svg viewBox="0 0 24 24"${s ? ` style="${s}"` : ''}>${I[k]}</svg>`;

const CSS = `*{box-sizing:border-box}body{margin:0;background:#121211;color:#F2F2F0;font-family:'Barlow',sans-serif;font-variant-numeric:tabular-nums;width:1440px;min-height:900px;display:flex;flex-direction:column}
svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
.bc{font-family:'Barlow Condensed',sans-serif}
nav{height:64px;flex:none;display:flex;align-items:center;padding:0 40px;border-bottom:1px solid #2C2C2A;gap:26px}
nav .m{display:flex;align-items:center;align-self:stretch;gap:5px;font-size:14.5px;font-weight:600;color:#B9B9B3;white-space:nowrap}
nav .m{border-bottom:3px solid transparent;margin-bottom:-1px}nav .m.on{color:#fff;border-bottom-color:#C62828}
.pill{height:38px;padding:0 16px;border-radius:19px;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;white-space:nowrap}
main{flex:1;padding:36px 40px 56px}
footer{flex:none;border-top:1px solid #2C2C2A;padding:20px;text-align:center;color:#9A9A94;font-size:14px}
.kart{background:#1A1A19;border:1px solid #2C2C2A;border-radius:14px;overflow:hidden}
.btn{height:44px;border-radius:22px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px;padding:0 22px}
.alan{height:44px;width:340px;border:1px solid #3A3A38;border-radius:22px;display:flex;align-items:center;gap:10px;padding:0 16px;font-size:15px;color:#9A9A94}
.fiyat{font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#fff}
.ph{background:#1F1F1E;display:flex;align-items:center;justify-content:center;color:#6F6F6A}`;

const MENU = ['Ana Sayfa', 'Motor Satışı', 'Aksesuar', 'Yedek Parça', 'Bakım / Servis', 'Nakliye / Yol Kurtarma', 'Araç Sigortası'];
const nav = (aktif) => `<nav><div class="bc" style="font-size:24px;font-weight:700;letter-spacing:.05em">KAYNAR <span style="color:#E0453A">MOTOR</span></div>
<div style="display:flex;align-self:stretch;gap:24px;margin-left:8px">${MENU.map((m) => `<span class="m${m === aktif ? ' on' : ''}">${m === 'Ana Sayfa' ? svg('ev', 'width:16px;height:16px') : ''}${m}</span>`).join('')}</div>
<div style="flex:1"></div><span class="pill" style="border:1px solid #4A4A46">${svg('hesap', 'width:16px;height:16px')}Taksit Hesapla</span><span class="pill" style="background:#C62828">${svg('giris', 'width:16px;height:16px')}Servise Git</span></nav>`;
const sayfa = (aktif, ic) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap"><style>${CSS}</style></head><body>${nav(aktif)}<main>${ic}</main><footer>© 2026 Kaynar Motor</footer></body></html>`;

const iletisim = (ad, tel) => `<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><b style="font-size:16px;min-width:110px">${ad}</b><span class="btn" style="background:#C62828">${svg('tel')}${tel}</span><span class="btn" style="border:1.5px solid #3FB97A;color:#3FB97A">${svg('sohbet')}WhatsApp</span></div>`;

const urun = (foto, baslik, marka, fiyat, one) => `<article class="kart" style="display:flex;flex-direction:column"><div style="position:relative;height:210px">${foto ? `<img src="${foto}" alt="" style="display:block;width:100%;height:210px;object-fit:cover">` : `<div class="ph" style="height:210px;flex-direction:column;gap:6px">${svg('disli', 'width:34px;height:34px')}<span style="font-size:13px">Fotoğraf yok</span></div>`}${one ? `<span style="position:absolute;left:12px;top:12px;height:26px;padding:0 11px;background:rgba(18,18,17,.84);border-radius:13px;display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700"><i style="width:8px;height:8px;border-radius:50%;background:#E0453A"></i>Öne çıkan</span>` : ''}</div>
<div style="padding:14px 16px 16px;display:grid;gap:5px;flex:1;align-content:start"><h3 class="bc" style="margin:0;font-size:21px;line-height:1.15;font-weight:600">${baslik}</h3><div style="font-size:13.5px;color:#9A9A94">${marka}</div><div class="fiyat" style="font-size:28px;margin-top:6px">${fiyat}<span style="font-size:21px;margin-left:3px">₺</span></div></div></article>`;

const liste = (baslik, adet, kisi, tel, kartlar) => `<div style="max-width:1360px;margin:0 auto"><div style="display:flex;align-items:flex-end;justify-content:space-between"><div><h1 class="bc" style="margin:0;font-size:56px;line-height:1;font-weight:700">${baslik}</h1><div style="margin-top:6px;color:#9A9A94">${adet} ilan</div></div><div class="alan">${svg('ara')}Ürün adı veya ilan no ara</div></div>
<div style="margin:16px 0 22px;display:flex;gap:14px;align-items:center;color:#9A9A94;font-size:14.5px">Sorularınız için arayın <b style="color:#F2F2F0">${kisi}</b><b style="color:#F2F2F0">${tel}</b><span style="color:#3FB97A;display:inline-flex">${svg('sohbet')}</span></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">${kartlar}</div></div>`;

const hizmet = (aktif, foto, baslik, aciklama, kisi, tel) => `<div style="max-width:880px;margin:0 auto" class="kart">${foto ? `<img src="${foto}" alt="" style="display:block;width:100%;height:340px;object-fit:cover">` : ''}<div style="padding:30px 34px 34px;display:grid;gap:12px"><h1 class="bc" style="margin:0;font-size:44px;line-height:1.05;font-weight:700">${baslik}</h1><p style="margin:0;color:#B9B9B3;font-size:17px;line-height:1.6;max-width:56ch">${aciklama}</p><div style="margin-top:10px">${iletisim(kisi, tel)}</div></div></div>`;

const sayfalar = {
  'vitrin-ana': `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap"><style>${CSS}
.hero{position:relative;flex:1;min-height:836px;background:#0E0E0D;overflow:hidden}.hero img{position:absolute;left:0;right:0;top:190px;width:100%;height:520px;object-fit:cover;opacity:.85}
.hero:before{content:'';position:absolute;inset:0;background:linear-gradient(#0E0E0D 0,rgba(14,14,13,0) 28%,rgba(14,14,13,0) 62%,#0E0E0D 100%);z-index:1}
.ic{position:relative;z-index:2}</style></head><body>
<div class="hero"><img src="hero.jpg" alt="">
<div class="ic" style="display:flex;align-items:center;padding:20px 40px;gap:20px"><div class="bc" style="font-size:24px;font-weight:700;letter-spacing:.05em">KAYNAR <span style="color:#E0453A">MOTOR</span></div><div style="flex:1"></div><span class="pill" style="border:1px solid #4A4A46;background:rgba(18,18,17,.6)">${svg('hesap', 'width:16px;height:16px')}Taksit Hesapla</span><span class="pill" style="background:#C62828">${svg('giris', 'width:16px;height:16px')}Servise Git</span></div>
<div class="ic" style="text-align:center;margin-top:34px"><h1 class="bc" style="margin:0;font-size:66px;line-height:1;font-weight:700">İhtiyacınız olan her şey <span style="color:#E0453A">tek çatı altında</span></h1><div style="margin-top:12px;font-size:18px;color:#D8D8D4">Aşağıdan bir hizmet seçin, sizi ilgili sayfaya götürelim.</div></div>
<div class="ic" style="position:absolute;left:40px;right:40px;bottom:64px;display:grid;grid-template-columns:repeat(6,1fr);gap:12px">${[['motor', 'Motor Satışı'], ['aks', 'Aksesuar'], ['disli', 'Yedek Parça'], ['servis', 'Bakım / Servis'], ['kamyon', 'Nakliye / Yol Kurtarma'], ['kalkan', 'Araç Sigortası']].map(([k, a]) => `<div style="height:78px;border:1px solid #3A3A38;border-radius:14px;background:rgba(18,18,17,.82);display:flex;align-items:center;gap:12px;padding:0 16px"><span style="width:40px;height:40px;border-radius:10px;background:#2A1A19;color:#E0453A;display:inline-flex;align-items:center;justify-content:center">${svg(k, 'width:22px;height:22px')}</span><b class="bc" style="font-size:20px;font-weight:600;line-height:1.1;flex:1">${a}</b>${svg('ok', 'width:16px;height:16px;color:#9A9A94')}</div>`).join('')}</div>
<div class="ic" style="position:absolute;left:0;right:0;bottom:18px;text-align:center;color:#9A9A94;font-size:14px">© 2026 Kaynar Motor</div></div></body></html>`,
  'vitrin-motor-sec': sayfa('Motor Satışı', `<div style="max-width:1000px;margin:36px auto 0"><h1 class="bc" style="margin:0;font-size:56px;line-height:1;font-weight:700">Nasıl bir motor arıyorsunuz?</h1><div style="margin-top:8px;color:#9A9A94;font-size:17px">Seçiminize göre yalnızca o motorları listeleyelim.</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:30px">${[['Sıfır motorlar', 'Kutusundan yeni, garantili motorlar.', 'sifir.jpg', 4], ['İkinci el motorlar', 'Kontrolden geçmiş, bakımlı ikinci el motorlar.', 'ikinciel.jpg', 11]].map(([b, a, f, n]) => `<div class="kart" style="position:relative;height:300px"><img src="${f}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55"><div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(18,18,17,.92),rgba(18,18,17,.2))"></div><div style="position:relative;padding:30px;height:100%;display:flex;flex-direction:column"><h2 class="bc" style="margin:0;font-size:40px;font-weight:700">${b}</h2><p style="margin:8px 0 0;color:#D8D8D4;max-width:24ch">${a}</p><div style="margin-top:auto;display:flex;align-items:center;gap:8px;font-weight:700">${n} ilanı gör${svg('ok')}</div></div></div>`).join('')}</div></div>`),
  'vitrin-aksesuar': sayfa('Aksesuar', liste('Aksesuar', 6, 'Elif Kara', '0500 670 49 98', [
    urun('aks1.jpg', 'Shoei XR-1100 Full Face Kask - M Beden', 'Shoei', '14.500', true), urun('aks2.jpg', 'Deri Yarış Eldiveni - Karbon Korumalı', 'Hyod', '3.200'), urun('aks3.jpg', 'Scoyco MC29 Yazlık Eldiven - Dokunmatik Uçlu', 'Scoyco', '1.150'),
    urun('aks4.jpg', 'SHAD SH33 Arka Çanta - 33 Litre, Montaj Dahil', 'SHAD', '3.950'), urun('', 'Koruma Demiri - Honda PCX 125 (2021 ve sonrası)', 'MTR', '2.400'), urun('', 'Şarjlı Telefon Tutucu - Titreşim Önleyici', 'Kaynar', '950'),
  ].join(''))),
  'vitrin-yedek': sayfa('Yedek Parça', liste('Yedek Parça', 4, 'Emre Yıldız', '0500 677 89 37', [
    urun('', 'DID 520 Zincir Dişli Seti - MT-07 / YZF-R25 Uyumlu', 'DID', '4.600'), urun('', 'EBC FA197 Ön Fren Balatası', 'EBC', '850'), urun('', 'Motul 7100 10W-40 Tam Sentetik - 1 Litre', 'Motul', '890'), urun('', 'Yuasa YTX9-BS Akü - 12V 8Ah', 'Yuasa', '2.600'),
  ].join(''))),
  'vitrin-servis': sayfa('Bakım / Servis', hizmet('', '', 'Bakım ve servis randevusu', 'Periyodik bakım, fren, zincir dişli, lastik ve elektrik arızaları. Aynı gün teslim için sabah 10:00\'a kadar randevu alın.', 'Kadir Özkan', '0500 685 28 76')),
  'vitrin-nakliye': sayfa('Nakliye / Yol Kurtarma', hizmet('', 'nakliye.jpg', 'Kapıdan kapıya motosiklet nakliyesi', 'Sigortalı ve kapalı kasa araçlarla Mersin içi aynı gün, şehirler arası 2 iş günü içinde teslim.', 'Burak Aydın', '0500 692 68 15')),
  'vitrin-sigorta': sayfa('Araç Sigortası', hizmet('', '', 'Trafik sigortası ve kasko', 'Motosikletinize özel trafik sigortası ve kasko tekliflerini aynı gün içinde hazırlıyoruz.', 'Burak Aydın', '0500 700 07 54')),
  'taksit-goruntule': sayfa('', `<div style="max-width:760px;margin:20px auto 0"><h1 class="bc" style="margin:0 0 18px;font-size:44px;font-weight:700">Taksit ödeme seçenekleri</h1>
<div class="kart" style="padding:22px;text-align:center"><div style="color:#9A9A94;font-size:14px">Nakit fiyat</div><div class="fiyat" style="font-size:54px;line-height:1.1">665.000 <span style="font-size:38px">₺</span></div></div>
<div class="kart" style="margin-top:16px"><table style="width:100%;border-collapse:collapse;font-size:16px"><thead><tr style="color:#9A9A94;font-size:13.5px;text-align:left"><th style="padding:14px 20px;font-weight:600">Taksit süresi</th><th style="padding:14px 20px;font-weight:600">Taksitli toplam fiyat</th><th style="padding:14px 20px;font-weight:600;text-align:right">Aylık ödeme</th></tr></thead><tbody>
${[[3, '738.889', '246.296'], [6, '801.205', '133.534'], [9, '852.564', '94.729'], [12, '910.959', '75.913']].map(([a, t, m]) => `<tr style="border-top:1px solid #2C2C2A"><td style="padding:16px 20px;font-weight:600">${a} ay</td><td style="padding:16px 20px;color:#D8D8D4">${t} ₺</td><td style="padding:16px 20px;text-align:right" class="fiyat"><span style="font-size:24px">${m} ₺</span></td></tr>`).join('')}</tbody></table></div>
<p style="margin:14px 0 0;color:#9A9A94;font-size:14px">Tutarlar bilgilendirme amaçlıdır. Detaylı bilgi için bizimle iletişime geçin.</p></div>`),
};

(async () => {
  const t = await chromium.launch({ channel: 'chrome' });
  const k = await t.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  for (const [ad, h] of Object.entries(sayfalar)) {
    if (sadece && ad !== sadece) continue;
    fs.writeFileSync(path.join(HTML, ad + '.html'), h);
    const s = await k.newPage();
    await s.goto('file:///' + HTML.split(path.sep).join('/') + '/' + ad + '.html', { waitUntil: 'networkidle' });
    await s.evaluate(() => document.fonts.ready);
    await s.screenshot({ path: path.join(GORSEL, ad + '.jpg'), type: 'jpeg', quality: 86, fullPage: true });
    console.log('ok', ad);
    await s.close();
  }
  await t.close();
})();
