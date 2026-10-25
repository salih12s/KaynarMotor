// A (Servis Defteri) ve B (Gösterge) için ortak bileşenler: ikonlar, renkler, kabuk (kenar menü + üst çubuk), tablo, süzgeç, düğme.
const IK = {
  motor: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5L9 9h5l4.5 7.5M14 9l-1.5-3H10"/>',
  servis: '<path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.7-8.7z"/>',
  sepet: '<path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  magaza: '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6"/>',
  hesap: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2"/>',
  disli: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  cuzdan: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  grafik: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  kisiler: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6M16 5a3.5 3.5 0 0 1 0 7M18 14c2.5.6 3.5 2.4 3.5 6"/>',
  klasor: '<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  kisi: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  kalkan: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  ev: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
  goz: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  yaz: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/>',
  qr: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
  duz: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  sil: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  onay: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  carpi: '<path d="M6 6l12 12M18 6L6 18"/>',
  kilit: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  indir: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  yukle: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  disari: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  ara: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  asagi: '<path d="M6 9l6 6 6-6"/>',
  yukari: '<path d="M6 15l6-6 6 6"/>',
  arti: '<path d="M12 5v14M5 12h14"/>',
  cikis: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
  bilgi: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  telefon: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  sohbet: '<path d="M4 5h16v11H9l-5 4z"/>',
  geri: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  dosya: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  gizle: '<path d="M3 3l18 18M10.6 6.2A10 10 0 0 1 22 12a14 14 0 0 1-3 3.8M6.5 7.5A14 14 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  takvim: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tablo: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  menu2: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  yildiz: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
};
const svg = (ad, s) => `<svg viewBox="0 0 24 24" aria-hidden="true"${s ? ` style="${s}"` : ''}>${IK[ad]}</svg>`;

// Kenar menü simge renkleri: A açık zeminde koyu tonlar, B koyu zeminde parlak tonlar.
const NAV = [
  ['motor', 'Motorsiklet', '#B85C1E', '#FF9F5A', 'motor', ['Motor Satış', 'Motor Stok']],
  ['servis', 'Servis', '#B3261E', '#FF6B5E', 'servis'],
  ['sepet', 'Aksesuarlar', '#6B3FA0', '#B98CFF', 'aksesuar', ['Aksesuar Satış', 'Aksesuar Stok']],
  ['magaza', 'E-Ticaret', '#1E5FAE', '#5AA9FF', 'eticaret'],
  ['hesap', 'Taksit Hesaplama', '#0F7B6C', '#3DDBC0', 'taksit'],
  ['disli', 'Yedek Parça', '#9A6A00', '#FFC247', 'yedek', ['Yedek Parça Satış', 'Yedek Parça Stok']],
  ['globe', 'Vitrin / Site', '#B0306A', '#FF7AB6', 'vitrin'],
  ['cuzdan', 'Veresiye', '#2E7D32', '#5EDB8A', 'veresiye'],
  ['grafik', 'Raporlar', '#0E7490', '#46D6F0', 'raporlar'],
  ['kisiler', 'Müşteriler', '#3F51B5', '#8C9EFF', 'musteriler'],
  ['klasor', 'Belge Arşivi', '#8A6D00', '#FFD966', 'belge'],
  ['kisi', 'Kullanıcılar', '#0277BD', '#4FC3F7', 'kullanicilar'],
  ['kalkan', 'Yetkilendirme', '#546E7A', '#90A4AE', 'yetki'],
];
const ALT_IKON = { 'Motor Satış': 'sepet', 'Motor Stok': 'tablo', 'Aksesuar Satış': 'sepet', 'Aksesuar Stok': 'tablo', 'Yedek Parça Satış': 'sepet', 'Yedek Parça Stok': 'tablo' };

