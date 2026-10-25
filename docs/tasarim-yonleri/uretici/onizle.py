# -*- coding: utf-8 -*-
# Yayın dosyasındaki /_blob/<id> adreslerini yerel dosyalarla değiştirip önizleme üretir.
import os, re
K = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/')
src = open(os.path.join(K, 'sayfa-uret.py'), encoding='utf8').read()
ids = eval(re.search(r"IDS = (\{.*?\n\})", src, re.S).group(1))
import json
for f in ('idler2.json','idler2b.json','idler2c.json','idler3a.json','idler3b.json','idler3c.json'):
    ids.update(json.load(open(os.path.join(K, f), encoding='utf8')))
h = open(os.path.join(K, 'sayfa', 'KaynarMotor-yeni-gorunum.html'), encoding='utf8').read()
for ad, v in ids.items():
    kl = next(x for x in ('yukle3','yukle2','yukle') if os.path.exists(os.path.join(K, x, ad + '.jpg')))
    h = h.replace('/_blob/' + v, 'file:///' + K + '/' + kl + '/' + ad + '.jpg')
open(os.path.join(K, 'sayfa', 'onizleme.html'), 'w', encoding='utf8').write(h)
print('onizleme.html', len(h) // 1024, 'KB')
