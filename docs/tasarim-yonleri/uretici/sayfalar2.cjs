// Kalan yönetim sayfaları: Raporlar sekmeleri, Platformlar, formlar, giriş/kayıt, servis geçmişi, telefon.
const S1 = require('./sayfalar.cjs');
const { svg, ISL, TON, LED, NAV } = require('./ortak.cjs');
const { binlik } = S1;

const bas = (n) => binlik(n);
const TLK = (n) => `${String(n)} ₺`;

// ---------- Raporlar sekmeleri ----------
const SEKMELER = ['Genel Özet', 'Motor Satışları', 'İş Emirleri', 'Aksesuar Satışları', 'E-Ticaret', 'Yedek Parça', 'Fiş Kâr Analizi', 'Yatırımcılar'];

function raporKart(c, l, v, ton) {
  const { d, T } = c;
  const [fg, bg] = T[ton || 'gri'];
  if (d === 'a') return `<div class="kart" style="padding:12px 16px;background:${ton ? bg : 'var(--yuzey)'};min-width:0"><div style="font-size:13px;color:var(--soluk)">${l}</div><div style="font-family:var(--fh);font-size:27px;font-weight:700;margin-top:2px;color:${ton ? fg : 'var(--yazi)'}">${v}</div></div>`;
  return `<div class="kart" style="padding:12px 16px;position:relative;min-width:0"><i style="position:absolute;right:12px;top:12px;width:9px;height:9px;border-radius:50%;background:${LED[ton || 'gri']};box-shadow:0 0 7px ${LED[ton || 'gri']}"></i><div style="font-size:13px;color:var(--soluk)">${l}</div><div style="font-family:var(--fh);font-size:26px;font-weight:700;margin-top:2px">${v}</div></div>`;
}
function raporSayfa(c, aktif, { alt = '', ek = '', kartlar, sutun = 4, tablo }) {
  const secili = SEKMELER.indexOf(aktif);
  return `<div class="sekme">${SEKMELER.map((t, i) => `<span${i === secili ? ' class="on"' : ''}>${t}</span>`).join('')}</div>
<section class="bar"><div style="display:flex;border:1px solid var(--alan-cizgi);border-radius:var(--ar);overflow:hidden;font-weight:600;font-size:13.5px;background:var(--yuzey)"><span style="padding:10px 14px;color:var(--soluk)">Bugün</span><span style="padding:10px 14px;background:var(--yazi);color:var(--zemin)">Bu Ay</span><span style="padding:10px 14px;color:var(--soluk)">Geçen Ay</span><span style="padding:10px 14px;color:var(--soluk)">Bu Yıl</span><span style="padding:10px 14px;color:var(--soluk)">Geçen Yıl</span></div>${c.tarih(150, '01.10.2026')}${c.tarih(150, '31.10.2026')}${ek}</section>${alt}
<section style="display:grid;grid-template-columns:repeat(${sutun},1fr);gap:12px">${kartlar.map(([l, v, t]) => raporKart(c, l, v, t)).join('')}</section>${tablo}`;
}
const gz = (c) => c.ik('goz');
const gzTd = (c) => `<td class="td">${c.ik('goz')}</td>`;

