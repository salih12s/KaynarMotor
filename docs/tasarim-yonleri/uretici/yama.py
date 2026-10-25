# -*- coding: utf-8 -*-
# sayfa-uret.py dosyasını yeni ekran listesine göre günceller.
import os, re
K = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(K, 'sayfa-uret.py')
t = open(p, encoding='utf8').read()

# 1) yeni id'ler
t = t.replace("def boyut(ad):\n    return Image.open(os.path.join(K, 'yukle', ad + '.jpg')).size",
"""import json
for _f in ('idler2.json', 'idler2b.json', 'idler2c.json'):
    IDS.update(json.load(open(os.path.join(K, _f), encoding='utf8')))

def boyut(ad):
    y2 = os.path.join(K, 'yukle2', ad + '.jpg')
    return Image.open(y2 if os.path.exists(y2) else os.path.join(K, 'yukle', ad + '.jpg')).size""")

# 2) ekran listesi ve üretici
bas = t.index("# (anchor, başlık")
son = t.index("def renk(liste):")
yeni = '''# (anchor, başlık, açıklama, [ (alt başlık, a-anahtarı, b-anahtarı, tür) ])  tür: cift | telefon
E = lambda *x: x
EKRANLAR = [
 ('giris', 'Giriş ve kayıt', 'Uygulamaya girilen ilk ekranlar.', [E('Giriş yap', 'a-giris2', 'b-giris2', 'cift'), E('Kayıt ol', 'a-kayit', 'b-kayit', 'cift')]),
 ('servis', 'Servis', 'İş emri listesi, yeni iş emri, iş emri fişi ve telefondaki hali.', [E('Liste', 'a-servis', 'b-servis', 'cift'), E('Yeni iş emri', 'a-is-emri-formu', 'b-is-emri-formu', 'cift'), E('İş emri fişi', 'a-fis', 'b-fis', 'cift'), E('Telefonda liste', 'a-telefon2', 'b-telefon2', 'telefon')]),
 ('gecmis', 'Müşterinin gördüğü servis geçmişi', 'Motorun üstündeki QR koddan açılan sayfa. Müşteri yalnızca kendi plakasını görür.', [E('Telefonda', 'a-gecmis', 'b-gecmis', 'telefon')]),
 ('motor-satis', 'Motor satış', 'Satılmış motorlar, alış, satış, noter tutarları ve kâr.', [E('Liste', 'a-motor-satis', 'b-motor-satis', 'cift'), E('Yeni motor satışı', 'a-motor-satis-formu', 'b-motor-satis-formu', 'cift')]),
 ('motor-stok', 'Motor stok', 'Stoktaki, kaporalı, konsinye ve devir bekleyen motorlar. Durum rengi satırın sonunda.', [E('Liste', 'a-motor-stok', 'b-motor-stok', 'cift'), E('Yeni motor ekle', 'a-f-motor-stok', 'b-f-motor-stok', 'cift')]),
 ('aksesuar-satis', 'Aksesuar satış', 'Aksesuar satış kayıtları.', [E('Liste', 'a-aksesuar-satis', 'b-aksesuar-satis', 'cift'), E('Yeni aksesuar satışı', 'a-f-aksesuar-satis', 'b-f-aksesuar-satis', 'cift')]),
 ('aksesuar-stok', 'Aksesuar stok', 'Stok kodu, beden, renk ve mevcut adet. Biten ürünün satırı kırmızı.', [E('Liste', 'a-aksesuar-stok', 'b-aksesuar-stok', 'cift'), E('Yeni stok', 'a-f-aksesuar-stok', 'b-f-aksesuar-stok', 'cift')]),
 ('eticaret', 'E-Ticaret', 'Pazaryeri satışları, komisyon, net kâr ve platform ayarları.', [E('Satışlar', 'a-eticaret', 'b-eticaret', 'cift'), E('Platformlar', 'a-eticaret-platform', 'b-eticaret-platform', 'cift'), E('Yeni e-ticaret satışı', 'a-f-eticaret', 'b-f-eticaret', 'cift')]),
 ('taksit', 'Taksit hesaplama', 'Nakit fiyattan 3, 6, 9 ve 12 ay seçenekleri.', [E('Hesaplama', 'a-taksit', 'b-taksit', 'cift')]),
 ('yedek-satis', 'Yedek parça satış', 'Parça satışları ve kalan borç durumu.', [E('Liste', 'a-yedek-satis', 'b-yedek-satis', 'cift'), E('Yeni yedek parça', 'a-f-yedek-satis', 'b-f-yedek-satis', 'cift')]),
 ('yedek-stok', 'Yedek parça stok', 'Parça envanteri.', [E('Liste', 'a-yedek-stok', 'b-yedek-stok', 'cift'), E('Yeni yedek parça stoğu', 'a-f-yedek-stok', 'b-f-yedek-stok', 'cift')]),
 ('vitrin-yonetim', 'Vitrin / Site yönetimi', 'Sitede görünen ilanların sırası, yayın durumu ve fiyatı.', [E('Liste', 'a-vitrin-yonetim', 'b-vitrin-yonetim', 'cift'), E('Yeni ilan', 'a-f-vitrin-ilan', 'b-f-vitrin-ilan', 'cift'), E('İletişim bilgisi', 'a-f-vitrin-personel', 'b-f-vitrin-personel', 'cift')]),
 ('veresiye', 'Veresiye', 'Kaynağa göre açık borçlar.', [E('Liste', 'a-veresiye', 'b-veresiye', 'cift')]),
 ('raporlar', 'Raporlar', 'Sekmelerin hepsi: genel özet, motor, iş emri, aksesuar, e-ticaret, yedek parça, fiş kârı ve yatırımcılar.', [E('Genel özet', 'a-raporlar', 'b-raporlar', 'cift'), E('Motor satışları', 'a-rapor-motor', 'b-rapor-motor', 'cift'), E('İş emirleri', 'a-rapor-is', 'b-rapor-is', 'cift'), E('Aksesuar satışları', 'a-rapor-aks', 'b-rapor-aks', 'cift'), E('E-Ticaret', 'a-rapor-eticaret', 'b-rapor-eticaret', 'cift'), E('Yedek parça', 'a-rapor-yedek', 'b-rapor-yedek', 'cift'), E('Fiş kâr analizi', 'a-rapor-fis', 'b-rapor-fis', 'cift'), E('Yatırımcılar', 'a-rapor-yatirimci', 'b-rapor-yatirimci', 'cift')]),
 ('musteriler', 'Müşteriler', 'Müşteri rehberi.', [E('Liste', 'a-musteriler', 'b-musteriler', 'cift'), E('Yeni müşteri', 'a-f-musteri', 'b-f-musteri', 'cift')]),
 ('belge-arsivi', 'Belge arşivi', 'Plakaya göre sözleşme ve belgeler.', [E('Arşiv', 'a-belge-arsivi', 'b-belge-arsivi', 'cift')]),
 ('kullanicilar', 'Kullanıcılar', 'Hesaplar, roller ve onay bekleyenler.', [E('Liste', 'a-kullanicilar', 'b-kullanicilar', 'cift'), E('Yeni kullanıcı / yatırımcı', 'a-f-kullanici', 'b-f-kullanici', 'cift')]),
 ('yetkilendirme', 'Yetkilendirme', 'Personelin hangi bölümleri kullanabileceği.', [E('Yetki tablosu', 'a-yetkilendirme', 'b-yetkilendirme', 'cift')]),
]
VITRIN = [('vitrin-ana', 'Ana sayfa'), ('vitrin-motor-sec', 'Motor satışı: sıfır mı ikinci el mi'), ('vitrin-liste', 'İkinci el motor ilanları'), ('vitrin-ilan', 'İlan detayı'), ('vitrin-aksesuar', 'Aksesuar'), ('vitrin-yedek', 'Yedek parça'),
          ('vitrin-servis', 'Bakım / Servis'), ('vitrin-nakliye', 'Nakliye / Yol kurtarma'), ('vitrin-sigorta', 'Araç sigortası'), ('taksit-goruntule', 'Müşterinin gördüğü taksit sayfası')]

VITRIN_HTML_PLACEHOLDER = 1

def alt(basl):
    return f'<h3 class="alt">{basl}</h3>'

def ekran(e):
    anc, bas, acik, ogeler = e
    govde = ''
    for (ab, a, b, tur) in ogeler:
        if tur == 'telefon':
            blok = f'<div class="telrow">{fig(a, bas + " " + ab + " · A", "a", "tel fa")}{fig(b, bas + " " + ab + " · B", "b", "tel fb")}</div>'
        else:
            blok = fig(a, bas + ' ' + ab + ' · A', 'a', 'fa') + fig(b, bas + ' ' + ab + ' · B', 'b', 'fb')
        govde += f'<div class="oge">{alt(ab)}<div class="cift">{blok}</div></div>'
    return f'<section class="ekran" id="{anc}"><header><h2>{bas}</h2><p>{acik}</p></header>{govde}</section>'

VITRIN_HTML = ''.join('<div class="oge">' + alt(b) + '<div class="cift">' + fig(a, b, None, 'sade') + '</div></div>' for a, b in VITRIN)

'''
t = t[:bas] + yeni + t[son:]

