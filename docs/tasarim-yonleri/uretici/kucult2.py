# -*- coding: utf-8 -*-
import os, json
from PIL import Image
K = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(K, 'yukle3'), exist_ok=True)
D = ['motor-satis','motor-stok','hizli-satis','aksesuar','eticaret','musteri','veresiye','rapor-motor','rapor-is','rapor-aks','platform','sifre','silme']
T = ['motor-satis','motor-stok','aksesuar-satis','aksesuar-stok','eticaret','yedek-satis','yedek-stok','musteriler','veresiye','kullanicilar','yetki','belge','taksit','vitrin-yonetim','raporlar','is-emri-formu','menu','giris']
adlar = []
for d in 'ab':
    adlar += [f'{d}-d-{n}' for n in D] + [f'{d}-yazdirma'] + [f'{d}-tel-{n}' for n in T]
adlar += ['site-tel-ana', 'site-tel-liste', 'site-tel-ilan', 'vitrin-ilan-taksit']
yollar = []
for n in adlar:
    im = Image.open(os.path.join(K, 'gorsel', n + '.jpg')).convert('RGB')
    if im.width > 1800:
        im = im.resize((1800, round(im.height * 1800 / im.width)), Image.LANCZOS)
    h = os.path.join(K, 'yukle3', n + '.jpg')
    im.save(h, quality=82, optimize=True)
    yollar.append(h)
json.dump(adlar, open(os.path.join(K, 'adlar3.json'), 'w'))
for i in range(0, len(yollar), 25):
    open(os.path.join(K, f'p3_{i // 25 + 1}.txt'), 'w', encoding='utf8').write('\n'.join(os.path.basename(p) for p in yollar[i:i + 25]))
print(len(yollar), 'dosya', sum(os.path.getsize(p) for p in yollar) // 1024, 'KB')
for i in range(0, len(yollar), 25):
    print(i // 25 + 1, [os.path.basename(p)[:-4] for p in yollar[i:i + 25]])