const RAPOR = {
  'rapor-motor': (c) =>
    raporSayfa(c, 'Motor Satışları', {
      alt: `<div class="sekme"><span class="on">Satışlar (2)</span><span>Komisyonlu satışlar (0)</span></div>`,
      sutun: 5,
      kartlar: [['Toplam satış', '2', 'kirmizi'], ['Motor gelir', '₺293.000,00', 'mavi'], ['Motor maliyet', '₺252.500,00', 'turuncu'], ['Motor kârı (payınız)', '₺34.000,00', 'yesil'], ['Yatırımcı payı', '₺6.500,00', 'mavi'],
        ['Komisyoncu payı', '₺0,00', 'turuncu'], ['Noter satış cirosu', '₺205.000,00', 'mor'], ['Faturalı', '1', 'yesil'], ['Motor stok değeri', '₺8.250.000,00', 'mor']],
      tablo: c.tablo(
        [{ t: '', w: 44 }, { t: 'Tarih', w: 96 }, { t: 'Plaka', w: 130 }, { t: 'Marka / Model' }, { t: 'Alış', w: 110, a: 'r' }, { t: 'Satış', w: 110, a: 'r' }, { t: 'Masraf', w: 90, a: 'r' }, { t: 'Payınız', w: 100, a: 'r' }, { t: 'Ödeme', w: 80 }, { t: 'Fatura', w: 120 }],
        [
          [gzTd(c), `<td class="td soluk" style="font-size:13px">12.10.2026</td>`, `<td class="td">${c.plaka('33 VC 9067')}</td>`, `<td class="td"><b>Honda</b> Forza 250</td>`, `<td class="td n soluk" style="font-weight:500">161.000,00 ₺</td>`, `<td class="td n">189.000,00 ₺</td>`, `<td class="td n soluk" style="font-weight:500">0,00 ₺</td>`, `<td class="td n iyi">28.000,00 ₺</td>`, `<td class="td">nakit</td>`, `<td class="td">${c.durum('kirmizi', 'Kesilmedi')}</td>`],
          [gzTd(c), `<td class="td soluk" style="font-size:13px">11.10.2026</td>`, `<td class="td">${c.plaka('33 ABK 636')}</td>`, `<td class="td"><b>Yamaha</b> NMAX 155</td>`, `<td class="td n soluk" style="font-weight:500">89.000,00 ₺</td>`, `<td class="td n">104.000,00 ₺</td>`, `<td class="td n soluk" style="font-weight:500">2.500,00 ₺</td>`, `<td class="td n iyi">6.000,00 ₺</td>`, `<td class="td">havale</td>`, `<td class="td">${c.durum('yesil', 'Kesildi')}</td>`],
        ],
      ),
    }),
  'rapor-is': (c) =>
    raporSayfa(c, 'İş Emirleri', {
      ek: c.sec(190, 'Personel'),
      kartlar: [['Toplam iş emri', '3', 'kirmizi'], ['Servis gelir', '₺6.900,00', 'mavi'], ['Servis maliyet', '₺3.090,00', 'turuncu'], ['Servis kâr', '₺3.810,00', 'yesil']],
      tablo: c.tablo(
        [{ t: '', w: 44 }, { t: 'Tarih', w: 92 }, { t: 'Fiş', w: 60 }, { t: 'Müşteri', w: 120 }, { t: 'Telefon', w: 120 }, { t: 'Marka / Model', w: 150 }, { t: 'KM', w: 80, a: 'r' }, { t: 'Personel', w: 100 }, { t: 'Arıza / Şikâyet' }, { t: 'Gelir', w: 90, a: 'r' }, { t: 'Maliyet', w: 90, a: 'r' }, { t: 'Kâr', w: 90, a: 'r' }],
        [
          ['11.10.2026', c.d === 'a' ? '40' : '#40', 'Caner Aksoy', '0500 538 17 02', 'Honda Activa 125', '35.524 km', 'Kadir Özkan', 'Sabahları marş basmıyor.', '2.400', '1.350', '1.050'],
          ['12.10.2026', c.d === 'a' ? '39' : '#39', 'Serkan Doğan', '0500 612 10 92', 'SYM Jet 14 125', '26.482 km', 'Emre Yıldız', 'Kalkışta titreme ve çekiş kaybı var.', '2.630', '1.020', '1.610'],
          ['11.10.2026', c.d === 'a' ? '38' : '#38', 'Zeynep Yavuz', '0500 560 35 19', 'Mondial Drift L 125', '21.568 km', 'Emre Yıldız', 'Ön frende ses var, fren boşluğu arttı.', '1.870', '720', '1.150'],
        ].map((r) => [gzTd(c), `<td class="td soluk" style="font-size:13px">${r[0]}</td>`, `<td class="td mono soluk" style="font-size:13px">${r[1]}</td>`, `<td class="td"><b>${r[2]}</b></td>`, `<td class="td soluk" style="font-size:13px">${r[3]}</td>`, `<td class="td">${r[4]}</td>`, `<td class="td n soluk" style="font-weight:500">${r[5]}</td>`, `<td class="td" style="font-size:13px">${r[6]}</td>`, `<td class="td" style="font-size:13px">${r[7]}</td>`, `<td class="td n">${r[8]} ₺</td>`, `<td class="td n soluk" style="font-weight:500">${r[9]} ₺</td>`, `<td class="td n iyi">${r[10]} ₺</td>`]),
      ),
    }),
  'rapor-aks': (c) =>
    raporSayfa(c, 'Aksesuar Satışları', {
      kartlar: [['Toplam satış', '2', 'kirmizi'], ['Aksesuar gelir', '₺8.850,00', 'mavi'], ['Aksesuar maliyet', '₺5.750,00', 'turuncu'], ['Aksesuar kâr', '₺3.100,00', 'yesil']],
      tablo: c.tablo(
        [{ t: '', w: 44 }, { t: 'Tarih', w: 96 }, { t: 'Müşteri' }, { t: 'Telefon', w: 140 }, { t: 'Oluşturan', w: 110 }, { t: 'Ödeme şekli', w: 110 }, { t: 'Satış', w: 100, a: 'r' }, { t: 'Maliyet', w: 100, a: 'r' }, { t: 'Kâr', w: 100, a: 'r' }, { t: 'Durum', w: 130 }],
        [['12.10.2026', 'Sinan Kaya', '0500 567 74 58', 'Elif Kara', 'Nakit', '6.400,00', '4.200,00', '2.200,00'], ['03.10.2026', 'Perakende Müşteri', '-', 'Elif Kara', 'Kredi Kartı', '2.450,00', '1.550,00', '900,00']].map((r) => [gzTd(c), `<td class="td soluk" style="font-size:13px">${r[0]}</td>`, `<td class="td"><b>${r[1]}</b></td>`, `<td class="td soluk">${r[2]}</td>`, `<td class="td" style="font-size:13px">${r[3]}</td>`, `<td class="td">${r[4]}</td>`, `<td class="td n">${r[5]} ₺</td>`, `<td class="td n soluk" style="font-weight:500">${r[6]} ₺</td>`, `<td class="td n iyi">${r[7]} ₺</td>`, `<td class="td">${c.durum('yesil', 'Tamamlandı')}</td>`]),
      ),
    }),
  'rapor-eticaret': (c) =>
    raporSayfa(c, 'E-Ticaret', {
      kartlar: [['Toplam satış', '6', 'kirmizi'], ['E-Ticaret gelir', '₺14.640,00', 'mavi'], ['E-Ticaret maliyet', '₺8.180,00', 'turuncu'], ['E-Ticaret kâr', '₺2.301,89', 'yesil']],
      tablo: c.tablo(
        [{ t: '', w: 44 }, { t: 'Tarih', w: 92 }, { t: 'Platform', w: 110 }, { t: 'Ürün' }, { t: 'Adet', w: 50, a: 'r' }, { t: 'Alış', w: 90, a: 'r' }, { t: 'Satış', w: 90, a: 'r' }, { t: 'Kargo', w: 70, a: 'r' }, { t: 'Komisyon', w: 130, a: 'r' }, { t: 'Toplam kesinti', w: 110, a: 'r' }, { t: 'Net kâr', w: 90, a: 'r' }],
        [
          ['12.10.2026', 'Trendyol', 'MT Thunder 4 SV Kask - M', '2.900,00', '5.040,00', '85,00', '1.058,40 (%21)', '1.143,80', '748,01'], ['10.10.2026', 'Trendyol', 'Scoyco JK37 Korumalı Mont - L', '3.100,00', '5.490,00', '85,00', '1.152,90 (%21)', '1.245,93', '870,23'],
          ['08.10.2026', 'Hepsiburada', 'Kask İçi Bone', '120,00', '280,00', '90,00', '60,48 (%18)', '66,38', '2,63'], ['06.10.2026', 'Trendyol', 'Motosiklet Brandası - L', '420,00', '870,00', '85,00', '182,70 (%21)', '197,44', '137,68'],
          ['04.10.2026', 'N11', 'Koruma Demiri - Yamaha NMAX 155', '1.550,00', '2.740,00', '80,00', '383,60 (%14)', '440,90', '553,78'], ['02.10.2026', 'Hepsiburada', 'Jant Şeridi Seti - Kırmızı', '90,00', '220,00', '90,00', '47,52 (%18)', '52,16', '-10,44'],
        ].map((r) => [gzTd(c), `<td class="td soluk" style="font-size:13px">${r[0]}</td>`, `<td class="td"><b>${r[1]}</b></td>`, `<td class="td">${r[2]}</td>`, `<td class="td n soluk">1</td>`, `<td class="td n soluk" style="font-weight:500">${r[3]} ₺</td>`, `<td class="td n">${r[4]} ₺</td>`, `<td class="td n soluk" style="font-weight:500">${r[5]} ₺</td>`, `<td class="td n soluk" style="font-weight:500">${r[6]}</td>`, `<td class="td n">${r[7]} ₺</td>`, `<td class="td n ${r[8].startsWith('-') ? 'kotu' : 'iyi'}">${r[8]} ₺</td>`]),
      ),
    }),
  'rapor-yedek': (c) =>
    raporSayfa(c, 'Yedek Parça', {
      kartlar: [['Toplam ürün', '4', 'kirmizi'], ['Toplam satış değeri', '₺6.720,00', 'mavi'], ['Toplam maliyet', '₺4.310,00', 'turuncu'], ['Potansiyel kâr', '₺2.410,00', 'yesil']],
      tablo: c.tablo(
        [{ t: 'Ürün adı' }, { t: 'Alış fiyatı', w: 130, a: 'r' }, { t: 'Satış fiyatı', w: 130, a: 'r' }, { t: 'Kâr marjı', w: 130, a: 'r' }, { t: 'Kâr oranı', w: 110, a: 'r' }],
        [['Buji NGK CPR8EA-9', '320,00', '580,00', '260,00', '%44.8'], ['Motul 7100 10W-40 Tam Sentetik 1L', '610,00', '890,00', '280,00', '%31.5'], ['Ön Lastik Michelin Pilot Street 110/70-17', '2.600,00', '3.900,00', '1.300,00', '%33.3'], ['Varyatör Kayışı (PCX 125)', '780,00', '1.350,00', '570,00', '%42.2']].map((r) => [`<td class="td"><b>${r[0]}</b></td>`, `<td class="td n soluk" style="font-weight:500">${r[1]} ₺</td>`, `<td class="td n">${r[2]} ₺</td>`, `<td class="td n iyi">${r[3]} ₺</td>`, `<td class="td n">${r[4]}</td>`]),
      ),
    }),
  'rapor-fis': (c) =>
    raporSayfa(c, 'Fiş Kâr Analizi', {
      kartlar: [['Toplam fiş', '3', 'kirmizi'], ['Toplam gelir', '₺6.900,00', 'mavi'], ['Toplam maliyet', '₺3.090,00', 'turuncu'], ['Toplam kâr', '₺3.810,00', 'yesil']],
      tablo: c.tablo(
        [{ t: 'Tarih', w: 100 }, { t: 'Fiş', w: 70 }, { t: 'Müşteri' }, { t: 'Durum', w: 140 }, { t: 'Toplam gelir', w: 120, a: 'r' }, { t: 'Toplam maliyet', w: 130, a: 'r' }, { t: 'Kâr', w: 110, a: 'r' }, { t: 'Kâr oranı', w: 100, a: 'r' }],
        [['11.10.2026', '40', 'Caner Aksoy', '2.400,00', '1.350,00', '1.050,00', '%43.8'], ['12.10.2026', '39', 'Serkan Doğan', '2.630,00', '1.020,00', '1.610,00', '%61.2'], ['11.10.2026', '38', 'Zeynep Yavuz', '1.870,00', '720,00', '1.150,00', '%61.5']].map((r) => [`<td class="td soluk" style="font-size:13px">${r[0]}</td>`, `<td class="td mono" style="font-weight:600">${c.d === 'a' ? r[1] : '#' + r[1]}</td>`, `<td class="td"><b>${r[2]}</b></td>`, `<td class="td">${c.durum('yesil', 'Tamamlandı')}</td>`, `<td class="td n">${r[3]} ₺</td>`, `<td class="td n soluk" style="font-weight:500">${r[4]} ₺</td>`, `<td class="td n iyi">${r[5]} ₺</td>`, `<td class="td n">${r[6]}</td>`]),
      ),
    }),
  'rapor-yatirimci': (c) =>
    raporSayfa(c, 'Yatırımcılar', {
      kartlar: [['Yatırımcı sayısı', '2', 'kirmizi'], ['Toplam stok', '3', 'mavi'], ['Toplam satılan', '1', 'turuncu'], ['Toplam yatırımcı kârı', '₺6.500,00', 'yesil']],
      tablo: c.tablo(
        [{ t: 'Yatırımcı' }, { t: 'Stok adet', w: 100, a: 'r' }, { t: 'Satılan', w: 90, a: 'r' }, { t: 'Stok değeri', w: 150, a: 'r' }, { t: 'Toplam satış', w: 140, a: 'r' }, { t: 'Yatırımcı kârı', w: 140, a: 'r' }, { t: 'İşletme kârı', w: 140, a: 'r' }],
        [['Hakan Demirtaş', 2, 1, '1.256.000,00', '104.000,00', '6.500,00', '6.000,00'], ['Selin Arslan', 1, 0, '1.028.000,00', '0,00', '0,00', '0,00']].map((r) => [`<td class="td"><b>${r[0]}</b></td>`, `<td class="td n soluk">${r[1]}</td>`, `<td class="td n soluk">${r[2]}</td>`, `<td class="td n">${r[3]} ₺</td>`, `<td class="td n">${r[4]} ₺</td>`, `<td class="td n" style="color:${c.d === 'a' ? '#1E4A86' : '#2B6CB0'}">${r[5]} ₺</td>`, `<td class="td n iyi">${r[6]} ₺</td>`]),
      ),
    }),
  'eticaret-platform': (c) => {
    const kpi = c.kpi([['30', 'Satış'], ['₺77.540', 'Gelir'], ['₺12.698,38', 'Komisyon', 'bekle'], ['₺14.708,05', 'Kâr', 'yesil']]);
    const bar = `<section class="bar"><div class="sekme" style="flex:1;border:0"><span>Satışlar</span><span class="on">Platformlar</span></div>${c.btn('Yeni Platform', 'arti')}</section>`;
    const tablo = c.tablo([{ t: 'Platform adı' }, { t: 'Komisyon (%)', w: 160 }, { t: 'KDV (%)', w: 160 }, { t: 'Kargo (₺)', w: 160 }, { t: 'İşlemler', w: 140 }], [['Hepsiburada', '%18.00', '%20.00', '90,00'], ['N11', '%14.00', '%20.00', '80,00'], ['Shopier', '%5.00', '%20.00', '75,00'], ['Trendyol', '%21.00', '%20.00', '85,00']].map((r) => [`<td class="td"><b>${r[0]}</b></td>`, `<td class="td">${r[1]}</td>`, `<td class="td">${r[2]}</td>`, `<td class="td">${r[3]} ₺</td>`, c.islem('duz', 'sil')]));
    return kpi + bar + tablo;
  },
};

