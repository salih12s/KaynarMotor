// Her yönetim sayfasının A/B için içeriği (gerçek yerel verilerle).
const { svg, kabuk, ctx } = require('./ortak.cjs');
const tl = (n) => '₺' + n;

// ----------- veri -----------
const servisSatirlar = [
  [46, '33 HN 5764', 'Seda Korkmaz', 'Vespa Primavera 150', 'bekle', 'Beklemede', '12.10.2026', 'Kadir Özkan', 'Periyodik bakım zamanı geldi.', 2260, 840, 1420],
  [45, '33 AFR 206', 'Volkan Uysal', 'Yamaha NMAX 155', 'bekle', 'Beklemede', '11.10.2026', 'Emre Yıldız', 'Arka fren tutmuyor.', 1160, 420, 740],
  [44, '33 VC 6955', 'Gökhan Tekin', 'TVS Apache RTR 200', 'mavi', 'İşlemde', '10.10.2026', 'Emre Yıldız', 'Arka fren tutmuyor.', 1160, 420, 740],
  [43, '31 FTH 524', 'Sinan Kaya', 'Bajaj Dominar 400', 'mavi', 'İşlemde', '09.10.2026', 'Kadir Özkan', 'Hararet yapıyor, fan geç devreye giriyor.', 1590, 620, 970],
  [42, '31 SD 8146', 'İbrahim Acar', 'RKS Bitter 50', 'mavi', 'İşlemde', '08.10.2026', 'Emre Yıldız', 'Sol sinyal yanmıyor, far zayıf.', 1420, 490, 930],
  [41, '33 ACD 153', 'Murat Polat', 'Yamaha MT-07', 'mavi', 'İşlemde', '06.10.2026', 'Emre Yıldız', 'Satın almadan önce genel kontrol istiyor.', 750, 0, 750],
  [40, '01 BHN 312', 'Caner Aksoy', 'Honda Activa 125', 'yesil', 'Tamamlandı', '04.10.2026', 'Kadir Özkan', 'Sabahları marş basmıyor.', 2400, 1350, 1050],
  [39, '01 TKN 842', 'Serkan Doğan', 'SYM Jet 14 125', 'yesil', 'Tamamlandı', '02.10.2026', 'Emre Yıldız', 'Kalkışta titreme ve çekiş kaybı var.', 2630, 1020, 1610],
  [38, '33 EYS 471', 'Zeynep Yavuz', 'Mondial Drift L 125', 'yesil', 'Tamamlandı', '01.10.2026', 'Emre Yıldız', 'Ön frende ses var, fren boşluğu arttı.', 1870, 720, 1150],
  [37, '33 KA 1000', 'Ahmet Çelik', 'Honda PCX 125', 'yesil', 'Tamamlandı', '29.09.2026', 'Kadir Özkan', 'Periyodik bakım zamanı geldi.', 2260, 840, 1420],
];
const binlik = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function servisIcerik(c) {
  const { d } = c;
  const kolon = [
    { t: 'Fiş', w: 52 }, { t: 'Plaka', w: d === 'a' ? 126 : 118 }, { t: 'Müşteri ve araç', w: 190 }, { t: 'Durum', w: 112 }, { t: 'Personel', w: 92 }, { t: 'Arıza' },
    { t: 'Toplam', w: 76, a: 'r' }, { t: 'Maliyet', w: 72, a: 'r' }, { t: 'Kâr', w: 72, a: 'r' }, { t: 'İşlemler', w: 184 },
  ];
  const satir = servisSatirlar.map((r) => [
    `<td class="td mono soluk" style="font-size:13px">${d === 'a' ? r[0] : '#' + r[0]}</td>`,
    `<td class="td">${c.plaka(r[1])}</td>`,
    `<td class="td"><b>${r[2]}</b><small>${r[3]}</small></td>`,
    `<td class="td">${c.durum(r[4], r[5])}<small>${r[6]}</small></td>`,
    `<td class="td" style="font-size:13px">${r[7]}</td>`,
    `<td class="td" style="font-size:13px;color:var(--soluk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r[8]}</td>`,
    `<td class="td n">${tl(binlik(r[9]))}</td>`,
    `<td class="td n soluk" style="font-weight:500">${tl(binlik(r[10]))}</td>`,
    `<td class="td n iyi">${tl(binlik(r[11]))}</td>`,
    c.islem('goz', 'yaz', 'qr', 'duz', 'sil'),
  ]);
  const kpi = c.kpi([['46', 'Toplam'], ['0', 'Bugün'], ['2', 'Beklemede', 'bekle'], ['4', 'İşlemde', 'mavi'], ['0', 'Ödeme bekl.'], ['40', 'Tamamlandı', 'yesil'], ['0', 'İptal'], ['₺139.400', 'Ciro'], ['₺70.870', 'Kâr', 'yesil']]);
  const bar = `<section class="bar">${c.ara(300, 'Ara (Müşteri, Fiş No, Marka,...)')}${c.sec(150, 'Durum')}${c.tarih(150)}${c.tarih(150)}<span class="bosluk"></span>${c.btn('Yeni İş Emri', 'arti')}</section>`;
  return kpi + bar + c.tablo(kolon, satir);
}

function isEmriFormu(c) {
  const { d, f } = c;
  const govde = servisIcerik(c);
  const dlg = `<div class="ort"></div><div class="dlg" style="width:1130px">
<div class="dh"><span style="width:40px;height:40px;border-radius:8px;background:var(--vurgu);color:#fff;display:inline-flex;align-items:center;justify-content:center">${svg('dosya')}</span><h2>Yeni İş Emri</h2><span class="x">${svg('carpi')}</span></div>
<div class="db" style="grid-template-columns:1fr 1fr;gap:20px 28px;align-items:start">
<div style="display:grid;gap:18px">
<div class="bol"><h3>${svg('kisi')}Müşteri Bilgileri</h3><div class="g2">${f('Ad Soyad *', 'Ad Soyad', 1)}${f('Telefon', 'Telefon', 1)}${f('KM', '<span class="bos">KM</span><span style="color:var(--soluk)">km</span>', 1)}${f('Adres', 'Adres', 1)}</div></div>
<div class="bol"><h3>${svg('motor')}Araç Bilgileri</h3><div class="g4">${f('Plaka', 'Plaka', 1)}${f('Marka', 'Marka', 1)}${f('Model / Tip', 'Model/Tip', 1)}${f('Durum', `Beklemede${svg('asagi')}`)}</div>
<div class="g2" style="margin-top:10px">${f('Tahmini Teslim', `gg.aa.yyyy${svg('takvim')}`, 1)}${f('Tahmini Ücret', '₺', 1)}</div></div>
<div class="bol"><h3>${svg('servis')}Arıza ve Açıklama</h3><div class="g2">${f('Arıza / Şikâyetler', '', 1, 'alan-uzun')}${f('Ek Açıklama', '', 1, 'alan-uzun')}</div></div>
</div>
<div style="display:grid;gap:18px">
<div class="bol"><h3>${svg('dosya')}Parçalar ve İşçilik <span class="ro" style="margin-left:auto;border:1px solid var(--cizgi);color:var(--soluk)">0 parça</span></h3>
<div class="kart" style="padding:12px;display:grid;gap:10px">${f('', 'Takılan Parça / İşçilik (ara veya barkod okut)', 1)}<div class="g3">${f('Adet', '1')}${f('Satış Fiyatı (₺)', '₺ 0')}${f('Maliyet Fiyatı (₺)', '₺ 0')}</div>${c.btn('Parça Ekle', 'arti').replace('class="btn"', 'class="btn" style="justify-content:center"')}</div>
<div class="kart" style="margin-top:10px;padding:18px;text-align:center;color:var(--soluk)">Henüz parça eklenmedi</div></div>
<div class="bol"><h3>${svg('cuzdan')}Ödeme Detayları</h3>${f('', 'Örn: Nakit, Kart...', 1, 'alan-uzun')}</div>
<div class="bol"><h3>${svg('cuzdan')}Kalan Ödeme</h3><div class="kutu" style="background:${d === 'a' ? '#D8EBDD' : '#D9F2E3'}"><i>${svg('onay')}</i>Ödeme Tamamlandı</div></div>
</div></div>
<div class="df">${c.btn2('İptal')}${c.btn('Kaydet', 'onay')}</div></div>`;
  return { govde, ek: dlg, yukseklik: 960 };
}

