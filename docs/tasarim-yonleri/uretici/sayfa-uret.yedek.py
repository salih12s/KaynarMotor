# -*- coding: utf-8 -*-
# Karşılaştırma sayfasını üretir: tasarim/sayfa/KaynarMotor-yeni-gorunum.html
import os
from PIL import Image

K = os.path.dirname(os.path.abspath(__file__))
IDS = {
 'a-aksesuar-satis':'b330fa83997f8422cf3e26996d81dce6','a-aksesuar-stok':'7191388fc322edaddb2003176520c8e3','a-belge-arsivi':'2c84b9b5580a7ea22e8579a40fe22b7f',
 'a-eticaret':'cabfc88b62814510d2d1208c057b20f3','a-fis':'901b8459fb008f423b61d4bb19adb8b8','a-giris':'e151fdaf564997d01d998e384ed4ea14',
 'a-is-emri-formu':'e4a0e92cccb78b1a66f08c383b22075e','a-kullanicilar':'232228dd3ac90702cbb90c5a08af09b8','a-motor-satis-formu':'0da618ae283616f15f8e30da918f09be',
 'a-motor-satis':'c04fd3a0dbdedce27cdf513da7ee8c2a','a-motor-stok':'09ec47c08f84f64b247d032ab8f10a13','a-musteriler':'8833833dbb5a9c79330e3219fdd17b08',
 'a-raporlar':'31b0ab24478bf0ab4b7bdbfc228a6ffc','a-servis':'af2c659f6660235ba785971827a0581b','a-taksit':'cb091db99dc1fe0bb75448920f11a6d6',
 'a-telefon':'3bb4cc50baa665b38a4dd54ef0cd6acb','a-veresiye':'3731b8ab7512c0aca554fe0fd20d8e7d','a-vitrin-yonetim':'d17dc50b071e0c25d25e47ffefd69908',
 'a-yedek-satis':'d71b93e9ea5f346f3912bf330a667cbb','a-yedek-stok':'57bd8687435566127e1525b8c31b2ff0','a-yetkilendirme':'54081cfd3975006f5aaa80f64f0a00bb',
 'b-aksesuar-satis':'264c83ab19f3142d8b64cfbe9bc9a1bc','b-aksesuar-stok':'b5684fc04626a9de42fd746e75edb875','b-belge-arsivi':'2bce6fd3433a32ba016293a4b28acf34',
 'b-eticaret':'61167de4682ab7dd8d930d66c4ff36a0','b-fis':'293fa30283acd85487c4af68a8baf201','b-giris':'379f2b2a1c750088159ae40197dfafee',
 'b-is-emri-formu':'f60f22ffa79f9313c2859f71cc24aa01','b-kullanicilar':'64d7224f922b8676f12893da50b5d0c9','b-motor-satis-formu':'d72410e11216791172ce3a59817d68e8',
 'b-motor-satis':'45c921df5d676f6a3e28b43a03e5a96a','b-motor-stok':'265e641761a16b5d6722bbaae3d8ca40','b-musteriler':'be0bd78133ebec96136a29178d796984',
 'b-raporlar':'12bd7bb6ed8ae19340f5babe0df71158','b-servis':'f223132bcc9431430721058c79b32f69','b-taksit':'357cfb75fb12766637653a4a2e578cf1',
 'b-telefon':'29651701b7035ffc96a0b91c5f1b6273','b-veresiye':'ee2119cd87ca5548696eefe38d67f063','b-vitrin-yonetim':'96ea890d1da0f2e030a6b0ddaee1de6b',
 'b-yedek-satis':'7ddac057254293cad727447541e72a61','b-yedek-stok':'a8c844d77b59891a35acac4c2906433f','b-yetkilendirme':'b0a7237ddc979347cb8a1cde125280f8',
 'vitrin-ilan':'55b5310cb1b0e279857b225bcf18365d','vitrin-liste':'76d7c5f927beb0060e1aec4a09cd3100',
}

def boyut(ad):
    return Image.open(os.path.join(K, 'yukle', ad + '.jpg')).size