// Ton -> renk çifti (yazı, zemin)
const TON = {
  a: {
    bekle: ['#8A5300', '#F7E7C4'], mavi: ['#1E4A86', '#DCE6F4'], yesil: ['#1D6A3B', '#D8EBDD'], kirmizi: ['#A52A22', '#F6DAD7'],
    mor: ['#5B3A8C', '#E7DFF3'], gri: ['#4A4F57', '#E6E6E0'], turuncu: ['#A5530F', '#F8E1CC'], nokta: ['#C77700', '#2457A6', '#2A7A47'],
  },
  b: {
    bekle: ['#B87900', '#FFF1CF'], mavi: ['#2B6CB0', '#DCEBFA'], yesil: ['#1F7A4A', '#D9F2E3'], kirmizi: ['#C0281E', '#FCE3E0'],
    mor: ['#6B46C1', '#EADFFB'], gri: ['#4A5560', '#E6E9EC'], turuncu: ['#C05621', '#FDE5D3'],
  },
};
const LED = { bekle: '#F2A900', mavi: '#2B6CB0', yesil: '#2FA564', kirmizi: '#E0453A', mor: '#8A63D2', gri: '#8A939C', turuncu: '#F08A3C' };

// İşlem düğmesi renkleri (yazı, soluk zemin)
const ISL = {
  a: { goz: ['#1E5FAE', '#DCE6F4'], yaz: ['#3C4046', '#E3E3DC'], qr: ['#6B3FA0', '#E7DFF3'], duz: ['#9A6200', '#F7E7C4'], sil: ['#B3261E', '#F6DAD7'], sepet: ['#1D6A3B', '#D8EBDD'], onay: ['#1D6A3B', '#D8EBDD'], carpi: ['#B3261E', '#F6DAD7'], kilit: ['#5B5F66', '#E3E3DC'], indir: ['#1E5FAE', '#DCE6F4'], disari: ['#6B3FA0', '#E7DFF3'], yukari: ['#5B5F66', '#E3E3DC'], asagi: ['#5B5F66', '#E3E3DC'], gizle: ['#9A6200', '#F7E7C4'] },
  b: { goz: ['#2B6CB0', '#DCEBFA'], yaz: ['#4A5560', '#E6E9EC'], qr: ['#6B46C1', '#EADFFB'], duz: ['#B87900', '#FFF1CF'], sil: ['#C0281E', '#FCE3E0'], sepet: ['#1F7A4A', '#D9F2E3'], onay: ['#1F7A4A', '#D9F2E3'], carpi: ['#C0281E', '#FCE3E0'], kilit: ['#4A5560', '#E6E9EC'], indir: ['#2B6CB0', '#DCEBFA'], disari: ['#6B46C1', '#EADFFB'], yukari: ['#4A5560', '#E6E9EC'], asagi: ['#4A5560', '#E6E9EC'], gizle: ['#B87900', '#FFF1CF'] },
};
const ETIKET = { goz: 'Görüntüle', yaz: 'Yazdır', qr: 'Servis QR', duz: 'Düzenle', sil: 'Sil', sepet: 'Satışa çevir', onay: 'Onayla', carpi: 'Reddet', kilit: 'Şifre sıfırla', indir: 'İndir', disari: 'Aç', yukari: 'Yukarı', asagi: 'Aşağı', gizle: 'Yayından kaldır' };