const motorSatis = [
  ['33 VC 9067', 'Honda', 'Forza 250', 2016, 54790, 161000, 189000, 115000, 130000, 28000, 'Serkan Doğan', '12.10.2026'],
  ['33 ABK 636', 'Yamaha', 'NMAX 155', 2019, 52493, 89000, 104000, 60000, 75000, 12500, 'Ebru Keskin', '11.10.2026'],
  ['33 ACD 689', 'Yamaha', 'Tracer 7', 2022, 33676, 472000, 552000, 330000, 385000, 77500, 'İbrahim Acar', '24.09.2026'],
  ['01 SD 1258', 'KTM', '250 Duke', 2016, 75110, 128000, 148000, 90000, 105000, 10000, 'Merve Şimşek', '15.09.2026'],
  ['33 BGT 795', 'Bajaj', 'Pulsar NS200', 2019, 42231, 76000, 82000, 55000, 55000, 6000, 'Hüseyin Öztürk', '06.09.2026'],
  ['07 BHN 848', 'Mondial', 'Drift L 125', 2022, 21716, 46000, 52000, 30000, 35000, 2500, 'Fatma Akın', '29.08.2026'],
  ['33 ZR 2449', 'Honda', 'PCX 125', 2016, 82160, 80000, 92000, 55000, 65000, 12000, 'Mustafa Bulut', '17.08.2026'],
  ['31 DMR 954', 'Honda', 'CMX500 Rebel', 2019, 31038, 229000, 266000, 160000, 185000, 34500, 'Yusuf Koç', '12.08.2026'],
  ['33 EYS 107', 'Yamaha', 'MT-25', 2022, 29188, 190000, 225000, 135000, 160000, 35000, 'Ahmet Güneş', '02.08.2026'],
  ['33 KA 3640', 'Kawasaki', 'Versys 650', 2016, 39280, 276000, 323000, 195000, 225000, 44500, 'Volkan Kılıç', '24.07.2026'],
  ['33 MB 7213', 'RKS', 'Bitter 50', 2016, 79210, 22000, 25000, 15000, 20000, -2000, 'Volkan Uysal', '08.05.2026'],
];
function motorSatisIcerik(c) {
  const kolon = [
    { t: 'Plaka', w: 126 }, { t: 'Marka / Model', w: 150 }, { t: 'Yıl', w: 46 }, { t: 'KM', w: 62, a: 'r' }, { t: 'Alım', w: 76, a: 'r' }, { t: 'Satış', w: 76, a: 'r' },
    { t: 'Noter Alış', w: 80, a: 'r' }, { t: 'Noter Satış', w: 84, a: 'r' }, { t: 'Kâr', w: 72, a: 'r' }, { t: 'Alıcı', w: 130 }, { t: 'Satış Tarihi', w: 92 }, { t: 'İşlemler', w: 112 },
  ];
  const satir = motorSatis.map((r) => [
    `<td class="td">${c.plaka(r[0])}</td>`, `<td class="td"><b>${r[1]}</b><small>${r[2]}</small></td>`, `<td class="td soluk">${r[3]}</td>`,
    `<td class="td n soluk" style="font-weight:500">${binlik(r[4])}</td>`, `<td class="td n soluk" style="font-weight:500">${binlik(r[5])}</td>`, `<td class="td n">${binlik(r[6])}</td>`,
    `<td class="td n soluk" style="font-weight:500">${binlik(r[7])}</td>`, `<td class="td n soluk" style="font-weight:500">${binlik(r[8])}</td>`,
    `<td class="td n ${r[9] < 0 ? 'kotu' : 'iyi'}">${r[9] < 0 ? '-' : ''}${binlik(Math.abs(r[9]))}</td>`, `<td class="td" style="font-size:13px">${r[10]}</td>`, `<td class="td soluk" style="font-size:13px">${r[11]}</td>`,
    c.islem('goz', 'duz', 'sil'),
  ]);
  const kpi = c.kpi([['34', 'Toplam'], ['₺6.581.000', 'Satış'], ['₺742.000', 'Kâr', 'yesil']]);
  const bar = `<section class="bar">${c.ara(420, 'Plaka, marka, model veya satıcı adı ile ara...')}${c.tarih(150, 'Başlangıç')}${c.tarih(150, 'Bitiş')}<span class="bosluk"></span>${c.btn3('Excel’e Aktar', 'indir')}${c.btn('Motor Satış', 'arti')}</section>`;
  return kpi + bar + c.tablo(kolon, satir);
}
function motorSatisFormu(c) {
  const { f, d } = c;
  const govde = motorSatisIcerik(c);
  const dlg = `<div class="ort"></div><div class="dlg" style="width:1180px;top:36px">
<div class="dh"><span style="width:40px;height:40px;border-radius:8px;background:var(--vurgu);color:#fff;display:inline-flex;align-items:center;justify-content:center">${svg('sepet')}</span><h2>Yeni Motor Satışı</h2><span class="x">${svg('carpi')}</span></div>
<div class="db" style="gap:20px">
<div class="bol"><h3>${svg('motor')}Motor Bilgileri</h3><div class="g4">${f('Plaka', '33 ABK 636')}${f('Marka', 'Yamaha')}${f('Model', 'NMAX 155')}${f('Yıl', '2019')}</div><div class="g4" style="margin-top:10px">${f('KM', '52.493')}${f('Alım Tarihi', `24.09.2026${svg('takvim')}`)}${f('Satış Tarihi', `11.10.2026${svg('takvim')}`)}${f('Durum', `Tamamlandı${svg('asagi')}`)}</div></div>
<div class="bol"><h3>${svg('cuzdan')}Fiyat ve Kâr</h3><div class="g4">${f('Alış Fiyatı (₺)', '89.000')}${f('Satış Fiyatı (₺)', '104.000')}${f('Noter Alış (₺)', '60.000')}${f('Noter Satış (₺)', '75.000')}</div><div class="g4" style="margin-top:10px">${f('Masraflar (₺)', '2.500')}${f('Komisyoncu Tutarı (₺)', '0')}${f('Yatırımcı Kârı (₺)', '0')}<div class="kutu" style="background:${d === 'a' ? '#D8EBDD' : '#D9F2E3'};align-self:end;height:40px;color:#1D6A3B;justify-content:space-between">Kâr<b style="font-size:19px">₺12.500</b></div></div></div>
<div class="g2" style="gap:24px"><div class="bol"><h3>${svg('kisi')}Satıcı</h3><div class="g2">${f('Satıcı Ad Soyad', 'Deniz Özdemir')}${f('Satıcı TC No', '•••••••••••')}</div></div><div class="bol"><h3>${svg('kisi')}Alıcı</h3><div class="g2">${f('Ad Soyad', 'Ebru Keskin')}${f('Telefon', '0500 626 89 70')}</div></div></div>
<div class="bol"><h3>${svg('dosya')}Ödeme ve Belgeler</h3><div class="g4">${f('Ödeme Şekli', `Nakit${svg('asagi')}`)}${f('Kalan Ödeme (₺)', '0')}${f('Yevmiye No', '1042')}<div class="kutu" style="background:${d === 'a' ? '#D8EBDD' : '#D9F2E3'};align-self:end;height:40px"><i>${svg('onay')}</i>Ödeme Tamamlandı</div></div></div>
</div><div class="df">${c.btn2('İptal')}${c.btn('Kaydet', 'onay')}</div></div>`;
  return { govde, ek: dlg, yukseklik: 1080 };
}

