# -*- coding: utf-8 -*-
# Yeni üretilen görselleri küçültüp yukle2/ altına yazar ve 25'erli yükleme paketlerini paket<N>.txt dosyalarına döker.
import os, json
from PIL import Image

K = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(K, 'yukle2'), exist_ok=True)
yeni = []
for d in 'ab':
    for n in ['rapor-motor', 'rapor-is', 'rapor-aks', 'rapor-eticaret', 'rapor-yedek', 'rapor-fis', 'rapor-yatirimci', 'eticaret-platform', 'f-aksesuar-satis', 'f-aksesuar-stok', 'f-eticaret',
              'f-yedek-satis', 'f-yedek-stok', 'f-motor-stok', 'f-musteri', 'f-kullanici', 'f-vitrin-ilan', 'f-vitrin-personel', 'giris2', 'kayit', 'gecmis', 'telefon2',
              'raporlar', 'vitrin-yonetim', 'eticaret', 'yedek-satis', 'yedek-stok']:
        yeni.append(f'{d}-{n}')
yeni += ['vitrin-ana', 'vitrin-motor-sec', 'vitrin-aksesuar', 'vitrin-yedek', 'vitrin-servis', 'vitrin-nakliye', 'vitrin-sigorta', 'taksit-goruntule']
yollar = []
for n in yeni:
    im = Image.open(os.path.join(K, 'gorsel', n + '.jpg')).convert('RGB')
    w, h = im.size
    if w > 1800:
        im = im.resize((1800, round(h * 1800 / w)), Image.LANCZOS)
    hedef = os.path.join(K, 'yukle2', n + '.jpg')
    im.save(hedef, quality=82, optimize=True)
    yollar.append(hedef)
for i in range(0, len(yollar), 25):
    open(os.path.join(K, f'paket{i // 25 + 1}.txt'), 'w', encoding='utf8').write(json.dumps(yollar[i:i + 25], ensure_ascii=False))
print(len(yollar), 'dosya,', sum(os.path.getsize(p) for p in yollar) // 1024, 'KB')