const CSS = `
*{box-sizing:border-box}
body{margin:0}
.s{width:1440px;min-height:900px;display:flex;position:relative;font-family:var(--fm);color:var(--yazi);background:var(--zemin);font-variant-numeric:tabular-nums}
.s svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
.yan{width:var(--yw);flex:none;background:var(--yan-bg);border-right:1px solid var(--yan-cizgi);padding:20px 14px;display:flex;flex-direction:column;gap:3px}
.nav{display:flex;align-items:center;gap:12px;height:40px;padding:0 12px;border-radius:6px;color:var(--yan-yazi);font-size:15px;font-weight:500;position:relative}
.nav svg{color:var(--c)}
.nav .ok{margin-left:auto;width:16px;height:16px;color:var(--yan-yazi);opacity:.7}
.nav.on{background:var(--yan-on-bg);color:var(--yan-on-yazi);font-weight:600}
.alt{display:flex;align-items:center;gap:9px;height:34px;padding:0 8px 0 32px;font-size:13.5px;white-space:nowrap;font-weight:500;color:var(--yan-yazi);border-radius:6px}
.alt svg{width:15px;height:15px;color:var(--c);opacity:.85}
.alt.on{background:var(--yan-on-bg);color:var(--yan-on-yazi);font-weight:700}
.ana{flex:1;min-width:0;padding:24px 28px 40px;display:flex;flex-direction:column;gap:16px}
.ust{display:flex;align-items:flex-end;justify-content:space-between}
.ust h1{margin:0;font-family:var(--fh);font-weight:700}
.ust .tarih{color:var(--soluk);font-size:14px}
.kul{display:flex;align-items:center;gap:12px;font-size:14px;font-weight:600}
.av{width:36px;height:36px;border-radius:50%;background:var(--yazi);color:var(--zemin);display:inline-flex;align-items:center;justify-content:center;font-weight:700}
.ik{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;padding:0;margin-right:3px;color:var(--t);background:var(--tb);cursor:pointer}
.ik svg{width:17px;height:17px}
.ik.bos{background:transparent;color:var(--soluk)}
.ik.ham{background:transparent;color:var(--soluk);margin:0}
.bar{display:flex;gap:12px;align-items:center}
.bar .bosluk{flex:1}
.alan{height:40px;border:1px solid var(--alan-cizgi);border-radius:var(--ar);background:var(--alan-bg);font:500 14px var(--fm);color:var(--soluk);padding:0 12px;display:flex;align-items:center;gap:8px;white-space:nowrap}
.alan.sec{justify-content:space-between}
.btn{height:42px;border:0;border-radius:var(--ar);background:var(--vurgu);color:#fff;font:700 15px var(--fm);padding:0 18px;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.btn2{height:42px;border:1.5px solid var(--vurgu);border-radius:var(--ar);background:transparent;color:var(--vurgu);font:600 14.5px var(--fm);padding:0 16px;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.btn3{height:42px;border:1.5px solid var(--iyi);border-radius:var(--ar);background:transparent;color:var(--iyi);font:600 14.5px var(--fm);padding:0 16px;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.tw{background:var(--yuzey);border:1px solid var(--cizgi);border-radius:var(--r);overflow:hidden}
table{width:100%;border-collapse:collapse}
.th{font-size:12.5px;font-weight:600;color:var(--soluk);text-align:left;padding:11px 8px;background:var(--th);border-bottom:var(--thb);white-space:nowrap}
.td{padding:8px;border-bottom:var(--tdb);font-size:14px;vertical-align:middle}
.td.n,.th.n{text-align:right}
.td.n{font-weight:600}
.td.soluk{color:var(--soluk)}
.td.iyi{color:var(--iyi);font-weight:600}
.td.kotu{color:var(--kotu);font-weight:600}
.td small{display:block;font-size:12.5px;color:var(--soluk);margin-top:1px}
tr.uyari .td{background:var(--uyari)}
.kart{background:var(--yuzey);border:1px solid var(--cizgi);border-radius:var(--r)}
.mono{font-family:var(--fn)}
.dlg{position:absolute;left:50%;top:44px;transform:translateX(-50%);background:var(--yuzey);border-radius:10px;box-shadow:0 24px 60px rgba(10,12,16,.35);overflow:hidden}
.ort{position:absolute;inset:0;background:rgba(18,20,24,.58)}
.dh{display:flex;align-items:center;gap:14px;padding:16px 24px;border-bottom:1px solid var(--cizgi)}
.dh h2{margin:0;font-family:var(--fh);font-size:26px;font-weight:700}
.dh .x{margin-left:auto;color:var(--soluk)}
.db{padding:20px 24px;display:grid;gap:22px}
.df{display:flex;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--cizgi);background:var(--th)}
.bol h3{margin:0 0 10px;font-family:var(--fh);font-size:19px;font-weight:700;display:flex;align-items:center;gap:8px}
.bol h3 svg{width:18px;height:18px;color:var(--vurgu)}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.f{display:flex;flex-direction:column;gap:3px;min-width:0}
.f label{font-size:12.5px;font-weight:600;color:var(--soluk)}
.f .in{height:40px;border:1px solid var(--alan-cizgi);border-radius:var(--ar);background:var(--alan-bg);padding:0 12px;display:flex;align-items:center;justify-content:space-between;font-size:14.5px;color:var(--yazi);white-space:nowrap}
.f .in.bos{color:#9A9EA5}
.f .in.alan-uzun{height:76px;align-items:flex-start;padding-top:10px}
.kutu{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--ar);font-weight:600}
.kutu i{width:20px;height:20px;border-radius:4px;background:var(--iyi);display:inline-flex;align-items:center;justify-content:center;color:#fff}
.kutu i svg{width:14px;height:14px;stroke-width:2.4}
.ipucu{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:var(--ar);background:var(--bilgi-bg);color:var(--bilgi-yazi);font-size:14.5px}
.sekme{display:flex;gap:6px;border-bottom:1px solid var(--cizgi)}
.sekme span{padding:10px 14px 7px;font-weight:600;font-size:14.5px;color:var(--soluk);border-bottom:3px solid transparent;margin-bottom:-1px}
.sekme span.on{color:var(--yazi);border-bottom-color:var(--vurgu)}
.ro{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:99px}
`;