const motorStok = [
  ['PLAKASIZ', 'CFMOTO', '250SR', 2026, '-', 229000, 208000, 0, 'CFMOTO Türkiye Distr.', '06.10.2026', 'yesil', 'Stokta'],
  ['PLAKASIZ', 'Honda', 'PCX 125', 2026, '-', 189500, 172000, 0, 'Honda Türkiye Distr.', '02.10.2026', 'yesil', 'Stokta'],
  ['33 BHN 900', 'Yamaha', 'MT-07', 2021, '18.400', 615000, 529000, 370000, 'Caner Yılmaz', '20.09.2026', 'yesil', 'Stokta'],
  ['33 CKL 953', 'Yamaha', 'YZF-R25', 2019, '27.300', 268000, 230000, 160000, 'Hasan Koç', '16.09.2026', 'yesil', 'Stokta'],
  ['33 LP 5494', 'Honda', 'CB650R', 2021, '14.200', 665000, 572000, 400000, 'Tolga Taş', '12.09.2026', 'yesil', 'Stokta'],
  ['33 LP 6550', 'Honda', 'CMX500 Rebel', 2016, '50.390', 270000, 229000, 160000, 'Murat Akın', '03.10.2026', 'bekle', 'Konsinye'],
  ['33 TE 5359', 'Bajaj', 'Pulsar NS200', 2016, '57.530', 80000, 74000, 0, 'Uğur Kılıç', '22.09.2026', 'mavi', 'Kapora'],
  ['01 KRM 162', 'SYM', 'Jet 14 125', 2019, '44.842', 60000, 52000, 35000, 'Ali Uysal', '01.09.2026', 'turuncu', 'Depo / Serviste'],
  ['33 MTR 215', 'Suzuki', 'V-Strom 650', 2022, '15.880', 467500, 401000, 280000, 'Ayşe Aksoy', '06.10.2026', 'mor', 'Devir Bekliyor'],
  ['33 VC 1123', 'CFMOTO', '250SR', 2016, '44.410', 0, 39000, 25000, 'Murat Polat', '07.10.2026', 'kirmizi', 'Perte'],
  ['33 VC 9067', 'Honda', 'Forza 250', 2016, '54.790', 190000, 161000, 115000, 'Murat Polat', '27.08.2026', 'gri', 'Satıldı'],
  ['33 ABK 636', 'Yamaha', 'NMAX 155', 2019, '52.493', 105000, 89000, 60000, 'Deniz Özdemir', '24.09.2026', 'gri', 'Satıldı'],
];
function motorStokIcerik(c) {
  const kolon = [
    { t: 'Plaka', w: 126 }, { t: 'Marka / Model', w: 140 }, { t: 'Yıl', w: 46 }, { t: 'KM', w: 62, a: 'r' }, { t: 'İlan Fiyatı', w: 82, a: 'r' }, { t: 'Alım', w: 76, a: 'r' }, { t: 'Alış Bedeli', w: 80, a: 'r' },
    { t: 'İsim Soyisim', w: 150 }, { t: 'Alım Tarihi', w: 90 }, { t: 'Durum', w: 124 }, { t: 'İşlemler', w: 140 },
  ];
  const satir = motorStok.map((r) => [
    `<td class="td">${c.plaka(r[0])}</td>`, `<td class="td"><b>${r[1]}</b><small>${r[2]}</small></td>`, `<td class="td soluk">${r[3]}</td>`, `<td class="td n soluk" style="font-weight:500">${r[4]}</td>`,
    `<td class="td n" style="color:${c.d === 'a' ? '#1E4A86' : '#2B6CB0'}">${r[5] ? binlik(r[5]) : '0'}</td>`, `<td class="td n soluk" style="font-weight:500">${binlik(r[6])}</td>`, `<td class="td n soluk" style="font-weight:500">${binlik(r[7])}</td>`,
    `<td class="td" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r[8]}</td>`, `<td class="td soluk" style="font-size:13px">${r[9]}</td>`, `<td class="td">${c.durum(r[10], r[11])}</td>`,
    r[11] === 'Satıldı' || r[11] === 'Perte' ? c.islem('goz', 'duz', 'sil') : c.islem('sepet', 'goz', 'duz', 'sil'),
  ]);
  const chips = `<section class="bar" style="flex-wrap:wrap;gap:8px">${c.chip('Toplam: 66', 'gri')}${c.chip('Stokta: 15', 'yesil')}${c.chip('Konsinye: 5', 'bekle')}${c.chip('Kapora: 3', 'mavi')}${c.chip('Depo / Serviste: 2', 'turuncu')}${c.chip('Devir Bekliyor: 4', 'mor')}${c.chip('Perte: 3', 'kirmizi')}${c.chip('Satılan: 34', 'gri')}<span class="bosluk"></span>${c.btn('Motor Ekle', 'arti')}</section>
<section class="bar" style="gap:18px;font-size:13.5px;font-weight:600"><span style="color:var(--iyi)">Fatura ✓ 22</span><span style="color:var(--kotu)">Fatura ✗ 44</span><span style="color:var(--iyi)">Devir ✓ 34</span><span style="color:var(--kotu)">Devir ✗ 4</span><span style="color:var(--iyi)">Ödeme ✓ 63</span><span style="color:var(--kotu)">Ödeme ✗ 3</span></section>`;
  return chips + `<section class="bar">${c.ara(560, 'Plaka, marka, model veya satıcı adı ile ara...')}${c.sec(170, 'Durum')}</section>` + c.tablo(kolon, satir);
}

const aksSatis = [
  ['Sinan Kaya', '0500 567 74 58', 6400, 2200, 'yesil', 'Tamamlandı', '12.10.2026'], ['Ayşe Şahin', '0500 589 92 75', 5520, 2080, 'bekle', 'Beklemede', '09.10.2026'],
  ['Serkan Doğan', '0500 612 10 92', 2370, 980, 'bekle', 'Beklemede', '06.10.2026'], ['Perakende Müşteri', '-', 2450, 900, 'yesil', 'Tamamlandı', '03.10.2026'],
  ['Merve Şimşek', '0500 656 47 26', 5220, 1980, 'bekle', 'Beklemede', '30.09.2026'], ['Barış Güneş', '0500 678 65 43', 9950, 3540, 'yesil', 'Tamamlandı', '27.09.2026'],
  ['Mustafa Bulut', '0500 700 83 60', 1250, 550, 'yesil', 'Tamamlandı', '25.09.2026'], ['Perakende Müşteri', '-', 1180, 580, 'yesil', 'Tamamlandı', '22.09.2026'],
  ['Volkan Kılıç', '0500 745 19 94', 9900, 3500, 'yesil', 'Tamamlandı', '19.09.2026'], ['Hasan Koç', '0500 767 38 11', 700, 320, 'yesil', 'Tamamlandı', '16.09.2026'],
  ['Sinan Polat', '0500 789 56 28', 2040, 910, 'yesil', 'Tamamlandı', '13.09.2026'], ['Perakende Müşteri', '-', 9600, 3380, 'yesil', 'Tamamlandı', '10.09.2026'],
];
function aksesuarSatisIcerik(c) {
  const kolon = [{ t: 'Müşteri' }, { t: 'Telefon', w: 140 }, { t: 'Toplam Satış', w: 110, a: 'r' }, { t: 'Kâr', w: 90, a: 'r' }, { t: 'Oluşturan', w: 110 }, { t: 'Durum', w: 130 }, { t: 'Tarih', w: 110 }, { t: 'İşlemler', w: 130 }];
  const satir = aksSatis.map((r) => [
    `<td class="td"><b>${r[0]}</b></td>`, `<td class="td soluk">${r[1]}</td>`, `<td class="td n">${binlik(r[2])} ₺</td>`, `<td class="td n iyi">${binlik(r[3])} ₺</td>`, `<td class="td" style="font-size:13px">Elif Kara</td>`,
    `<td class="td">${c.durum(r[4], r[5])}</td>`, `<td class="td soluk" style="font-size:13px">${r[6]}</td>`, c.islem('goz', 'duz', 'sil'),
  ]);
  const kpi = c.kpi([['32', 'Toplam'], ['0', 'Bugün'], ['3', 'Beklemede', 'bekle'], ['0', 'İşlemde'], ['29', 'Tamamlandı', 'yesil'], ['0', 'İptal'], ['₺142.640', 'Satış'], ['₺53.050', 'Kâr', 'yesil']]);
  const bar = `<section class="bar">${c.ara(340, 'Ad veya telefon ara...')}${c.tarih(160, 'Başlangıç Tarihi')}${c.tarih(160, 'Bitiş Tarihi')}<span class="bosluk"></span>${c.btn('Yeni Satış', 'arti')}</section>`;
  return kpi + bar + c.tablo(kolon, satir);
}