# 3) indeks
t = t.replace("indeks = ''.join(f'<a href=\"#{e[0]}\">{e[1]}</a>' for e in EKRANLAR) + '<a href=\"#vitrin\">Vitrin sitesi</a>'",
              "indeks = ''.join(f'<a href=\"#{e[0]}\">{e[1]}</a>' for e in EKRANLAR) + '<a href=\"#vitrin\">Vitrin sitesi</a>'")

# 4) vitrin bölümü
v0 = t.index('<section class="ekran" id="vitrin">')
v1 = t.index('<section class="karar"')
t = t[:v0] + '''<section class="ekran" id="vitrin">
  <header><h2>Vitrin sitesi</h2><p>Müşterinin gördüğü yüz. A ve B'de aynı kalır: koyu zemin, sarı rozet yok, hover'da kırmızı çerçeve yok, fiyat büyük ve beyaz.</p></header>
  {VITRIN_HTML}
</section>

''' + t[v1:]

# 5) metinler
t = t.replace("Uygulamanın bütün ekranları iki yönde de, sizin gerçek servis ve satış kayıtlarınızla çizildi. C elendi. Resimlere tıklayınca büyür.",
              "Uygulamanın bütün ekranları ve formları iki yönde de, sizin gerçek servis ve satış kayıtlarınızla çizildi: 19 yönetim sayfası, 17 form ve pencere, Raporlar'ın 8 sekmesi, müşteriye açık sayfalar ve site. C elendi. Resimlere tıklayınca büyür.")
a = t.index('<p>Bu sayfada olmayanlar')
b = t.index('</p>', a) + 4
t = t[:a] + t[b:].lstrip('\n')
t = t.replace("                    <p>Seçerseniz", "<p>Seçerseniz")
# alt başlık stili
t = t.replace(".cift{{display:grid;gap:26px;margin-top:22px}}", ".cift{{display:grid;gap:26px;margin-top:12px}}\n.oge{{margin-top:34px}}\nh3.alt{{font-size:24px;margin:0;color:var(--yazi)}}")
open(p, 'w', encoding='utf8').write(t)
print('yama tamam')