const SKIN = {
  a: `
:root{--zemin:#EEEFEB;--yuzey:#FBFBF8;--cizgi:#D2D3CA;--yazi:#16181C;--soluk:#5B5F66;--th:#F3F3EE;--thb:1.5px solid #16181C;--tdb:1px dashed #CBCCC2;--vurgu:#C62828;--iyi:#1D6A3B;--kotu:#B3261E;--uyari:#FBEAE7;
--yan-bg:#E4E5DE;--yan-cizgi:#D2D3CA;--yan-yazi:#3C4046;--yan-on-bg:#FBFBF8;--yan-on-yazi:#16181C;--yw:216px;--r:6px;--ar:5px;--alan-bg:#FBFBF8;--alan-cizgi:#BFC0B6;--bilgi-bg:#DCE6F4;--bilgi-yazi:#1E3A66;
--fh:'Barlow Condensed',sans-serif;--fm:'Barlow',sans-serif;--fn:'IBM Plex Mono',monospace}
.nav.on{box-shadow:0 0 0 1px #D2D3CA}
.ust h1{font-size:46px;line-height:1}
.ust .tarih{margin-top:6px}
.plaka{display:inline-flex;align-items:stretch;height:26px;border:1.5px solid #16181C;border-radius:5px;background:#fff;overflow:hidden;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:17px;letter-spacing:.07em;color:#16181C;white-space:nowrap}
.plaka i{font-style:normal;background:#1F4FA0;color:#fff;width:14px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;font-size:7px;letter-spacing:0;font-weight:700}
.plaka span{display:flex;align-items:center;padding:0 8px}
.dur{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border:1.5px solid currentColor;border-radius:3px;letter-spacing:.02em;color:var(--t);background:var(--tb)}
.dur i{display:none}
.kpi{display:flex;align-items:stretch;background:var(--yuzey);border:1px solid var(--cizgi);border-radius:var(--r);overflow:hidden}
.kpi div{display:flex;flex-direction:column;gap:2px;padding:12px 16px 10px;flex:1 1 0;min-width:0;border-right:1px solid #E1E2DA}
.kpi div:last-child{border-right:0}
.kpi b{font-family:'Barlow Condensed',sans-serif;font-size:28px;line-height:1;font-weight:600;color:var(--t)}
.kpi span{font-size:12.5px;color:var(--soluk);font-weight:500}
.kpi .led{display:none}
.ch{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:1.5px solid var(--t);border-radius:4px;background:var(--tb);color:var(--t);font-size:13.5px;font-weight:700}
.ch i{display:none}
.sec{font-family:'Barlow Condensed',sans-serif}
.btn:hover{background:#A61F1F}
.k-baslik{font-family:'Barlow Condensed',sans-serif;font-weight:700}
.sekme span.on{border-bottom-color:#16181C}
`,
  b: `
:root{--zemin:#E9ECEF;--yuzey:#FFFFFF;--cizgi:#D3D8DD;--yazi:#1D2228;--soluk:#5E6670;--th:#F1F3F5;--thb:1px solid #D3D8DD;--tdb:1px solid #E6E9EC;--vurgu:#D7261E;--iyi:#1F7A4A;--kotu:#C0281E;--uyari:#FDEDEB;
--yan-bg:#1D2228;--yan-cizgi:#1D2228;--yan-yazi:#AEB6BF;--yan-on-bg:#2B333B;--yan-on-yazi:#FFFFFF;--yw:232px;--r:8px;--ar:5px;--alan-bg:#fff;--alan-cizgi:#C3CAD1;--bilgi-bg:#E3F0FB;--bilgi-yazi:#1E4A78;
--fh:'Chakra Petch',sans-serif;--fm:'Barlow Semi Condensed',sans-serif;--fn:'Chakra Petch',sans-serif}
.nav.on:after{content:'';position:absolute;right:12px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:#FF4A3D;box-shadow:0 0 8px #FF4A3D}
.nav.on .ok{display:none}
.yan{gap:3px}
.ust{align-items:center}
.ust > div:first-child{display:flex;align-items:baseline;gap:14px}
.ust h1{font-size:34px}
.td{height:36px}
.plaka{display:inline-block;border:1.5px solid #1D2228;border-radius:4px;padding:1px 8px;background:#F7F9FA;font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:13.5px;letter-spacing:.04em;white-space:nowrap}
.plaka i{display:none}
.dur{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--yazi)}
.dur i{width:9px;height:9px;border-radius:50%;background:var(--t);box-shadow:0 0 6px var(--t);flex:none}
.kpi{display:flex;gap:12px}
.kpi div{flex:1 1 0;background:#fff;border:1px solid #D3D8DD;border-radius:8px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;position:relative;min-width:0}
.kpi b{font-family:'Chakra Petch',sans-serif;font-size:26px;line-height:1.1;font-weight:700;color:var(--yazi)}
.kpi span{font-size:13px;color:var(--soluk);font-weight:500}
.kpi .led{position:absolute;right:12px;top:12px;width:9px;height:9px;border-radius:50%;background:var(--t);box-shadow:0 0 7px var(--t)}
.ch{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 13px;border:1px solid #D3D8DD;border-radius:16px;background:#fff;color:var(--yazi);font-size:13.5px;font-weight:600}
.ch i{width:9px;height:9px;border-radius:50%;background:var(--t);box-shadow:0 0 6px var(--t)}
.k-baslik{font-family:'Chakra Petch',sans-serif;font-weight:700}
.dh h2,.bol h3{font-family:'Chakra Petch',sans-serif}
.dh h2{font-size:22px}.bol h3{font-size:16px}
`,
};