const aksStok = [
  ['0000000000018', 'Alarmlı Disk Kilidi', 'Oxford', 'Aksesuar', '-', 'Sarı', 480, 890, 10], ['0000000000033', 'Akan LED Sinyal Seti', 'Oxford', 'Yedek Parça', '-', '-', 380, 700, 9],
  ['0000000000026', 'Arka Çanta Demiri - Honda PCX 125', 'MTR', 'Demir', '-', 'Siyah', 900, 1500, 6], ['0000000000022', 'Bar End Ayna Seti', 'Rizoma', 'Aksesuar', '-', 'Siyah', 380, 720, 6],
  ['0000000000013', 'Dizlik Dirseklik Koruma Seti', 'Scoyco', 'Ekipman', '-', 'Siyah', 600, 1100, 9], ['0000000000011', 'Forte GT Yağmurluk Takım - L', 'Forte', 'Ekipman', 'L', 'Neon Sarı', 700, 1250, 7],
  ['0000000000016', 'Givi B32 Bold Arka Çanta', 'Givi', 'Aksesuar', '-', 'Siyah', 3400, 5200, 2], ['0000000000030', 'Jant Şeridi Seti - Mavi', 'Kaynar', 'Sticker', '-', 'Mavi', 90, 200, 0],
  ['0000000000027', 'Karbon Desen Tank Ped', 'Kaynar', 'Tank Ped', '-', 'Karbon', 110, 250, 25], ['0000000000002', 'LS2 FF800 Storm II Kask - L', 'LS2', 'Ekipman', 'L', 'Mat Siyah', 4200, 6400, 4],
  ['0000000000003', 'LS2 FF800 Storm II Kask - XL', 'LS2', 'Ekipman', 'XL', 'Mat Siyah', 4200, 6400, 0], ['0000000000005', 'MT Thunder 4 SV Kask - L', 'MT', 'Ekipman', 'L', 'Beyaz', 2900, 4500, 5],
];
function aksesuarStokIcerik(c) {
  const kolon = [{ t: 'Stok Kodu', w: 130 }, { t: 'Stok Adı' }, { t: 'Marka', w: 80 }, { t: 'Kategori', w: 96 }, { t: 'Beden', w: 56 }, { t: 'Renk', w: 90 }, { t: 'Alış (₺)', w: 76, a: 'r' }, { t: 'Satış (₺)', w: 76, a: 'r' }, { t: 'Mevcut', w: 90 }, { t: 'İşlemler', w: 120 }];
  const satir = aksStok.map((r) => [
    `<td class="td mono soluk" style="font-size:12.5px">${r[0]}</td>`, `<td class="td"><b>${r[1]}</b></td>`, `<td class="td">${r[2]}</td>`, `<td class="td">${r[3]}</td>`, `<td class="td soluk">${r[4]}</td>`, `<td class="td">${r[5]}</td>`,
    `<td class="td n soluk" style="font-weight:500">${binlik(r[6])}</td>`, `<td class="td n">${binlik(r[7])}</td>`, `<td class="td">${r[8] === 0 ? c.durum('kirmizi', 'Tükendi') : `<b style="color:var(--iyi)">${r[8]}</b>`}</td>`, c.islem('yaz', 'duz', 'sil'),
  ]);
  const bar = `<section class="bar">${c.chip('Toplam: 33 ürün', 'gri')}${c.chip('Envanter: ₺174.840', 'yesil')}<span class="bosluk"></span>${c.btn2('İçe Aktar', 'yukle')}${c.btn('Yeni Stok', 'arti')}</section>
<section class="bar">${c.ara(340, 'Stok ara (kod, ad, marka)')}${c.sec(170, 'Kategori')}${c.sec(170, 'Stok Durumu')}</section>`;
  return bar + c.tablo(kolon, satir, { satirSinif: (i) => (aksStok[i][8] === 0 ? 'uyari' : '') });
}

const eticaret = [
  ['MT Thunder 4 SV Kask - M', 'Trendyol', 1, '2.900,00', '5.040,00', '%21', '1.058,40', '748,01', '12.10.2026'], ['Scoyco JK37 Korumalı Mont - L', 'Trendyol', 1, '3.100,00', '5.490,00', '%21', '1.152,90', '870,23', '10.10.2026'],
  ['Kask İçi Bone', 'Hepsiburada', 1, '120,00', '280,00', '%18', '60,48', '2,63', '08.10.2026'], ['Motosiklet Brandası - L', 'Trendyol', 1, '420,00', '870,00', '%21', '182,70', '137,68', '06.10.2026'],
  ['Koruma Demiri - Yamaha NMAX 155', 'N11', 1, '1.550,00', '2.740,00', '%14', '383,60', '553,78', '04.10.2026'], ['Jant Şeridi Seti - Kırmızı', 'Hepsiburada', 1, '90,00', '220,00', '%18', '47,52', '-10,44', '02.10.2026'],
  ['LS2 FF800 Storm II Kask - M', 'Shopier', 1, '4.200,00', '7.170,00', '%5', '358,50', '2.113,75', '30.09.2026'], ['Scoyco MC29 Eldiven - M', 'Trendyol', 1, '650,00', '1.290,00', '%21', '270,90', '215,64', '28.09.2026'],
  ['Forte GT Yağmurluk Takım - L', 'Trendyol', 1, '700,00', '1.400,00', '%21', '294,00', '244,59', '26.09.2026'], ['Givi B32 Bold Arka Çanta', 'Hepsiburada', 1, '3.400,00', '5.820,00', '%18', '1.257,12', '783,73', '24.09.2026'],
  ['Reflektif Sticker Seti', 'Hepsiburada', 1, '70,00', '180,00', '%18', '38,88', '-19,15', '18.09.2026'],
];
function eticaretIcerik(c) {
  const kolon = [{ t: 'Ürün' }, { t: 'Platform', w: 110 }, { t: 'Adet', w: 50, a: 'r' }, { t: 'Alış (₺)', w: 84, a: 'r' }, { t: 'Satış (₺)', w: 84, a: 'r' }, { t: 'Komisyon', w: 76, a: 'r' }, { t: 'KDV', w: 48, a: 'r' }, { t: 'Komisyon (₺)', w: 96, a: 'r' }, { t: 'Kâr (₺)', w: 90, a: 'r' }, { t: 'Tarih', w: 92 }, { t: 'İşlemler', w: 120 }];
  const satir = eticaret.map((r) => [
    `<td class="td"><b>${r[0]}</b></td>`, `<td class="td">${r[1]}</td>`, `<td class="td n soluk">${r[2]}</td>`, `<td class="td n soluk" style="font-weight:500">${r[3]}</td>`, `<td class="td n">${r[4]}</td>`, `<td class="td n soluk" style="font-weight:500">${r[5]}</td>`,
    `<td class="td n soluk" style="font-weight:500">%20</td>`, `<td class="td n soluk" style="font-weight:500">${r[6]}</td>`, `<td class="td n ${r[7].startsWith('-') ? 'kotu' : 'iyi'}">${r[7]}</td>`, `<td class="td soluk" style="font-size:13px">${r[8]}</td>`, c.islem('goz', 'duz', 'sil'),
  ]);
  const kpi = c.kpi([['30', 'Satış'], ['₺77.540', 'Gelir'], ['₺12.698,38', 'Komisyon', 'bekle'], ['₺14.708,05', 'Kâr', 'yesil']]);
  const bar = `<section class="bar"><div class="sekme" style="flex:1;border:0"><span class="on">Satışlar</span><span>Platformlar</span></div>${c.sec(190, 'Platform Filtre')}${c.btn('Yeni Satış', 'arti')}</section>`;
  return kpi + bar + c.tablo(kolon, satir);
}