def fig(ad, alt, etiket=None, sinif=''):
    w, h = boyut(ad)
    e = f'<span class="et et-{etiket}">{etiket.upper()}</span>' if etiket else ''
    return (f'<figure class="res {sinif}" data-w="{w}"><button type="button" class="buyut" aria-label="{alt}: büyüt">'
            f'<img src="/_blob/{IDS[ad]}" width="{w}" height="{h}" alt="{alt}" decoding="async"></button>{e}</figure>')

# (anchor, başlık, açıklama, [dosya, ...] tür)
EKRANLAR = [
 ('giris', 'Giriş', 'Uygulamaya girilen ilk ekran.', 'cift', ('a-giris', 'b-giris')),
 ('servis', 'Servis', 'İş emri listesi. En çok kullanılan ekran: özet, süzgeç, tablo, işlem düğmeleri.', 'cift', ('a-servis', 'b-servis')),
 ('is-emri-formu', 'Yeni iş emri', 'Müşteri, araç, arıza, parça ve ödeme tek pencerede.', 'cift', ('a-is-emri-formu', 'b-is-emri-formu')),
 ('fis', 'İş emri fişi', 'Bir iş emrinin detayı. Yazdırılan fişle aynı dili konuşur.', 'cift', ('a-fis', 'b-fis')),
 ('telefon', 'Telefonda servis', 'Aynı liste telefonda kart olarak görünür.', 'telefon', ('a-telefon', 'b-telefon')),
 ('motor-satis', 'Motor satış', 'Satılmış motorlar, alış, satış, noter tutarları ve kâr.', 'cift', ('a-motor-satis', 'b-motor-satis')),
 ('motor-satis-formu', 'Yeni motor satışı', 'Motor, fiyat ve kâr, satıcı ve alıcı, ödeme ve belgeler.', 'cift', ('a-motor-satis-formu', 'b-motor-satis-formu')),
 ('motor-stok', 'Motor stok', 'Stoktaki, kaporalı, konsinye ve devir bekleyen motorlar. Durum rengi satırın başında.', 'cift', ('a-motor-stok', 'b-motor-stok')),
 ('aksesuar-satis', 'Aksesuar satış', 'Aksesuar satış kayıtları.', 'cift', ('a-aksesuar-satis', 'b-aksesuar-satis')),
 ('aksesuar-stok', 'Aksesuar stok', 'Stok kodu, beden, renk ve mevcut adet. Biten ürünün satırı kırmızı.', 'cift', ('a-aksesuar-stok', 'b-aksesuar-stok')),
 ('eticaret', 'E-Ticaret', 'Pazaryeri satışları, komisyon ve net kâr.', 'cift', ('a-eticaret', 'b-eticaret')),
 ('taksit', 'Taksit hesaplama', 'Nakit fiyattan 3, 6, 9 ve 12 ay seçenekleri.', 'cift', ('a-taksit', 'b-taksit')),
 ('yedek-satis', 'Yedek parça satış', 'Parça satışları ve kalan borç durumu.', 'cift', ('a-yedek-satis', 'b-yedek-satis')),
 ('yedek-stok', 'Yedek parça stok', 'Parça envanteri.', 'cift', ('a-yedek-stok', 'b-yedek-stok')),
 ('vitrin-yonetim', 'Vitrin / Site yönetimi', 'Sitede görünen ilanların sırası, yayın durumu ve fiyatı.', 'cift', ('a-vitrin-yonetim', 'b-vitrin-yonetim')),
 ('veresiye', 'Veresiye', 'Kaynağa göre açık borçlar.', 'cift', ('a-veresiye', 'b-veresiye')),
 ('raporlar', 'Raporlar', 'Genel özet sekmesi. Diğer sekmeler aynı tablo ve kart diliyle çizilir.', 'cift', ('a-raporlar', 'b-raporlar')),
 ('musteriler', 'Müşteriler', 'Müşteri rehberi.', 'cift', ('a-musteriler', 'b-musteriler')),
 ('belge-arsivi', 'Belge arşivi', 'Plakaya göre sözleşme ve belgeler.', 'cift', ('a-belge-arsivi', 'b-belge-arsivi')),
 ('kullanicilar', 'Kullanıcılar', 'Hesaplar, roller ve onay bekleyenler.', 'cift', ('a-kullanicilar', 'b-kullanicilar')),
 ('yetkilendirme', 'Yetkilendirme', 'Personelin hangi bölümleri kullanabileceği.', 'cift', ('a-yetkilendirme', 'b-yetkilendirme')),
]