const aralikKlas = (d, ton, sinif) => {
  const [fg, bg] = TON[d][ton];
  return `style="--t:${fg};--tb:${bg}"`;
};

// ---------- küçük yapı taşları ----------
function ctx(d) {
  const T = TON[d];
  const durum = (ton, yazi) => {
    const [fg, bg] = T[ton];
    const led = LED[ton];
    return `<span class="dur" style="--t:${d === 'b' ? led : fg};--tb:${bg}"><i></i>${yazi}</span>`;
  };
  const rozet = (ton, yazi) => {
    const [fg, bg] = T[ton];
    return `<span class="ro" style="color:${fg};background:${bg}">${yazi}</span>`;
  };
  const plaka = (p) => (p === 'PLAKASIZ' ? `<span class="plaka" style="opacity:.75"><i>TR</i><span>PLAKASIZ</span></span>` : `<span class="plaka"><i>TR</i><span>${p}</span></span>`);
  const islem = (...liste) =>
    `<td class="td" style="white-space:nowrap">${liste
      .map((k) => {
        const [fg, bg] = ISL[d][k];
        return `<button class="ik" style="--t:${fg};--tb:${bg}" aria-label="${ETIKET[k]}">${svg(k)}</button>`;
      })
      .join('')}</td>`;
  const ik = (k) => {
    const [fg, bg] = ISL[d][k];
    return `<button class="ik" style="--t:${fg};--tb:${bg}" aria-label="${ETIKET[k]}">${svg(k)}</button>`;
  };
  const kpi = (liste) =>
    `<section class="kpi" aria-label="Özet">${liste
      .map(([v, l, ton]) => {
        const [fg] = T[ton || 'gri'];
        const renk = d === 'a' ? (ton ? fg : '#16181C') : d === 'b' ? (ton ? LED[ton] : '#1D2228') : fg;
        return `<div style="--t:${d === 'a' ? renk : LED[ton || 'gri']};flex:${String(v).length > 6 ? 1.9 : 1} 1 0"><b>${v}</b><span>${l}</span><i class="led"></i></div>`;
      })
      .join('')}</section>`;
  const chip = (yazi, ton) => {
    const [fg, bg] = T[ton];
    return `<span class="ch" style="--t:${d === 'b' ? LED[ton] : fg};--tb:${bg}"><i></i>${yazi}</span>`;
  };
  const ara = (w, yazi) => `<div class="alan" style="width:${w}px">${svg('ara')}${yazi}</div>`;
  const sec = (w, yazi) => `<div class="alan sec" style="width:${w}px">${yazi}${svg('asagi')}</div>`;
  const tarih = (w, yazi) => `<div class="alan" style="width:${w}px;justify-content:space-between">${yazi || 'gg.aa.yyyy'}${svg('takvim')}</div>`;
  const btn = (yazi, ikon) => `<button class="btn">${ikon ? svg(ikon) : ''}${yazi}</button>`;
  const btn2 = (yazi, ikon) => `<button class="btn2">${ikon ? svg(ikon) : ''}${yazi}</button>`;
  const btn3 = (yazi, ikon) => `<button class="btn3">${ikon ? svg(ikon) : ''}${yazi}</button>`;
  const tablo = (kolonlar, satirlar, opt = {}) =>
    `<section class="tw"><table style="table-layout:${opt.sabit === false ? 'auto' : 'fixed'}"><thead><tr>${kolonlar
      .map((k) => `<th class="th${k.a === 'r' ? ' n' : ''}"${k.w ? ` style="width:${k.w}px"` : ''}>${k.t}</th>`)
      .join('')}</tr></thead><tbody>${satirlar
      .map((s, i) => `<tr class="${opt.satirSinif ? opt.satirSinif(i) || '' : ''}"${opt.satirStil ? ` style="${opt.satirStil(i)}"` : ''}>${s.join('')}</tr>`)
      .join('')}</tbody></table></section>`;
  const f = (etiket, deger, bos, sinif) => `<div class="f"><label>${etiket}</label><div class="in${bos ? ' bos' : ''} ${sinif || ''}">${deger || ''}</div></div>`;
  return { d, T, durum, rozet, plaka, islem, ik, kpi, chip, ara, sec, tarih, btn, btn2, btn3, tablo, f };
}