function taksitIcerik(c) {
  const { f, d } = c;
  const nakit = 665000, pesin = 100000, kalan = nakit - pesin;
  const oranlar = [[3, 0.9], [6, 0.83], [9, 0.78], [12, 0.73]];
  const sonuc = oranlar.map(([ay, o]) => ({ ay, toplam: kalan / o, aylik: kalan / o / ay }));
  const para = (n) => binlik(Math.round(n)) + ' ₺';
  const kartlar = sonuc.map((s, i) => `<div class="kart" style="padding:18px 20px;${d === 'a' ? 'border-left:4px solid #C62828' : 'border-top:3px solid #D7261E'}"><div style="font-family:var(--fh);font-size:30px;font-weight:700">${s.ay} Ay</div>
<div style="display:flex;justify-content:space-between;margin-top:10px;color:var(--soluk)">Aylık<b style="color:var(--yazi);font-size:22px;font-family:var(--fh)">${para(s.aylik)}</b></div>
<div style="display:flex;justify-content:space-between;margin-top:6px;color:var(--soluk)">Toplam<b style="color:var(--yazi)">${para(s.toplam)}</b></div></div>`).join('');
  return `<div style="max-width:900px;margin:0 auto;width:100%;display:grid;gap:16px">
<div><div style="color:var(--soluk);margin-top:4px">Nakit fiyat girerek 3, 6, 9 ve 12 ay taksitli ödeme seçeneklerini hesaplayabilirsiniz.</div></div>
<div class="kart" style="padding:20px"><div class="g2">${f('Nakit Fiyat', `₺ 665.000`)}${f('Peşinat / Peşin Ödeme', '₺ 100.000')}</div><div style="color:var(--soluk);font-size:13px;margin:6px 0 14px">İsteğe bağlı: boş bırakılırsa nakit fiyat üzerinden hesaplanır</div><div style="display:flex;gap:10px">${c.btn('Hesapla', 'hesap')}${c.btn2('Temizle', 'carpi')}</div></div>
<div class="g4" style="grid-template-columns:repeat(4,1fr);gap:14px">${kartlar}</div>
<div class="ipucu">${svg('bilgi')}Peşinat sonrası kalan ${para(kalan)} üzerinden hesaplandı.</div></div>`;
}

const yedekSatis = [
  ['Akü YTX7A-BS', 1350, 2150, 'Ali Uysal', '0500 796 95 67', 800, null], ['Akü YTX9-BS', 1650, 2600, '-', '-', 950, null], ['Amortisör Yağı 10W 1L', 380, 640, '-', '-', 260, null],
  ['Antifriz Motocool Expert 1L (x3)', 930, 1560, '-', '-', 630, null], ['Arka Lastik Michelin Pilot Street 140/70-17', 3300, 4900, '-', '-', 1600, null], ['Buji NGK CPR8EA-9 (x2)', 320, 580, 'Erdem Bozkurt', '0500 663 86 65', 260, null],
  ['Debriyaj Balatası Seti', 1100, 1900, 'Hasan Koç', '0500 767 38 11', 800, null], ['Debriyaj Teli (x3)', 570, 1140, 'Fatma Akın', '0500 686 04 82', 570, 550], ['Far Ampulü H4 (x2)', 460, 900, 'Ahmet Güneş', '0500 730 41 16', 440, null],
  ['Fren Hidroliği DOT4 500 ml (x3)', 720, 1260, 'Gizem Taş', '0500 723 01 77', 540, null], ['Varyatör Kayışı (NMAX 155)', 820, 1400, 'Deniz Bulut', '0500 752 59 33', 580, 700], ['Zincir Dişli Seti DID 520', 2900, 4600, 'Oğuz Yılmaz', '0500 708 22 99', 1700, null],
];
function yedekSatisIcerik(c) {
  const kolon = [{ t: 'Ürün Adı' }, { t: 'Alış (₺)', w: 80, a: 'r' }, { t: 'Satış (₺)', w: 80, a: 'r' }, { t: 'Müşteri', w: 140 }, { t: 'Telefon', w: 130 }, { t: 'Kâr (₺)', w: 80, a: 'r' }, { t: 'Ödeme Durumu', w: 140 }, { t: 'İşlemler', w: 90 }];
  const satir = yedekSatis.map((r) => [
    `<td class="td"><b>${r[0]}</b></td>`, `<td class="td n soluk" style="font-weight:500">${binlik(r[1])}</td>`, `<td class="td n">${binlik(r[2])}</td>`, `<td class="td" style="font-size:13px">${r[3]}</td>`, `<td class="td soluk" style="font-size:13px">${r[4]}</td>`,
    `<td class="td n iyi">${binlik(r[5])}</td>`, `<td class="td">${r[6] ? c.durum('turuncu', 'Kalan: ₺' + binlik(r[6])) : c.durum('yesil', 'Tamamlandı')}</td>`, c.islem('duz', 'sil'),
  ]);
  const bar = `<section class="bar">${c.chip('Toplam: 22', 'gri')}<span class="bosluk"></span>${c.btn('Yeni Parça', 'arti')}</section><section class="bar">${c.ara(500, 'Parça ara...')}</section>`;
  return bar + c.tablo(kolon, satir);
}

const yedekStok = [
  ['9000000000016', 'Akü YTX7A-BS', 'Yuasa', 1350, 2150, 3], ['9000000000015', 'Akü YTX9-BS', 'Yuasa', 1650, 2600, 0], ['9000000000027', 'Amortisör Yağı 10W 1L', 'Motul', 380, 640, 6],
  ['9000000000021', 'Antifriz Motocool Expert 1L', 'Motul', 310, 520, 9], ['9000000000009', 'Arka Fren Balatası EBC FA174', 'EBC', 420, 760, 11], ['9000000000018', 'Arka Lastik Michelin Pilot Street 140/70-17', 'Michelin', 3300, 4900, 3],
  ['9000000000007', 'Buji NGK CPR8EA-9', 'NGK', 160, 290, 24], ['9000000000006', 'Buji NGK CR8E', 'NGK', 140, 260, 26], ['9000000000023', 'Debriyaj Balatası Seti', 'EBC', 1100, 1900, 2],
  ['9000000000025', 'Far Ampulü H4', 'Philips', 230, 450, 14], ['9000000000001', 'Motul 5100 10W-40 Yarı Sentetik 1L', 'Motul', 420, 620, 34], ['9000000000010', 'Zincir Dişli Seti DID 520', 'DID', 2900, 4600, 1],
];
function yedekStokIcerik(c) {
  const kolon = [{ t: 'Stok Kodu', w: 140 }, { t: 'Stok Adı' }, { t: 'Marka', w: 100 }, { t: 'Alış (₺)', w: 90, a: 'r' }, { t: 'Satış (₺)', w: 90, a: 'r' }, { t: 'Mevcut', w: 110 }, { t: 'İşlemler', w: 120 }];
  const satir = yedekStok.map((r) => [
    `<td class="td mono soluk" style="font-size:12.5px">${r[0]}</td>`, `<td class="td"><b>${r[1]}</b></td>`, `<td class="td">${r[2]}</td>`, `<td class="td n soluk" style="font-weight:500">${binlik(r[3])}</td>`, `<td class="td n">${binlik(r[4])}</td>`,
    `<td class="td">${r[5] === 0 ? c.durum('kirmizi', 'Tükendi') : r[5] <= 3 ? c.durum('bekle', r[5] + ' adet') : `<b style="color:var(--iyi)">${r[5]}</b>`}</td>`, c.islem('yaz', 'duz', 'sil'),
  ]);
  const bar = `<section class="bar">${c.chip('Toplam: 27 ürün', 'gri')}${c.chip('Envanter: ₺129.860', 'yesil')}<span class="bosluk"></span>${c.btn2('İçe Aktar', 'yukle')}${c.btn('Yeni Stok', 'arti')}</section><section class="bar">${c.ara(340, 'Stok ara (kod, ad, marka)')}${c.sec(170, 'Stok Durumu')}</section>`;
  return bar + c.tablo(kolon, satir, { satirSinif: (i) => (yedekStok[i][5] === 0 ? 'uyari' : '') });
}