// ---------- Formlar (arka planda ilgili sayfa + üstte pencere) ----------
function dlgSayfa(c, arka, { baslik, ikon, w, top = 60, govde, ayak, yukseklik }) {
  const dlg = `<div class="ort"></div><div class="dlg" style="width:${w}px;top:${top}px"><div class="dh">${ikon ? `<span style="width:38px;height:38px;border-radius:8px;background:var(--vurgu);color:#fff;display:inline-flex;align-items:center;justify-content:center">${svg(ikon)}</span>` : ''}<h2>${baslik}</h2></div><div class="db">${govde}</div><div class="df">${ayak}</div></div>`;
  return { govde: arka, ek: dlg, yukseklik };
}
const iptalKaydet = (c, kaydet = 'Kaydet') => c.btn2('İptal') + c.btn(kaydet, 'onay');
const F = (c, e, v, b, s) => c.f(e, v, b, s);

const FORM = {
  'f-aksesuar-satis': (c) => dlgSayfa(c, S1.aksesuarSatisIcerik(c), { baslik: 'Yeni aksesuar satışı', ikon: 'sepet', w: 940, top: 56, yukseklik: 900,
    govde: `<div class="g3">${F(c, 'Ad soyad *', 'Ad Soyad', 1)}${F(c, 'Telefon', 'Telefon', 1)}${F(c, 'Durum', `Beklemede${svg('asagi')}`)}</div><div class="g3">${F(c, 'Ödeme şekli', 'Ödeme Şekli', 1)}${F(c, 'Satış tarihi', `25.10.2026${svg('takvim')}`)}${F(c, 'Ödeme detayları', 'Ödeme Detayları', 1)}</div>${F(c, 'Açıklama', '', 1, 'alan-uzun')}
<div class="bol"><h3>${svg('sepet')}Ürünler<span style="margin-left:auto">${c.btn2('Ürün ekle', 'arti').replace('class="btn2"', 'class="btn2" style="height:34px"')}</span></h3><div class="alan" style="height:44px">${svg('qr')}Barkod okutun veya stok kodu girip Enter'a basın</div>
<div style="display:flex;justify-content:flex-end;align-items:center;gap:16px;margin-top:10px;color:var(--soluk)">Ara toplam: 0 ₺<div style="width:150px">${F(c, 'İndirim (₺)', '₺', 1)}</div></div><div style="text-align:right;margin-top:6px;font-weight:700">Toplam: 0 ₺ <span style="color:var(--iyi);margin-left:12px">Kâr: 0 ₺</span></div></div>
<div class="bol"><h3>${svg('cuzdan')}Kalan ödeme</h3><div class="kutu" style="background:${c.d === 'a' ? '#D8EBDD' : '#D9F2E3'}"><i>${svg('onay')}</i>Ödeme tamamlandı</div></div>`, ayak: iptalKaydet(c) }),
  'f-aksesuar-stok': (c) => dlgSayfa(c, S1.aksesuarStokIcerik(c), { baslik: 'Yeni stok', w: 800, top: 130, yukseklik: 900,
    govde: `<div class="g3">${F(c, 'Stok kodu', '0000000000034')}${F(c, 'Stok adı *', 'Stok Adı', 1)}${F(c, 'Marka', 'Marka', 1)}</div><div class="g2">${F(c, 'Alış fiyatı', 'Alış Fiyatı', 1)}${F(c, 'Satış fiyatı', 'Satış Fiyatı', 1)}</div><div class="g2">${F(c, 'Giren miktar', '0')}${F(c, 'Platform', 'Platform', 1)}</div><div class="g2">${F(c, 'Kategori', `Kategori${svg('asagi')}`, 1)}${F(c, 'Beden', `Beden${svg('asagi')}`, 1)}</div><div class="g2">${F(c, 'Renk', 'Renk', 1)}</div>`,
    ayak: c.btn2('İptal') + c.btn2('Etiket yazdır', 'yaz') + c.btn('Kaydet', 'onay') }),
  'f-eticaret': (c) => dlgSayfa(c, S1.eticaretIcerik(c), { baslik: 'Yeni e-ticaret satışı', ikon: 'magaza', w: 940, top: 150, yukseklik: 900,
    govde: `<div class="g2">${F(c, 'Ürün (stoktan)', `Ürün (Stoktan)${svg('asagi')}`, 1)}${F(c, 'Ürün adı *', 'Ürün Adı', 1)}</div><div class="g3">${F(c, 'Platform', `Platform${svg('asagi')}`, 1)}${F(c, 'Tarih', `25.10.2026${svg('takvim')}`)}${F(c, 'Adet', '1')}</div>
<div class="g4" style="grid-template-columns:repeat(5,1fr)">${F(c, 'Ürün satış fiyatı (₺)', '₺', 1)}${F(c, 'Ürün alış fiyatı (₺)', '₺', 1)}${F(c, 'Komisyon (%)', '%', 1)}${F(c, 'KDV (%)', '20')}${F(c, 'Kargo (₺)', '0')}</div><div style="font-size:13px;color:var(--soluk)">Fiyatlar KDV dahildir.</div>`, ayak: iptalKaydet(c) }),
  'f-yedek-satis': (c) => dlgSayfa(c, S1.yedekSatisIcerik(c), { baslik: 'Yeni yedek parça', ikon: 'disli', w: 760, top: 110, yukseklik: 900,
    govde: `${F(c, '', 'Stoktan sat (ara veya barkod okut)', 1)}${F(c, 'Ürün adı *', 'Ürün Adı', 1)}<div class="g3">${F(c, 'Adet', '1')}${F(c, 'Alış fiyatı (₺)', 'Alış Fiyatı (₺)', 1)}${F(c, 'Satış fiyatı (₺)', 'Satış Fiyatı (₺)', 1)}</div><div class="g2">${F(c, 'Müşteri adı', 'Müşteri Adı', 1)}${F(c, 'Müşteri telefon', 'Müşteri Telefon', 1)}</div>
<div class="kutu" style="background:${c.d === 'a' ? '#D8EBDD' : '#D9F2E3'};justify-content:center;color:var(--iyi)">Kâr: 0 ₺</div><div class="bol"><h3>${svg('cuzdan')}Kalan ödeme</h3><div class="kutu" style="background:${c.d === 'a' ? '#D8EBDD' : '#D9F2E3'}"><i>${svg('onay')}</i>Ödeme tamamlandı</div></div>`, ayak: iptalKaydet(c) }),
  'f-yedek-stok': (c) => dlgSayfa(c, S1.yedekStokIcerik(c), { baslik: 'Yeni yedek parça stoğu', w: 760, top: 180, yukseklik: 900,
    govde: `<div class="g3">${F(c, 'Stok kodu (barkod)', '9000000000028')}${F(c, 'Ürün adı *', 'Ürün Adı', 1)}${F(c, 'Marka', 'Marka', 1)}</div><div class="g2">${F(c, 'Alış fiyatı', 'Alış Fiyatı', 1)}${F(c, 'Satış fiyatı', 'Satış Fiyatı', 1)}</div><div class="g2">${F(c, 'Giren miktar', '0')}</div>`,
    ayak: c.btn2('İptal') + c.btn2('Etiket yazdır', 'yaz') + c.btn('Kaydet', 'onay') }),
  'f-motor-stok': (c) => dlgSayfa(c, S1.motorStokIcerik(c), { baslik: 'Yeni motor ekle', ikon: 'motor', w: 1000, top: 40, yukseklik: 1060,
    govde: `<div class="bol"><h3>${svg('motor')}Motor bilgileri</h3><div class="g3">${F(c, 'Plaka *', 'Plaka', 1)}${F(c, 'Marka *', 'Marka', 1)}${F(c, 'Model', 'Model', 1)}</div><div class="g4" style="margin-top:10px">${F(c, 'Yıl', 'Yıl', 1)}${F(c, 'KM', 'KM', 1)}${F(c, 'Durum', `Stokta${svg('asagi')}`)}${F(c, 'Alım tarihi', `25.10.2026${svg('takvim')}`)}</div><div class="g4" style="margin-top:10px">${F(c, 'Fatura durumu', `Fatura kesilmedi${svg('asagi')}`)}</div></div>
<div class="bol"><h3>${svg('cuzdan')}Fiyat bilgileri</h3><div class="g4">${F(c, 'Alım (₺)', 'Alım (₺)', 1)}${F(c, 'Alış bedeli / noter (₺)', 'Alış Bedeli / Noter (₺)', 1)}${F(c, 'Masraflar (₺)', 'Masraflar (₺)', 1)}${F(c, 'İlan fiyatı (₺)', 'İlan Fiyatı (₺)', 1)}</div><div style="font-size:12.5px;color:var(--soluk);margin-top:6px">Stokta girilen masraf satışta otomatik gelir. İlan fiyatı sitede gösterilir.</div></div>
<div class="bol"><h3>${svg('kisiler')}Yatırımcı</h3><div style="display:flex;align-items:center;gap:10px"><span style="width:20px;height:20px;border:1.5px solid var(--alan-cizgi);border-radius:4px;display:inline-block"></span>Bu motor bir yatırımcıya ait</div></div>
<div class="bol"><h3>${svg('kisi')}Satıcı bilgileri</h3><div class="g2">${F(c, 'İsim soyisim', 'İsim Soyisim', 1)}${F(c, 'TC kimlik', 'TC Kimlik', 1)}</div></div>
<div class="bol"><h3>${svg('globe')}Vitrin / Site bilgileri <span style="font-family:var(--fm);font-size:13px;font-weight:500;color:var(--soluk)">opsiyonel: bu motoru vitrine alırken otomatik dolar</span></h3>${F(c, 'Vitrin başlığı', 'Vitrin Başlığı', 1)}<div style="margin-top:10px">${F(c, 'Vitrin açıklaması', '', 1, 'alan-uzun')}</div></div>`, ayak: iptalKaydet(c) }),
  'f-musteri': (c) => dlgSayfa(c, S1.musterilerIcerik(c), { baslik: 'Yeni müşteri', w: 640, top: 190, yukseklik: 900,
    govde: `${F(c, 'Ad soyad *', 'Ad Soyad', 1)}${F(c, 'Telefon', 'Telefon', 1)}${F(c, 'Adres', '', 1, 'alan-uzun')}`, ayak: iptalKaydet(c) }),
  'f-kullanici': (c) => dlgSayfa(c, S1.kullanicilarIcerik(c), { baslik: 'Yeni kullanıcı / yatırımcı ekle', ikon: 'kisi', w: 680, top: 150, yukseklik: 900,
    govde: `${F(c, 'Rol', `Yatırımcı${svg('asagi')}`)}${F(c, 'Ad soyad *', 'Ad Soyad', 1)}<div class="g2">${F(c, 'Kullanıcı adı *', 'Kullanıcı Adı', 1)}${F(c, 'Şifre (en az 8 karakter) *', 'Şifre', 1)}</div><div class="ipucu">${svg('bilgi')}Yatırımcılar giriş yapınca sadece kendi motorlarını ve raporlarını görür. Personel yetkileri oluşturduktan sonra tabloda ve Yetkilendirme ekranında ayarlanabilir.</div>`, ayak: c.btn2('İptal') + c.btn('Oluştur', 'onay') }),
  'f-vitrin-ilan': (c) => dlgSayfa(c, S1.vitrinYonetim(c), { baslik: 'Yeni ilan: motor satışı', ikon: 'globe', w: 760, top: 30, yukseklik: 1110,
    govde: `${F(c, 'Başlık *', 'Başlık', 1)}${F(c, 'Açıklama', '', 1, 'alan-uzun')}${F(c, 'Fiyat (₺)', 'Fiyat (₺)', 1)}
<div class="bol"><h3>Motor durumu</h3><div style="display:flex;border:1px solid var(--alan-cizgi);border-radius:var(--ar);overflow:hidden;font-weight:700"><span style="flex:1;text-align:center;padding:11px;color:var(--soluk)">Sıfır</span><span style="flex:1;text-align:center;padding:11px;background:var(--yazi);color:var(--zemin)">İkinci el</span></div><div style="font-size:12.5px;color:var(--soluk);margin-top:6px">Sitede müşteri "İkinci el" seçtiğinde bu ilan listelenir.</div></div>
${F(c, 'Stoktan motor seç (opsiyonel)', `Stoktan Motor Seç${svg('asagi')}`, 1)}<div style="font-size:12.5px;color:var(--soluk);margin-top:-12px">Seçersen marka, model, yıl, km ve ilan fiyatı stoktan otomatik gelir. Sen sadece site bilgilerini düzenlersin.</div>
<div class="g2">${F(c, 'Marka', 'Marka', 1)}${F(c, 'Model', 'Model', 1)}</div><div class="g3">${F(c, 'Yıl', 'Yıl', 1)}${F(c, 'Motor (cc)', 'Motor (cc)', 1)}${F(c, 'KM', 'KM', 1)}</div>${F(c, 'Segment *', `Segment${svg('asagi')}`, 1)}
<div class="bol"><h3>${svg('yukle')}Fotoğraflar</h3><div style="border:1.5px dashed var(--alan-cizgi);border-radius:var(--ar);padding:26px;text-align:center;color:var(--soluk)">Fotoğrafları buraya bırakın veya seçin</div></div>`, ayak: iptalKaydet(c) }),
  'f-vitrin-personel': (c) => dlgSayfa(c, S1.vitrinYonetim(c), { baslik: 'Motor satışı: iletişim', ikon: 'telefon', w: 620, top: 150, yukseklik: 900,
    govde: `${F(c, 'Personel adı', 'Burak Aydın')}${F(c, 'Telefon', '0500 663 10 59')}${F(c, '2. personel adı (opsiyonel)', 'Kaan Tekin')}${F(c, '2. personel telefon (opsiyonel)', '0500 707 46 93')}${F(c, 'Not (opsiyonel)', '', 1, 'alan-uzun')}`, ayak: iptalKaydet(c) }),
};