function kabuk(d, { aktif, alt, baslik, govde, ek = '', yukseklik, logo }) {
  const nav = NAV.map(([ik, ad, ca, cb, kod, altlar]) => {
    const renk = d === 'a' ? ca : cb;
    const acik = aktif === kod;
    const grupAcik = altlar && altlar.some((x) => x === alt);
    const on = (acik && !altlar) || false;
    let h = `<div class="nav${on ? ' on' : ''}" style="--c:${renk}">${svg(ik)}${ad}${altlar ? svg(grupAcik ? 'yukari' : 'asagi').replace('<svg', '<svg class="ok"') : ''}</div>`;
    if (grupAcik) h += altlar.map((x) => `<div class="alt${x === alt ? ' on' : ''}" style="--c:${renk}">${svg(ALT_IKON[x])}${x}</div>`).join('');
    return h;
  }).join('');
  const marka =
    d === 'a'
      ? `<div style="padding:4px 8px 18px"><img src="logo-kirpik.png" alt="Kaynar Motor" style="display:block;width:150px;height:auto"></div>`
      : `<div style="padding:4px 10px 20px;color:#fff;font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:19px;letter-spacing:.06em">KAYNAR <span style="color:#FF4A3D">MOTOR</span></div>`;
  const anaRenk = d === 'a' ? '#5D8A1F' : '#A6E05A';
  const ust =
    d === 'a'
      ? `<div><h1>${baslik}</h1><div class="tarih">25 Ekim 2026 Pazar</div></div>`
      : `<div><h1>${baslik}</h1><span class="tarih">25 Ekim 2026 Pazar</span></div>`;
  return `<div class="s ${d === 'a' ? 'd-a' : 'd-b'}"${yukseklik ? ` style="min-height:${yukseklik}px"` : ''}>
<aside class="yan">${marka}${nav}<div style="flex-grow:1"></div><div class="nav" style="--c:${anaRenk}">${svg('ev')}Ana Sayfaya Git</div></aside>
<main class="ana"><header class="ust">${ust}<div class="kul">Admin<span class="av">A</span><button class="ik ham" aria-label="Çıkış yap" style="--t:#B3261E;--tb:transparent">${svg('cikis')}</button></div></header>${govde}</main>${ek}</div>`;
}

function sayfaHtml(d, icerik, baslik) {
  const fontlar =
    d === 'a'
      ? 'family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500'
      : 'family=Chakra+Petch:wght@500;600;700&family=Barlow+Semi+Condensed:wght@400;500;600;700';
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${baslik}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontlar}&display=swap"><style>${SKIN[d]}${CSS}</style></head><body>${icerik}</body></html>`;
}

module.exports = { IK, svg, NAV, TON, LED, ISL, CSS, SKIN, ctx, kabuk, sayfaHtml };