function vitrinYonetim(c) {
  const { d } = c;
  const ilanlar = [
    ['5', 'ILN-0005', 'foto1', 'İkinci El', 'Naked', '689 cc', 'Yamaha MT-07 2021 – 18.400 km', 'Yamaha MT-07 2021 · 18.400 km', '615.000', true],
    ['6', 'ILN-0006', 'foto2', 'İkinci El', 'Racing', '249 cc', 'Yamaha YZF-R25 2019 – Bakımları Yeni', 'Yamaha YZF-R25 2019 · 27.300 km', '268.000', false],
    ['7', 'ILN-0007', 'foto3', 'İkinci El', 'Naked', '649 cc', 'Honda CB650R 2021 – Neo Sports Café', 'Honda CB650R 2021 · 14.200 km', '665.000', false],
    ['8', 'ILN-0008', '', 'İkinci El', 'Naked', '948 cc', 'Kawasaki Z900 2022 – 11.800 km', 'Kawasaki Z900 2022 · 11.800 km', '845.000', true],
  ];
  const kart = ilanlar.map((i) => `<article class="kart" style="overflow:hidden;display:flex;flex-direction:column">
<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--cizgi)"><span style="font-size:12.5px;color:var(--soluk)">Sıra</span><div class="f" style="flex:0 0 56px"><div class="in" style="height:32px">${i[0]}</div></div><span class="bosluk" style="flex:1"></span><button class="btn" style="height:32px;font-size:13px;padding:0 12px">Değiştir</button></div>
${i[2] ? `<img src="${i[2]}.jpg" alt="" style="display:block;width:100%;height:150px;object-fit:cover">` : `<div style="height:150px;background:var(--th);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--soluk)">${svg('motor').replace('<svg', '<svg style="width:34px;height:34px"')}<span style="font-size:13px">Fotoğraf yok</span></div>`}
<div style="padding:12px;display:grid;gap:7px;flex:1"><div style="font-size:12.5px;color:var(--soluk)">İlan No: ${i[1]}</div>
<div style="display:flex;gap:5px;flex-wrap:wrap">${c.rozet('gri', i[3])}${i[9] ? c.rozet('turuncu', '★ Öne Çıkan') : ''}${c.rozet('yesil', 'Stok bağlı')}${c.rozet('kirmizi', i[4])}${c.rozet('gri', i[5])}</div>
<div style="font-weight:700;font-size:15px;line-height:1.25">${i[6]}</div><div style="font-size:13px;color:var(--soluk)">${i[7]}</div>
<div style="font-family:var(--fh);font-size:26px;font-weight:700;color:var(--vurgu)">${i[8]} ₺</div></div>
<div style="padding:0 12px 12px;display:grid;gap:8px"><button class="btn2" style="height:34px;justify-content:center;font-size:13px">${svg('gizle')}Yayından Kaldır</button><div style="display:flex;align-items:center">${c.ik('duz')}${c.ik('sil')}<span style="flex:1"></span>${c.ik('yukari')}${c.ik('asagi')}</div></div></article>`).join('');
  return `<div class="sekme"><span class="on">Motor Satışı</span><span>Aksesuar</span><span>Yedek Parça</span><span>Bakım / Servis</span><span>Nakliye / Yol Kurtarma</span><span>Araç Sigortası</span></div>
<section class="kart" style="padding:14px 18px;display:flex;align-items:center;gap:16px"><div style="font-size:14px;line-height:1.55"><span style="color:var(--soluk)">Bu kategori için iletişim</span><br><b>Burak Aydın</b> · 0500 663 10 59<br><b>Kaan Tekin</b> · 0500 707 46 93</div><span style="flex:1"></span>${c.btn2('Personel / Telefon', 'telefon')}${c.btn('İlan Ekle', 'arti')}</section>
<section class="bar">${c.ara(760, 'İlan ara: başlık, marka, model, ilan no...')}<span style="flex:1"></span>${c.chip('Yayında (15)', 'yesil')}${c.chip('Arşiv (2)', 'gri')}</section>
<div class="ipucu">${svg('bilgi')}Kartın üstündeki sıra numarasını yazıp Değiştir düğmesine basın.</div>
<section style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${kart}</section>`;
}

function veresiyeIcerik(c) {
  const { d } = c;
  const kutu = (l, v, ton) => {
    const [fg, bg] = c.T[ton];
    return `<div class="kart" style="padding:14px 18px;background:${d === 'a' ? bg : '#fff'};${d === 'b' ? `border-top:3px solid ${LEDX[ton]}` : ''}"><div style="font-size:13px;color:var(--soluk)">${l}</div><div style="font-family:var(--fh);font-size:28px;font-weight:700;color:${fg};margin-top:2px">${v}</div></div>`;
  };
  const LEDX = { kirmizi: '#E0453A', mavi: '#2B6CB0', yesil: '#2FA564', mor: '#8A63D2' };
  const satirlar = [
    ['mavi', 'Servis', 'servis', 'Ahmet Çelik', '0500 508 59 46', 'Fiş #37 · Honda PCX 125', '30.09.2026', 2260, 1150], ['mor', 'Yedek Parça', 'disli', 'Fatma Akın', '0500 686 04 82', 'Debriyaj Teli', '28.09.2026', 1140, 550],
    ['yesil', 'Aksesuar', 'sepet', 'Mustafa Bulut', '0500 700 83 60', 'Forte GT Yağmurluk Takım - XL', '25.09.2026', 1250, 500], ['kirmizi', 'Motor Satış', 'motor', 'İbrahim Acar', '0500 641 68 48', '33 ACD 689 Yamaha Tracer 7', '24.09.2026', 552000, 83000],
    ['mavi', 'Servis', 'servis', 'Ebru Keskin', '0500 626 89 70', 'Fiş #32 · Yamaha XMAX 250', '18.09.2026', 6800, 3400], ['yesil', 'Aksesuar', 'sepet', 'Volkan Uysal', '0500 523 38 24', 'LS2 FF800 Storm II Kask - L, Dizlik Dirseklik...', '01.09.2026', 9850, 3950],
    ['mavi', 'Servis', 'servis', 'Ayşe Şahin', '0500 589 92 75', 'Fiş #24 · Kuba Çita 180R', '29.08.2026', 1870, 950], ['mor', 'Yedek Parça', 'disli', 'Deniz Bulut', '0500 752 59 33', 'Varyatör Kayışı (NMAX 155)', '29.08.2026', 1400, 700],
    ['kirmizi', 'Motor Satış', 'motor', 'Volkan Kılıç', '0500 745 19 94', '33 KA 3640 Kawasaki Versys 650', '24.07.2026', 323000, 48000], ['kirmizi', 'Motor Satış', 'motor', 'Ahmet Çelik', '0500 508 59 46', '31 ABK 584 TVS Apache RTR 200', '15.05.2026', 104000, 16000],
  ];
  const kolon = [{ t: 'Kaynak', w: 140 }, { t: 'Müşteri', w: 150 }, { t: 'Telefon', w: 140 }, { t: 'Açıklama' }, { t: 'Tarih', w: 100 }, { t: 'Toplam', w: 90, a: 'r' }, { t: 'Kalan Borç', w: 100, a: 'r' }, { t: 'İşlemler', w: 100 }];
  const satir = satirlar.map((r) => [
    `<td class="td"><span class="ro" style="color:${c.T[r[0]][0]};background:${c.T[r[0]][1]};display:inline-flex;align-items:center;gap:6px">${svg(r[2]).replace('<svg', '<svg style="width:14px;height:14px"')}${r[1]}</span></td>`,
    `<td class="td"><b>${r[3]}</b></td>`, `<td class="td soluk">${r[4]}</td>`, `<td class="td" style="font-size:13.5px">${r[5]}</td>`, `<td class="td soluk" style="font-size:13px">${r[6]}</td>`,
    `<td class="td n soluk" style="font-weight:500">₺${binlik(r[7])}</td>`, `<td class="td n kotu">₺${binlik(r[8])}</td>`, c.islem('goz', 'disari'),
  ]);
  return `<section style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px">${kutu('Toplam Borç', '₺163.150', 'kirmizi')}${kutu('Motor Satış', '₺147.000', 'kirmizi')}${kutu('Servis', '₺6.700', 'mavi')}${kutu('Aksesuar', '₺8.200', 'yesil')}${kutu('Yedek Parça', '₺1.250', 'mor')}</section>
<section class="bar">${c.ara(480, 'Müşteri, telefon veya açıklama ara...')}${c.sec(200, 'Kaynak: Tümü')}<span class="bosluk"></span>${c.chip('12 kayıt', 'gri')}</section>` + c.tablo(kolon, satir);
}