// ---------- Giriş / Kayıt (kabuksuz) ----------
function girisHtml(d, mod) {
  const A = d === 'a';
  const alanlar = mod === 'giris'
    ? [['Kullanıcı adı', 'admin', 1], ['Şifre', '••••••••••', 0]]
    : [['Ad soyad *', '', 0], ['Kullanıcı adı *', '', 0], ['Şifre *', '', 0]];
  const alan = ([e, v, odak]) => `<div style="display:grid;gap:4px"><label style="font-size:13px;font-weight:600;color:${A ? '#5B5F66' : '#5E6670'}">${e}</label><div style="height:46px;border:${odak ? '2px solid ' + (A ? '#1F4FA0' : '#2B6CB0') : '1px solid ' + (A ? '#BFC0B6' : '#C3CAD1')};border-radius:5px;background:#fff;padding:0 14px;display:flex;align-items:center;font-size:16px;color:${v ? '#16181C' : '#9A9EA5'}">${v || e.replace(' *', '')}</div></div>`;
  const sekmeler = `<div style="display:flex;gap:22px;border-bottom:1px solid ${A ? '#D2D3CA' : '#D3D8DD'}">${['Giriş yap', 'Kayıt ol'].map((t, i) => `<span style="padding:8px 2px;font-weight:600;font-size:15px;color:${(i === 0) === (mod === 'giris') ? (A ? '#16181C' : '#1D2228') : '#8A8A82'};border-bottom:3px solid ${(i === 0) === (mod === 'giris') ? '#C62828' : 'transparent'};margin-bottom:-1px">${t}</span>`).join('')}</div>`;
  const govde = `${sekmeler}<div style="display:grid;gap:14px;margin-top:20px">${alanlar.map(alan).join('')}</div><button style="margin-top:22px;width:100%;height:50px;border:0;border-radius:5px;background:${A ? '#C62828' : '#D7261E'};color:#fff;font:700 17px ${A ? "'Barlow'" : "'Barlow Semi Condensed'"},sans-serif">${mod === 'giris' ? 'Giriş yap' : 'Kayıt ol'}</button>${mod === 'kayit' ? `<div style="margin-top:12px;font-size:13.5px;color:#5B5F66">Kaydınız yönetici onayından sonra açılır.</div>` : ''}`;
  const fontlar = A ? 'family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700' : 'family=Chakra+Petch:wght@600;700&family=Barlow+Semi+Condensed:wght@400;500;600;700';
  const kart = A
    ? `<div style="width:440px;background:#FBFBF8;padding:40px 44px 44px;box-shadow:0 18px 46px rgba(20,22,26,.18);position:relative"><div style="position:absolute;left:0;right:0;top:-6px;height:12px;background:radial-gradient(circle at 8px 6px,#E4E5DE 6px,transparent 6.5px) repeat-x;background-size:16px 12px"></div><img src="logo-kirpik.png" alt="Kaynar Motor" style="display:block;width:190px;margin:0 auto 12px"><h1 style="margin:0 0 22px;font-family:'Barlow Condensed';font-size:40px;line-height:1">Servis yönetim sistemi</h1>${govde}</div>`
    : `<div style="width:440px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 18px 46px rgba(20,22,26,.16)"><div style="background:#1D2228;padding:22px 32px;display:flex;align-items:center;justify-content:space-between"><div style="font-family:'Chakra Petch';font-weight:700;font-size:22px;letter-spacing:.06em;color:#fff">KAYNAR <span style="color:#FF4A3D">MOTOR</span></div><i style="width:10px;height:10px;border-radius:50%;background:#FF4A3D;box-shadow:0 0 9px #FF4A3D"></i></div><div style="padding:30px 32px 34px"><h1 style="margin:0 0 20px;font-family:'Chakra Petch';font-size:26px">Servis yönetim sistemi</h1>${govde}</div></div>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontlar}&display=swap"><style>*{box-sizing:border-box}body{margin:0;width:1440px;height:900px;background:${A ? '#E4E5DE' : '#E9ECEF'};display:flex;align-items:center;justify-content:center;font-family:${A ? "'Barlow'" : "'Barlow Semi Condensed'"},sans-serif;color:${A ? '#16181C' : '#1D2228'}}</style></head><body>${kart}</body></html>`;
}