def ekran(e):
    anc, bas, acik, tur, (a, b) = e
    if tur == 'telefon':
        govde = f'<div class="telrow">{fig(a, bas + " · A", "a", "tel fa")}{fig(b, bas + " · B", "b", "tel fb")}</div>'
    else:
        govde = fig(a, bas + ' · A', 'a', 'fa') + fig(b, bas + ' · B', 'b', 'fb')
    return f'<section class="ekran" id="{anc}"><header><h2>{bas}</h2><p>{acik}</p></header><div class="cift">{govde}</div></section>'

def renk(liste):
    return '<ul class="renkler">' + ''.join(f'<li><i style="background:{h}"></i>{ad}<b>{h}</b></li>' for ad, h in liste) + '</ul>'

indeks = ''.join(f'<a href="#{e[0]}">{e[1]}</a>' for e in EKRANLAR) + '<a href="#vitrin">Vitrin sitesi</a>'

HTML = f'''<title>KaynarMotor Yeni Görünüm</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap">
<style>
/* Düzen: tek kolon, her ekran bir bölüm. Üstte A/B seçici yapışık durur. */
:root{{--zemin:#FFFFFF;--yuzey:#F3F4F5;--yazi:#16181C;--soluk:#5B6068;--cizgi:#DADCE0;--vurgu:#C62828;--ea:#16181C;--eb:#C62828;
--baslik:'Barlow Condensed','Arial Narrow',sans-serif;--metin:'Barlow','Segoe UI',Arial,sans-serif}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--zemin:#131416;--yuzey:#1C1E21;--yazi:#EDEEF0;--soluk:#A3A8B0;--cizgi:#34373C;--vurgu:#E0453A;--ea:#EDEEF0;--eb:#E0453A;color-scheme:dark}}}}
:root[data-theme="dark"]{{--zemin:#131416;--yuzey:#1C1E21;--yazi:#EDEEF0;--soluk:#A3A8B0;--cizgi:#34373C;--vurgu:#E0453A;--ea:#EDEEF0;--eb:#E0453A;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--zemin);color:var(--yazi);font:400 17px/1.55 var(--metin);padding-inline:max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px))}}
h1,h2,h3{{font-family:var(--baslik);margin:0;font-weight:700;text-wrap:balance}}
p{{margin:0;max-width:68ch}}
.kap{{max-width:1240px;margin:0 auto}}
.ust{{padding:52px 0 28px;border-bottom:1px solid var(--cizgi)}}
.ust h1{{font-size:clamp(42px,8vw,80px);line-height:.95}}
.ust p{{margin-top:16px;font-size:19px;color:var(--soluk)}}
.degisen{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:26px}}
.degisen div{{padding:14px 16px;border:1px solid var(--cizgi);border-radius:10px;font-size:15.5px}}
.degisen b{{display:block;font-family:var(--baslik);font-size:21px;margin-bottom:2px}}
.yonler{{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;margin:30px 0 0}}
.yon{{border:1px solid var(--cizgi);border-radius:12px;padding:22px 24px;display:grid;gap:14px;align-content:start}}
.yon h2{{font-size:34px;display:flex;gap:12px;align-items:center}}
.harf{{width:38px;height:38px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;color:#fff}}
.yon .k{{color:var(--soluk);font-size:16.5px}}
.renkler{{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px 18px}}
.renkler li{{display:flex;align-items:center;gap:8px;font-size:14.5px}}
.renkler i{{width:22px;height:22px;border-radius:5px;border:1px solid var(--cizgi)}}
.renkler b{{font-weight:500;color:var(--soluk);font-size:13px}}
.yon ul.l{{margin:0;padding-left:20px;display:grid;gap:4px;font-size:15.5px}}
.sec{{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:var(--zemin);border-bottom:1px solid var(--cizgi);padding:10px 0;margin-top:10px}}
.sec .kap{{display:flex;gap:10px;align-items:center;flex-wrap:wrap}}
.sec span.e{{font-size:14px;color:var(--soluk);margin-right:4px}}
.seg{{display:inline-flex;border:1.5px solid var(--yazi);border-radius:8px;overflow:hidden}}
.seg button{{all:unset;cursor:pointer;padding:8px 16px;font:600 15px var(--metin);color:var(--yazi)}}
.seg button[aria-pressed="true"]{{background:var(--yazi);color:var(--zemin)}}
.seg button:focus-visible{{outline:3px solid var(--vurgu);outline-offset:-3px}}
.indeks{{display:flex;flex-wrap:wrap;gap:8px;padding:22px 0 6px}}
.indeks a{{padding:5px 12px;border:1px solid var(--cizgi);border-radius:99px;font-size:14px;text-decoration:none;color:var(--yazi)}}
.indeks a:hover,.indeks a:focus-visible{{border-color:var(--yazi)}}
.ekran{{padding:56px 0 8px;border-top:1px solid var(--cizgi);margin-top:44px;scroll-margin-top:60px}}
.ekran:first-of-type{{border-top:0;margin-top:0}}
.ekran header h2{{font-size:clamp(32px,5vw,48px);line-height:1}}
.ekran header p{{margin-top:8px;color:var(--soluk)}}
.cift{{display:grid;gap:26px;margin-top:22px}}
.res{{margin:0;position:relative;max-width:100%}}
.res img{{display:block;width:100%;height:auto;border:1px solid var(--cizgi);border-radius:8px;background:var(--yuzey)}}
.buyut{{all:unset;display:block;cursor:zoom-in;width:100%}}
.buyut:focus-visible{{outline:3px solid var(--vurgu);outline-offset:3px;border-radius:8px}}
.et{{position:absolute;left:10px;top:10px;min-width:30px;height:30px;padding:0 10px;border-radius:6px;color:#fff;font:700 17px/30px var(--baslik);text-align:center;pointer-events:none}}
.et-a{{background:#16181C}}.et-b{{background:#C62828}}
.telrow{{display:flex;gap:28px;flex-wrap:wrap}}
.res.tel{{width:340px}}
.res.sade{{width:100%}}
body[data-mod="a"] .fb{{display:none}}
body[data-mod="b"] .fa{{display:none}}
body[data-mod="a"] .cift:has(.tel) .fb{{display:none}}
.pair{{display:grid;gap:26px;margin-top:22px}}
.karar{{margin-top:70px;padding:36px 0 80px;border-top:1px solid var(--cizgi)}}
.karar h2{{font-size:clamp(34px,5vw,52px);line-height:1}}
.tab{{margin-top:22px;border:1px solid var(--cizgi);border-radius:10px;overflow:auto}}
.tab table{{border-collapse:collapse;width:100%;min-width:640px;font-size:15.5px}}
.tab th,.tab td{{text-align:left;padding:12px 14px;border-bottom:1px solid var(--cizgi);vertical-align:top}}
.tab th{{background:var(--yuzey);font-weight:600}}
.tab tr:last-child td{{border-bottom:0}}
.not{{margin-top:22px;display:grid;gap:8px;max-width:68ch;color:var(--soluk);font-size:16px}}
#buyuk{{position:fixed;inset:0;z-index:50;background:rgba(10,10,12,.93);overflow:auto;padding:16px;display:none}}
#buyuk.acik{{display:block}}
#buyuk img{{display:block;margin:0 auto;max-width:none;width:min(2000px,220%);height:auto;border-radius:6px}}
#buyukBaslik{{position:sticky;top:0;left:0;margin:0 0 12px;color:#fff;font-size:15px;max-width:none}}
#kapat{{position:fixed;top:max(12px,env(safe-area-inset-top,0px));right:16px;z-index:60;height:44px;padding:0 18px;border:0;border-radius:22px;background:#fff;color:#16181C;font:600 16px var(--metin);cursor:pointer;display:none}}
#buyuk.acik ~ #kapat{{display:block}}
@media (max-width:700px){{.res.tel{{width:min(300px,100%)}} body{{font-size:16px}}}}
</style>

<div class="kap">
<header class="ust">
  <h1>KaynarMotor<br>yeni görünüm</h1>
  <p>İki yön kaldı: A ve B. Uygulamanın bütün ekranları iki yönde de, sizin gerçek servis ve satış kayıtlarınızla çizildi. C elendi. Resimlere tıklayınca büyür.</p>
  <div class="degisen">
    <div><b>Menü simgeleri renkli</b>Her bölümün kendi rengi var: servis kırmızı, aksesuar mor, e-ticaret mavi, raporlar turkuaz, veresiye yeşil.</div>
    <div><b>İşlem düğmeleri renkli</b>Görüntüle mavi, yazdır gri, servis QR mor, düzenle sarı, sil kırmızı, satışa çevir yeşil.</div>
    <div><b>Henüz proje koduna yazılmadı</b>Bu sayfa yalnızca resimlerden oluşur. Karar verene kadar uygulama aynen duruyor.</div>
  </div>
  <div class="yonler">
    <article class="yon">
      <h2><span class="harf" style="background:#16181C">A</span>Servis Defteri</h2>
      <p class="k">Atölye fişi gibi: kâğıt zemin, gerçek Türk plakası rozeti, durum damgası, delikli iş emri fişi. Menü açık renk, üstünde gerçek logonuz.</p>
      {renk([('Kâğıt', '#EEEFEB'), ('Mürekkep', '#16181C'), ('Kırmızı', '#C62828'), ('Yeşil', '#1D6A3B')])}
      <p class="k">Yazı: Barlow Condensed, Barlow, IBM Plex Mono</p>
      <ul class="l"><li>Bugünkü etiketler büyük oranda aynı kalır, testler az bozulur</li><li>Tanıdık bir nesne: ilk bakışta atölye</li></ul>
    </article>
    <article class="yon">
      <h2><span class="harf" style="background:#C62828">B</span>Gösterge</h2>
      <p class="k">Motorun gösterge paneli gibi: koyu kenar menü, yanan LED durum noktaları, açık gri çalışma alanı. Bugünkü koyu menüye en yakın olan.</p>
      {renk([('Grafit', '#1D2228'), ('Açık gri', '#E9ECEF'), ('LED kırmızı', '#FF4A3D'), ('Yeşil', '#2FA564')])}
      <p class="k">Yazı: Chakra Petch, Barlow Semi Condensed</p>
      <ul class="l"><li>Durumlar bir bakışta okunur: yanan LED, sayı kutuları</li><li>Bugünkü görünüme yakın, geçiş sarsıcı olmaz</li></ul>
    </article>
  </div>
</header>

<div class="indeks" aria-label="Ekranlar">{indeks}</div>
</div>

<div class="sec"><div class="kap"><span class="e">Göster:</span>
  <div class="seg" role="group" aria-label="Yön seçimi"><button type="button" data-mod="hepsi" aria-pressed="true">A ve B birlikte</button><button type="button" data-mod="a" aria-pressed="false">Yalnız A</button><button type="button" data-mod="b" aria-pressed="false">Yalnız B</button></div>
</div></div>

<div class="kap">
{''.join(ekran(e) for e in EKRANLAR)}

<section class="ekran" id="vitrin">
  <header><h2>Vitrin sitesi</h2><p>Müşterinin gördüğü yüz. A ve B'de aynı kalır: koyu zemin, sarı rozet yok, hover'da kırmızı çerçeve yok, fiyat büyük ve beyaz.</p></header>
  <div class="cift">{fig('vitrin-liste', 'Vitrin ilan listesi', None, 'sade')}{fig('vitrin-ilan', 'Vitrin ilan detayı', None, 'sade')}</div>
</section>

<section class="karar" id="karar">
  <h2>Hangisi?</h2>
  <div class="tab"><table>
    <thead><tr><th></th><th>A · Servis Defteri</th><th>B · Gösterge</th></tr></thead>
    <tbody>
      <tr><th>Duyguyu verir</th><td>Sıcak, atölye ve fiş hissi. Markaya özgü.</td><td>Temiz, modern panel hissi. Ekranlar arası tutarlı.</td></tr>
      <tr><th>Bugünkünden uzaklığı</th><td>Daha uzak: açık menü, kâğıt tonu, damgalar.</td><td>Daha yakın: koyu menü ve açık içerik kalıyor.</td></tr>
      <tr><th>Koda etkisi</th><td>Etiketler büyük oranda aynı, testlerin çoğu bozulmaz.</td><td>Durum rozetleri LED'e dönüşür, bileşen testlerinin bir kısmı yeniden yazılır.</td></tr>
      <tr><th>Güçlü olduğu yer</th><td>Servis fişi, plaka rozeti, belge ve fiş ekranları.</td><td>Rapor, stok ve sayı yoğun ekranlar, durum takibi.</td></tr>
      <tr><th>Dikkat</th><td>En karakterli yön, bazılarına fazla süslü gelebilir.</td><td>Daha "hazır panel" gibi, A kadar size özgü değil.</td></tr>
    </tbody>
  </table></div>
  <div class="not">
    <p><strong style="color:var(--yazi)">Önerim A.</strong> Atölyenize ve plaka, fiş, belge gibi gerçek nesnelere en çok yakışan ve koda en az dokunan yön. B'yi seçerseniz de güvenle yapılır, sadece daha çok test güncellenir.</p>
    <p>Bu sayfada olmayanlar: Raporlar'ın diğer sekmeleri, Platformlar sekmesi, aksesuar ve yedek parça satış formları, sitenin ana sayfası, müşteri taksit ve servis geçmişi sayfaları. Hepsi gösterilen tablo, kart ve form diliyle çizilir; yön seçilince onlar da aynı şekilde uygulanır.</p>
    <p>Seçerseniz önce yalnızca renk ve etiket temelini ayrı bir adımda yaparım, sonra ekranları tek tek taşırım ve her adımda tüm testleri çalıştırırım. Canlıya sizden onay almadan çıkmam.</p>
  </div>
</section>
</div>

<div id="buyuk" role="dialog" aria-modal="true" aria-label="Büyütülmüş görsel"><p id="buyukBaslik"></p><img id="buyukImg" alt=""></div>
<button type="button" id="kapat">Kapat</button>
<script>
(function(){{
  var govde=document.body;
  function mod(m){{govde.setAttribute('data-mod',m);document.querySelectorAll('.seg button').forEach(function(b){{b.setAttribute('aria-pressed',b.dataset.mod===m?'true':'false');}});try{{localStorage.setItem('kmMod',m);}}catch(e){{}}}}
  document.querySelectorAll('.seg button').forEach(function(b){{b.addEventListener('click',function(){{mod(b.dataset.mod);}});}});
  try{{var k=localStorage.getItem('kmMod');if(k==='a'||k==='b')mod(k);}}catch(e){{}}
  var kutu=document.getElementById('buyuk'),img=document.getElementById('buyukImg'),bas=document.getElementById('buyukBaslik'),kapat=document.getElementById('kapat');
  function ac(b){{var i=b.querySelector('img');img.src=i.src;img.alt=i.alt;bas.textContent=i.alt;kutu.classList.add('acik');kutu.scrollTop=0;kutu.scrollLeft=0;kapat.focus();}}
  function kapatKutu(){{kutu.classList.remove('acik');img.removeAttribute('src');}}
  document.addEventListener('click',function(e){{var b=e.target.closest('.buyut');if(b){{ac(b);return;}}if(e.target===kutu||e.target===kapat||e.target===img||e.target===bas)kapatKutu();}});
  document.addEventListener('keydown',function(e){{if(e.key==='Escape')kapatKutu();}});
}})();
</script>
'''
os.makedirs(os.path.join(K, 'sayfa'), exist_ok=True)
open(os.path.join(K, 'sayfa', 'KaynarMotor-yeni-gorunum.html'), 'w', encoding='utf8').write(HTML)
print('yazıldı', len(HTML) // 1024, 'KB')