function musterilerIcerik(c) {
  const m = [
    ['Büşra Güler', '0500 856 10 79', 'Merkez Mah. 2939. Sk. No:44 D:6, Erdemli/Mersin'], ['Ebru Kurt', '0500 848 71 40', 'Şehitishak Mah. 2902. Sk. No:39 D:5, Tarsus/Mersin'], ['Gökhan Kaya', '0500 841 32 01', 'Kiremithane Mah. 2865. Sk. No:34 D:4, Akdeniz/Mersin'],
    ['Serkan Yavuz', '0500 833 92 62', 'Çilek Mah. 2828. Sk. No:29 D:3, Akdeniz/Mersin'], ['Mehmet Aslan', '0500 826 53 23', 'Akbelen Mah. 2791. Sk. No:24 D:2, Toroslar/Mersin'], ['Seda Ateş', '0500 819 13 84', 'Halkkent Mah. 2754. Sk. No:19 D:1, Toroslar/Mersin'],
    ['Ayşe Aksoy', '0500 811 74 45', 'Menderes Mah. 2717. Sk. No:14 D:14, Mezitli/Mersin'], ['Kerem Özdemir', '0500 804 35 06', 'Davultepe Mah. 2680. Sk. No:9 D:13, Mezitli/Mersin'], ['Ali Uysal', '0500 796 95 67', 'Viranşehir Mah. 2643. Sk. No:4 D:12, Mezitli/Mersin'],
    ['Sinan Polat', '0500 789 56 28', 'Pozcu Mah. 2606. Sk. No:47 D:11, Yenişehir/Mersin'], ['Zeynep Çelik', '0500 782 16 89', 'Limonluk Mah. 2569. Sk. No:42 D:10, Yenişehir/Mersin'], ['Tolga Taş', '0500 774 77 50', 'Güvenevler Mah. 2532. Sk. No:37 D:9, Yenişehir/Mersin'],
  ];
  const kolon = [{ t: 'Ad Soyad', w: 220 }, { t: 'Telefon', w: 170 }, { t: 'Adres' }, { t: 'İşlemler', w: 130 }];
  const satir = m.map((r) => [`<td class="td"><b>${r[0]}</b></td>`, `<td class="td soluk">${r[1]}</td>`, `<td class="td" style="font-size:13.5px">${r[2]}</td>`, c.islem('goz', 'duz', 'sil')]);
  return `<section class="bar">${c.ara(560, 'Müşteri ara (ad, telefon)')}<span class="bosluk"></span>${c.chip('Toplam: 50 müşteri', 'gri')}${c.btn('Yeni Müşteri', 'arti')}</section>` + c.tablo(kolon, satir);
}

function belgeIcerik(c) {
  const { d } = c;
  const belge = [['33 VC 9067', 'Honda Forza 250', '27.08.2026', '12.10.2026', 'satis-sozlesmesi-33VC9067.pdf', '12.10.2026'], ['33 ABK 636', 'Yamaha NMAX 155', '24.09.2026', '11.10.2026', 'satis-sozlesmesi-33ABK636.pdf', '11.10.2026'], ['33 ACD 689', 'Yamaha Tracer 7', '22.08.2026', '24.09.2026', 'satis-sozlesmesi-33ACD689.pdf', '24.09.2026']];
  const kartlar = belge.map((b) => `<article class="kart" style="overflow:hidden"><div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--cizgi)">${c.plaka(b[0])}<span style="color:var(--soluk)">${b[1]}</span><span style="flex:1"></span><span style="font-size:12.5px;color:var(--soluk)">Alış ${b[2]} · Satış ${b[3]}</span>${c.rozet('yesil', 'Satıldı')}</div>
<div style="display:flex;align-items:center;gap:14px;padding:12px 16px"><span style="width:38px;height:38px;border-radius:8px;background:${c.T.kirmizi[1]};color:${c.T.kirmizi[0]};display:inline-flex;align-items:center;justify-content:center">${svg('dosya')}</span><div><div style="font-weight:700;font-size:14.5px">${b[4]}</div><div style="font-size:12.5px;color:var(--soluk)">1 KB · ${b[5]}</div></div><span style="flex:1"></span>${c.ik('goz')}${c.ik('indir')}</div></article>`).join('');
  return `<div style="max-width:880px;margin:0 auto;width:100%;display:grid;gap:14px"><div><div style="color:var(--soluk);margin-top:4px">Motorlara eklenen tüm belgeler plakaya göre listelenir.</div></div>
<div class="alan" style="height:44px">${svg('ara')}Plaka, marka veya dosya adı ara</div>
<div class="bar"><div style="display:flex;border:1px solid var(--alan-cizgi);border-radius:var(--ar);overflow:hidden;font-weight:600;font-size:13.5px"><span style="padding:10px 14px;background:var(--yazi);color:var(--zemin)">Satış Tarihi</span><span style="padding:10px 14px;color:var(--soluk)">Alış Tarihi</span></div>${c.tarih(170, 'Satış ayı')}</div>
<div style="font-size:13px;color:var(--soluk)">3 araç · 3 dosya</div>${kartlar}</div>`;
}

function kullanicilarIcerik(c) {
  const k = [['Tarayıcı Testi', 'tarayici_test', 'personel', 'onay'], ['Onur Çelik', 'yeni.personel', 'personel', 'bekle'], ['Selin Arslan', 'yatirimci2', 'yatırımcı', 'onay'], ['Hakan Demirtaş', 'yatirimci1', 'yatırımcı', 'onay'], ['Elif Kara', 'aksesuar', 'personel', 'onay'],
    ['Kaan Tekin', 'satis2', 'personel', 'onay'], ['Burak Aydın', 'satis', 'personel', 'onay'], ['Kadir Özkan', 'usta', 'personel', 'onay'], ['Emre Yıldız', 'servis', 'personel', 'onay'], ['Admin', 'admin', 'admin', 'onay']];
  const kolon = [{ t: 'Ad Soyad', w: 250 }, { t: 'Kullanıcı Adı', w: 220 }, { t: 'Rol', w: 160 }, { t: 'Durum', w: 190 }, { t: 'İşlemler' }];
  const satir = k.map((r) => [
    `<td class="td"><b>${r[0]}</b></td>`, `<td class="td mono soluk" style="font-size:13px">${r[1]}</td>`, `<td class="td">${r[2] === 'admin' ? c.rozet('kirmizi', 'admin') : r[2] === 'yatırımcı' ? c.rozet('mor', 'yatırımcı') : c.rozet('gri', 'personel')}</td>`,
    `<td class="td">${r[3] === 'bekle' ? c.durum('bekle', 'Onay bekliyor') : c.durum('yesil', 'Onaylandı')}</td>`,
    r[3] === 'bekle' ? c.islem('onay', 'carpi', 'kilit', 'sil') : r[2] === 'admin' ? c.islem('kilit') : c.islem('kilit', 'sil'),
  ]);
  return `<section class="bar"><h2 style="margin:0;font-family:var(--fh);font-size:30px">Kullanıcı Yönetimi</h2><span class="bosluk"></span>${c.btn('Kullanıcı / Yatırımcı Ekle', 'arti')}</section>
<div class="ipucu">${svg('bilgi')}Personel yetkilerini (Motor Satış, Servis, Aksesuar vb.) <b>Yetkilendirme</b> sayfasından ayarlayabilirsiniz.</div>` + c.tablo(kolon, satir);
}

function yetkiIcerik(c) {
  const { d } = c;
  const sutun = ['Motor Satış', 'Aksesuar Satış', 'Aksesuar Stok', 'Yedek Parça', 'Servis', 'E-Ticaret', 'Motor Vitrini', 'Aksesuar Vitrini'];
  const kisi = [['Tarayıcı Testi', 'tarayici_test', [4]], ['Onur Çelik', 'yeni.personel', []], ['Elif Kara', 'aksesuar', [1, 2, 5, 7]], ['Kaan Tekin', 'satis2', [0]], ['Burak Aydın', 'satis', [0, 6]], ['Kadir Özkan', 'usta', [4]], ['Emre Yıldız', 'servis', [3, 4]]];
  const tgl = (acik) => `<span style="display:inline-block;width:40px;height:22px;border-radius:11px;background:${acik ? (d === 'a' ? '#1D6A3B' : '#2FA564') : '#C9CCD1'};position:relative;${acik && d === 'b' ? 'box-shadow:0 0 8px rgba(47,165,100,.55)' : ''}"><i style="position:absolute;top:3px;${acik ? 'right:3px' : 'left:3px'};width:16px;height:16px;border-radius:50%;background:#fff"></i></span>`;
  const kolon = [{ t: 'Personel', w: 190 }, ...sutun.map((s) => ({ t: s }))];
  const satir = kisi.map((k) => [`<td class="td"><b>${k[0]}</b><small>${k[1]}</small></td>`, ...sutun.map((_, i) => `<td class="td">${tgl(k[2].includes(i))}</td>`)]);
  return `<div style="color:var(--soluk);font-size:14.5px;max-width:980px">Personelin hangi işlemleri yapabileceğini buradan ayarlayın. <b style="color:var(--yazi)">Motor Satış</b> yetkisi; satış fiyatı, müşteri bilgisi ve satış geçmişi görüntüleme yetkilerini de kapsar (alış fiyatı ve kâr hariç).</div>` + c.tablo(kolon, satir) +
    `<div><h2 style="margin:8px 0 6px;font-family:var(--fh);font-size:26px">Muhasebeciler</h2><div style="color:var(--soluk);font-size:14.5px;max-width:980px">Muhasebeci her zaman Belge Arşivi'ni görür. Aşağıdaki anahtar açılırsa <b style="color:var(--yazi)">Motor Satış</b> sayfasını da salt okunur görür: alım/satım bedeli, noter tutarları, satış bilgileri ve alıcı/satıcı bilgileri. Kâr, masraf ve yatırımcı payı görünmez; kayıt ekleyemez, düzenleyemez.</div></div>
<div class="ipucu">${svg('bilgi')}Muhasebeci hesabı yok. Kullanıcı Yönetimi ekranından ekleyebilirsiniz.</div>`;
}