// ---------- Servis geçmişi (müşteriye açık, telefon) ----------
function gecmisHtml(d) {
  const A = d === 'a';
  const T = TON[d];
  const kayit = (tarih, arac, km, ops, top) => `<article style="background:${A ? '#FBFBF8' : '#fff'};border:1px solid ${A ? '#D2D3CA' : '#D3D8DD'};border-radius:${A ? 6 : 10}px;padding:16px;margin-bottom:14px">
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><b style="font-size:17px">${tarih}</b><div style="font-size:13.5px;color:#5B6068">${arac}</div></div>${A ? `<span style="font-size:12.5px;font-weight:700;padding:2px 9px;border:1.5px solid ${T.yesil[0]};color:${T.yesil[0]};background:${T.yesil[1]};border-radius:3px">Tamamlandı</span>` : `<span style="display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600"><i style="width:9px;height:9px;border-radius:50%;background:#2FA564;box-shadow:0 0 6px #2FA564"></i>Tamamlandı</span>`}</div>
<div style="font-size:12.5px;color:#5B6068;margin-top:6px">KM: ${km}</div><div style="border-top:1px ${A ? 'dashed #BFC0B6' : 'solid #E6E9EC'};margin:10px 0"></div>
<ul style="margin:0;padding-left:18px;display:grid;gap:4px;font-size:15px">${ops.map((o) => `<li>${o}</li>`).join('')}</ul><div style="text-align:right;margin-top:10px;font-weight:700;font-size:17px;color:${A ? '#C62828' : '#1D2228'}">Toplam: ₺${top}</div></article>`;
  const fontlar = A ? 'family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700' : 'family=Chakra+Petch:wght@600;700&family=Barlow+Semi+Condensed:wght@400;500;600;700';
  const plaka = A
    ? `<span style="display:inline-flex;align-items:stretch;height:46px;border:2px solid #16181C;border-radius:7px;background:#fff;overflow:hidden;font-family:'Barlow Condensed';font-weight:600;font-size:30px;letter-spacing:.08em"><i style="font-style:normal;background:#1F4FA0;color:#fff;width:22px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px;font-size:9px;font-weight:700;letter-spacing:0">TR</i><span style="display:flex;align-items:center;padding:0 14px">33 KA 1000</span></span>`
    : `<span style="display:inline-block;border:2px solid #1D2228;border-radius:6px;padding:4px 16px;background:#F7F9FA;font-family:'Chakra Petch';font-weight:600;font-size:26px;letter-spacing:.05em">33 KA 1000</span>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontlar}&display=swap"><style>*{box-sizing:border-box}body{margin:0;width:390px;min-height:844px;background:${A ? '#EEEFEB' : '#E9ECEF'};font-family:${A ? "'Barlow'" : "'Barlow Semi Condensed'"},sans-serif;color:${A ? '#16181C' : '#1D2228'};font-variant-numeric:tabular-nums}</style></head><body>
<div style="background:${A ? '#E4E5DE' : '#1D2228'};padding:14px 18px;${A ? 'border-bottom:1px solid #D2D3CA' : ''}">${A ? '<img src="logo-kirpik.png" alt="" style="height:36px;display:block">' : `<div style="font-family:'Chakra Petch';font-weight:700;font-size:18px;letter-spacing:.06em;color:#fff">KAYNAR <span style="color:#FF4A3D">MOTOR</span></div>`}</div>
<div style="padding:18px 16px 28px"><div style="text-align:center;margin-bottom:18px">${plaka}<div style="margin-top:8px;font-size:14px;color:#5B6068">Servis geçmişi</div></div>
${kayit('29.09.2026', 'Honda PCX 125', '18.450', ['Motul 5100 10W-40 Yarı Sentetik 1L', 'Hava Filtresi (PCX / NMAX)', 'Buji NGK CPR8EA-9', 'İşçilik: periyodik bakım'], '2.260')}
${kayit('27.07.2026', 'Honda PCX 125', '16.980', ['Akü YTX7A-BS', 'Marş sistemi kontrolü', 'İşçilik'], '2.400')}
<div style="text-align:center;font-size:13px;color:#5B6068;margin-top:6px">Sorularınız için bize ulaşın, Kaynar Motor Servis</div></div></body></html>`;
}

// ---------- Telefon: servis listesi ----------
function telefonHtml(d) {
  const A = d === 'a';
  const c = S1.ctx(d);
  const fontlar = A ? 'family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700' : 'family=Chakra+Petch:wght@600;700&family=Barlow+Semi+Condensed:wght@400;500;600;700';
  const kart = ([fis, plaka, ad, arac, ton, dur, tarih, top, kar]) => `<article style="background:${A ? '#FBFBF8' : '#fff'};border:1px solid ${A ? '#D2D3CA' : '#D3D8DD'};border-radius:${A ? 6 : 10}px;padding:14px;margin-bottom:12px">
<div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px">${c.durum(ton, dur)}<span class="mono" style="font-size:13px;color:#5B6068">${A ? fis : '#' + fis}</span></span><span style="font-size:13px;color:#5B6068">${tarih}</span></div>
<div style="display:flex;align-items:center;gap:10px;margin-top:10px">${c.plaka(plaka)}<b style="font-size:16px">${ad}</b></div><div style="font-size:14px;color:#5B6068;margin-top:6px">${arac}</div>
<div style="display:flex;align-items:center;margin-top:12px"><b style="font-size:17px">₺${top}</b><span style="margin-left:10px;color:${A ? '#1D6A3B' : '#1F7A4A'};font-weight:600">Kâr ₺${kar}</span><span style="flex:1"></span>${c.ik('goz')}${c.ik('yaz')}${c.ik('duz')}</div></article>`;
  const alt = [['servis', 'Servis', 1], ['motor', 'Motor', 0], ['grafik', 'Raporlar', 0], ['kisiler', 'Müşteriler', 0], ['disli', 'Menü', 0]];
  const renkler = { servis: A ? '#B3261E' : '#FF6B5E', motor: A ? '#B85C1E' : '#FF9F5A', grafik: A ? '#0E7490' : '#46D6F0', kisiler: A ? '#3F51B5' : '#8C9EFF', disli: A ? '#9A6A00' : '#FFC247' };
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontlar}&display=swap"><style>${require('./ortak.cjs').SKIN[d]}${require('./ortak.cjs').CSS}svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}.ik svg{width:17px;height:17px}body{width:390px;min-height:844px;background:var(--zemin);font-family:var(--fm)}</style></head><body>
<div style="background:${A ? '#E4E5DE' : '#1D2228'};padding:12px 16px;display:flex;align-items:center;justify-content:space-between;${A ? 'border-bottom:1px solid #D2D3CA' : ''}">${A ? '<img src="logo-kirpik.png" alt="" style="height:34px">' : `<span style="font-family:'Chakra Petch';font-weight:700;font-size:17px;letter-spacing:.06em;color:#fff">KAYNAR <span style="color:#FF4A3D">MOTOR</span></span>`}<span class="av" style="width:32px;height:32px;${A ? '' : 'background:#2B333B'}">A</span></div>
<div style="padding:14px 16px 96px"><h1 style="margin:0 0 12px;font-family:var(--fh);font-size:${A ? 38 : 28}px">Servis</h1>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">${[['6', 'Açık iş'], ['%87', 'Tamamlanan'], ['₺70.870', 'Kâr']].map(([v, l], i) => `<div class="kart" style="padding:10px 12px"><b style="font-family:var(--fh);font-size:22px;${i === 2 ? 'color:var(--iyi)' : ''}">${v}</b><div style="font-size:12px;color:var(--soluk)">${l}</div></div>`).join('')}</div>
<div style="display:flex;border:1px solid var(--alan-cizgi);border-radius:var(--ar);overflow:hidden;font-weight:600;margin-bottom:10px"><span style="flex:1;text-align:center;padding:10px;color:var(--soluk)">Tümü</span><span style="flex:1;text-align:center;padding:10px;background:var(--yazi);color:var(--zemin)">Açık</span><span style="flex:1;text-align:center;padding:10px;color:var(--soluk)">Tamamlanan</span></div>
<div class="alan" style="margin-bottom:14px;width:100%">${svg('ara')}Müşteri, plaka, fiş no</div>
${kart([46, '33 HN 5764', 'Seda Korkmaz', 'Vespa Primavera 150 · Periyodik bakım', 'bekle', 'Beklemede', '12.10.2026', '2.260', '1.420'])}${kart([45, '33 AFR 206', 'Volkan Uysal', 'Yamaha NMAX 155 · Arka fren tutmuyor', 'bekle', 'Beklemede', '11.10.2026', '1.160', '740'])}${kart([44, '33 VC 6955', 'Gökhan Tekin', 'TVS Apache RTR 200 · Arka fren tutmuyor', 'mavi', 'İşlemde', '10.10.2026', '1.160', '740'])}</div>
<button style="position:fixed;right:16px;bottom:84px;height:50px;border:0;border-radius:${A ? 6 : 25}px;padding:0 20px;background:var(--vurgu);color:#fff;font:700 16px var(--fm);white-space:nowrap;display:flex;align-items:center;gap:8px;box-shadow:0 8px 20px rgba(0,0,0,.25)">${svg('arti')}Yeni iş emri</button>
<nav style="position:fixed;left:0;right:0;bottom:0;height:68px;background:${A ? '#E4E5DE' : '#1D2228'};border-top:1px solid ${A ? '#D2D3CA' : '#1D2228'};display:grid;grid-template-columns:repeat(5,1fr)">${alt.map(([ik, t, on]) => `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:12px;font-weight:${on ? 700 : 500};color:${A ? '#16181C' : on ? '#fff' : '#AEB6BF'}"><span style="color:${renkler[ik]};display:inline-flex">${svg(ik)}</span>${t}</div>`).join('')}</nav></body></html>`;
}

module.exports = { RAPOR, FORM, girisHtml, gecmisHtml, telefonHtml };