function raporlarIcerik(c) {
  const { d } = c;
  const kutu = (l, v, ton) => `<div class="kart" style="padding:14px 18px;flex:1"><div style="font-size:13px;color:var(--soluk)">${l}</div><div style="font-family:var(--fh);font-size:27px;font-weight:700;margin-top:2px;color:${ton ? c.T[ton][0] : 'var(--yazi)'}">${v}</div></div>`;
  const veri = [['Motor satışları', 2, '293.000,00', 88.8, '252.500,00', '34.000,00', '%11,6'], ['İş emirleri (Servis)', 3, '6.900,00', 2.1, '3.090,00', '3.810,00', '%55,2'], ['Aksesuar satışları', 2, '8.850,00', 2.7, '5.750,00', '3.100,00', '%35,0'], ['E-Ticaret', 6, '14.640,00', 4.4, '8.180,00', '2.301,89', '%15,7'], ['Yedek parça (Envanter)', 4, '6.720,00', 2.0, '4.310,00', '2.410,00', '%35,9']];
  const kolon = [{ t: 'Kategori' }, { t: 'İşlem', w: 70, a: 'r' }, { t: 'Gelir', w: 120, a: 'r' }, { t: 'Gelir payı', w: 230 }, { t: 'Maliyet', w: 120, a: 'r' }, { t: 'Kâr', w: 110, a: 'r' }, { t: 'Kâr oranı', w: 90, a: 'r' }];
  const satir = veri.map((r, i) => [
    `<td class="td"><b>${r[0]}</b></td>`, `<td class="td n soluk">${r[1]}</td>`, `<td class="td n">${r[2]} ₺</td>`,
    `<td class="td"><div style="display:flex;align-items:center;gap:10px"><div style="flex:1;height:8px;background:var(--th);border:1px solid var(--cizgi);border-radius:${d === 'a' ? 1 : 4}px;overflow:hidden"><div style="width:${r[3]}%;height:100%;background:${i === 0 ? 'var(--yazi)' : d === 'a' ? '#1E4A86' : '#2B6CB0'}"></div></div><span style="font-size:12.5px;color:var(--soluk);width:44px">%${String(r[3]).replace('.', ',')}</span></div></td>`,
    `<td class="td n soluk" style="font-weight:500">${r[4]} ₺</td>`, `<td class="td n iyi">${r[5]} ₺</td>`, `<td class="td n">${r[6]}</td>`,
  ]);
  return `<div class="sekme">${['Genel Özet', 'Motor Satışları', 'İş Emirleri', 'Aksesuar Satışları', 'E-Ticaret', 'Yedek Parça', 'Fiş Kâr Analizi', 'Yatırımcılar'].map((t, i) => `<span${i === 0 ? ' class="on"' : ''}>${t}</span>`).join('')}</div>
<section class="bar"><div style="display:flex;border:1px solid var(--alan-cizgi);border-radius:var(--ar);overflow:hidden;font-weight:600;font-size:13.5px;background:var(--yuzey)"><span style="padding:10px 14px;color:var(--soluk)">Bugün</span><span style="padding:10px 14px;background:var(--yazi);color:var(--zemin)">Bu Ay</span><span style="padding:10px 14px;color:var(--soluk)">Geçen Ay</span><span style="padding:10px 14px;color:var(--soluk)">Bu Yıl</span><span style="padding:10px 14px;color:var(--soluk)">Geçen Yıl</span></div>${c.tarih(150, '01.10.2026')}${c.tarih(150, '31.10.2026')}</section>
<section style="display:flex;gap:14px">${kutu('Toplam gelir', '₺330.110,00')}${kutu('Toplam maliyet', '₺273.830,00')}${kutu('Toplam kâr', '₺45.621,89', 'yesil')}${kutu('Toplam işlem', '17')}${kutu('Motor stok değeri', '₺8.250.000,00')}</section>` + c.tablo(kolon, satir);
}

const SAYFALAR = [
  { ad: 'servis', baslik: 'Servis', aktif: 'servis', govde: servisIcerik },
  { ad: 'is-emri-formu', baslik: 'Servis', aktif: 'servis', form: isEmriFormu },
  { ad: 'motor-satis', baslik: 'Motor Satış', aktif: 'motor', alt: 'Motor Satış', govde: motorSatisIcerik },
  { ad: 'motor-satis-formu', baslik: 'Motor Satış', aktif: 'motor', alt: 'Motor Satış', form: motorSatisFormu },
  { ad: 'motor-stok', baslik: 'Motor Stok', aktif: 'motor', alt: 'Motor Stok', govde: motorStokIcerik },
  { ad: 'aksesuar-satis', baslik: 'Aksesuarlar', aktif: 'aksesuar', alt: 'Aksesuar Satış', govde: aksesuarSatisIcerik },
  { ad: 'aksesuar-stok', baslik: 'Aksesuar Stok', aktif: 'aksesuar', alt: 'Aksesuar Stok', govde: aksesuarStokIcerik },
  { ad: 'eticaret', baslik: 'E-Ticaret', aktif: 'eticaret', govde: eticaretIcerik },
  { ad: 'taksit', baslik: 'Taksit Hesaplama', aktif: 'taksit', govde: taksitIcerik },
  { ad: 'yedek-satis', baslik: 'Yedek Parça', aktif: 'yedek', alt: 'Yedek Parça Satış', govde: yedekSatisIcerik },
  { ad: 'yedek-stok', baslik: 'Yedek Parça Stok', aktif: 'yedek', alt: 'Yedek Parça Stok', govde: yedekStokIcerik },
  { ad: 'vitrin-yonetim', baslik: 'Vitrin / Site', aktif: 'vitrin', govde: vitrinYonetim },
  { ad: 'veresiye', baslik: 'Veresiye', aktif: 'veresiye', govde: veresiyeIcerik },
  { ad: 'raporlar', baslik: 'Raporlar', aktif: 'raporlar', govde: raporlarIcerik },
  { ad: 'musteriler', baslik: 'Müşteriler', aktif: 'musteriler', govde: musterilerIcerik },
  { ad: 'belge-arsivi', baslik: 'Belge Arşivi', aktif: 'belge', govde: belgeIcerik },
  { ad: 'kullanicilar', baslik: 'Kullanıcılar', aktif: 'kullanicilar', govde: kullanicilarIcerik },
  { ad: 'yetkilendirme', baslik: 'Yetkilendirme', aktif: 'yetki', govde: yetkiIcerik },
];

module.exports = { veresiyeIcerik, servisSatirlar, motorSatis, motorStok, aksSatis, aksStok, eticaret, yedekSatis, yedekStok, SAYFALAR, kabuk, ctx, binlik, tl, servisIcerik, motorSatisIcerik, motorStokIcerik, aksesuarSatisIcerik, aksesuarStokIcerik, eticaretIcerik, yedekSatisIcerik, yedekStokIcerik, vitrinYonetim, musterilerIcerik, kullanicilarIcerik };
