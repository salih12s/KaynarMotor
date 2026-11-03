/*
 * MİMARİ testi: backend klasör düzenini ve bağımlılık kurallarını makineye zorlatır (yeni kod kuralı sessizce bozamasın).
 *
 * Düzen: iş alanı başına bir MODÜL klasörü (auth, musteriler, servis, aksesuar, yedek-parca, motor, eticaret, vitrin, raporlar),
 * hepsinin altyapısı platform/ içinde. Modülün içi düz tek seviyedir ve katmanlıdır:
 *
 *   X.routes.ts → X.controller.ts → X.service.ts → X.repository.ts → platform/database
 *   (HTTP)        (istek/yanıt)      (iş kuralı)     (SQL)
 *
 * R1  Katman sırası (modül içi; yalnızca ÇALIŞMA ZAMANI içe aktarmaları, `import type` serbest: çalışma zamanında bağ kurmaz).
 *     routes → controller, schemas · controller → service, schemas, gorunum, hesap · service → repository, schemas, gorunum, hesap
 *     repository → (başka katman yok) · gorunum/hesap saf kuraldır → yalnızca gorunum, hesap
 * R2  `express` yalnızca routes ve controller'da (service/repository/saf kurallar HTTP bilmez; tip olarak bile). platform serbest.
 * R3  platform/ hiçbir modüle bağlanmaz (bağımlılık içeriden dışarı akmaz) ve içinde katman dosyası (X.service.ts ...) bulunmaz.
 * R4  Her üst klasör ya modüldür (index.ts var) ya da sistem klasörüdür (platform, scripts, tests); modül içinde alt klasör yoktur.
 * R5  Eski klasörler (modules/, core/, shared/ ve katman klasörleri: routes/, services/ ...) kökte geri gelmez.
 * R6  Modül sınırı: bir modül (ve server.ts) başka modüle YALNIZCA onun index.ts dosyası üzerinden erişir (iç dosyaya import yasak).
 * R7  Modüller arası bağlar yalnızca MODUL_BAGLARI'nda yazılanlardır ve döngü oluşturmaz. Yeni bağ = bilinçli karar (listeye gerekçeyle yazılır).
 * R8  index.ts yalnızca dışa aktarma satırlarından oluşur (içinde mantık yok).
 *
 * Bilinen istisna eklemek için ISTISNALAR'a "dosya -> hedef" yazılır ve gerekçesi belirtilir; liste büyütülmemeli.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KOK = path.join(__dirname, '..', '..');

const IZINLI = {
  routes: ['controller', 'schemas'],
  controller: ['service', 'schemas', 'gorunum', 'hesap'],
  service: ['repository', 'schemas', 'gorunum', 'hesap'],
  repository: [],
  schemas: [],
  gorunum: ['gorunum', 'hesap'],
  hesap: ['gorunum', 'hesap'],
};
const KATMANLAR = Object.keys(IZINLI);
const EXPRESS_YASAK = ['service', 'repository', 'schemas', 'gorunum', 'hesap'];

const ALTYAPI = 'platform';
const SISTEM_KLASORLERI = [ALTYAPI, 'scripts', 'tests', 'node_modules', 'dist'];
const ESKI_KLASORLER = ['modules', 'core', 'shared', 'routes', 'controllers', 'services', 'repositories', 'schemas', 'rules', 'middleware', 'database', 'lib'];

// Modül → bağlandığı modüller. Yeni bağ eklemek mimari bir karardır; gerekçesi buraya yazılır.
const MODUL_BAGLARI = {
  aksesuar: ['musteriler'], // aksesuar satışı müşteriyi bulur ya da açar (upsertMusteri)
  motor: ['musteriler'], // motor satışı müşteriyi bulur ya da açar
  servis: ['musteriler'], // iş emri müşteriyi bulur ya da açar
};

// "<backend'e göre dosya yolu> -> <içe aktarılan>": gerekçe. Boş olması hedeftir.
const ISTISNALAR = {};

const katman = (dosyaAdi) => {
  const ad = path.basename(dosyaAdi);
  return KATMANLAR.find((k) => ad.includes('.' + k + '.')) || null;
};

// Yorumları atıp import/export-from/require ifadelerini çıkarır.
const icAktarmalar = (kaynak) => {
  const temiz = kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const sonuc = [];
  const re =
    /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^'";]*?\bfrom\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(temiz))) sonuc.push({ hedef: m[2] || m[3] || m[4], tip: !!m[1] });
  return sonuc;
};

const tsDosyalari = (klasor) => {
  const cikti = [];
  const yol = path.join(KOK, klasor);
  if (!fs.existsSync(yol)) return cikti;
  const gez = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') gez(p);
      } else if (p.endsWith('.ts')) cikti.push(p);
    }
  };
  gez(yol);
  return cikti;
};

const goreli = (dosya) => path.relative(KOK, dosya).split(path.sep).join('/');
const ilkKlasor = (dosya) => goreli(dosya).split('/')[0];

const ustKlasorler = () =>
  fs
    .readdirSync(KOK, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
const modulMu = (klasor) => fs.existsSync(path.join(KOK, klasor, 'index.ts'));
const moduller = () => ustKlasorler().filter((k) => !SISTEM_KLASORLERI.includes(k) && modulMu(k));
const modulDosyalari = () => moduller().flatMap(tsDosyalari);

/** Bir içe aktarmanın çözümlendiği yere göre { klasor, kalan }: klasor = kökten ilk klasör, kalan = altındaki yol ('' ya da 'index' = genel arayüz). */
const hedefKonumu = (dosya, hedef) => {
  const yol = goreli(path.resolve(path.dirname(dosya), hedef));
  const [klasor, ...geri] = yol.split('/');
  return { klasor, kalan: geri.join('/') };
};

/** Modül sınırı ihlali mi? `kaynakModul` null ise çağıran sunucu girişidir (server.ts). */
const sinirIhlaliMi = (kaynakModul, hedefKlasor, kalan, modulListesi) =>
  modulListesi.includes(hedefKlasor) && hedefKlasor !== kaynakModul && kalan !== '' && kalan !== 'index';

/** Modül grafiğinde döngü varsa döngüyü (a → b → a) döndürür, yoksa null. */
const dongu = (graf) => {
  const durum = {};
  const yigin = [];
  const gez = (d) => {
    durum[d] = 1;
    yigin.push(d);
    for (const s of graf[d] || []) {
      if (durum[s] === 1) return [...yigin.slice(yigin.indexOf(s)), s];
      if (!durum[s]) {
        const bulunan = gez(s);
        if (bulunan) return bulunan;
      }
    }
    yigin.pop();
    durum[d] = 2;
    return null;
  };
  for (const d of Object.keys(graf)) {
    if (!durum[d]) {
      const bulunan = gez(d);
      if (bulunan) return bulunan;
    }
  }
  return null;
};

const katmanIhlalleri = () => {
  const ihlal = [];
  for (const dosya of modulDosyalari()) {
    const k = katman(dosya);
    if (!k) continue;
    for (const { hedef, tip } of icAktarmalar(fs.readFileSync(dosya, 'utf8'))) {
      const anahtar = `${goreli(dosya)} -> ${hedef}`;
      if (ISTISNALAR[anahtar]) continue;
      if (hedef === 'express' || hedef.startsWith('express/')) {
        if (EXPRESS_YASAK.includes(k)) ihlal.push(`R2 ${anahtar} (${k} katmanı express bilmemeli)`);
        continue;
      }
      if (tip || !hedef.startsWith('.')) continue; // tip içe aktarması ve paketler R1 dışı
      const { klasor } = hedefKonumu(dosya, hedef);
      if (klasor !== ilkKlasor(dosya)) continue; // başka modül/platform: R6 ve R7 bakar
      const hk = katman(hedef + '.ts');
      if (!hk || hk === k) continue; // katmansız yardımcı ya da aynı katman
      if (!IZINLI[k].includes(hk)) ihlal.push(`R1 ${anahtar} (${k} → ${hk} yasak; izinli: ${IZINLI[k].join(', ') || 'hiçbiri'})`);
    }
  }
  return ihlal;
};

const platformIhlalleri = () => {
  const ihlal = [];
  const modulAdlari = moduller();
  for (const dosya of tsDosyalari(ALTYAPI)) {
    if (katman(dosya)) ihlal.push(`R3 ${goreli(dosya)} (platform/ içinde katman dosyası olmaz; iş mantığı bir modüle aittir)`);
    for (const { hedef } of icAktarmalar(fs.readFileSync(dosya, 'utf8'))) {
      if (!hedef.startsWith('.')) continue;
      const { klasor } = hedefKonumu(dosya, hedef);
      if (klasor !== ALTYAPI)
        ihlal.push(`R3 ${goreli(dosya)} -> ${hedef} (platform/ ${modulAdlari.includes(klasor) ? klasor + ' modülüne' : klasor + '/ klasörüne'} bağlanamaz)`);
    }
  }
  return ihlal;
};

const yerlesimIhlalleri = () => {
  const ihlal = [];
  for (const k of ustKlasorler()) {
    if (SISTEM_KLASORLERI.includes(k) || ESKI_KLASORLER.includes(k)) continue;
    if (!modulMu(k))
      ihlal.push(`R4 ${k}/ ne modül (index.ts yok) ne sistem klasörü (${SISTEM_KLASORLERI.filter((s) => s !== 'node_modules' && s !== 'dist').join(', ')})`);
  }
  for (const m of moduller()) {
    for (const e of fs.readdirSync(path.join(KOK, m), { withFileTypes: true })) {
      if (e.isDirectory()) ihlal.push(`R4 ${m}/${e.name}/ (modül içinde alt klasör yok; düz tek seviye)`);
    }
  }
  return ihlal;
};

const sinirIhlalleri = () => {
  const ihlal = [];
  const liste = moduller();
  const kaynaklar = [...modulDosyalari().map((d) => ({ dosya: d, modul: ilkKlasor(d) })), { dosya: path.join(KOK, 'server.ts'), modul: null }];
  for (const { dosya, modul } of kaynaklar) {
    for (const { hedef } of icAktarmalar(fs.readFileSync(dosya, 'utf8'))) {
      if (!hedef.startsWith('.')) continue;
      const anahtar = `${goreli(dosya)} -> ${hedef}`;
      if (ISTISNALAR[anahtar]) continue;
      const { klasor, kalan } = hedefKonumu(dosya, hedef);
      if (sinirIhlaliMi(modul, klasor, kalan, liste))
        ihlal.push(`R6 ${anahtar} (${klasor} modülünün iç dosyasına erişilemez; ${klasor}/index.ts kullanılmalı)`);
    }
  }
  return ihlal;
};

const modulGrafi = () => {
  const graf = Object.fromEntries(moduller().map((m) => [m, new Set()]));
  const liste = moduller();
  for (const dosya of modulDosyalari()) {
    const modul = ilkKlasor(dosya);
    for (const { hedef } of icAktarmalar(fs.readFileSync(dosya, 'utf8'))) {
      if (!hedef.startsWith('.')) continue;
      const { klasor } = hedefKonumu(dosya, hedef);
      if (liste.includes(klasor) && klasor !== modul) graf[modul].add(klasor);
    }
  }
  return Object.fromEntries(
    Object.entries(graf)
      .filter(([, s]) => s.size > 0)
      .map(([m, s]) => [m, [...s].sort()]),
  );
};

const indexIhlalleri = () => {
  const ihlal = [];
  for (const m of moduller()) {
    const temiz = fs
      .readFileSync(path.join(KOK, m, 'index.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const satir of temiz
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (
        !/^export\s+(type\s+)?(\*|\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+['"][^'"]+['"];?$/.test(satir) &&
        !/^export\s+\{\s*default\s+as\s+\w+(\s*,\s*\w+)*\s*\}\s+from\s+['"][^'"]+['"];?$/.test(satir)
      ) {
        ihlal.push(`R8 ${m}/index.ts: "${satir}" (index.ts yalnızca "export ... from" satırlarından oluşur)`);
      }
    }
  }
  return ihlal;
};

// --- Tarayıcının kendisi (testin boşuna geçmediğinden emin olmak için) ---

test('tarayıcı: import, import type, export-from, yan etkili import ve require ifadelerini ayırt eder', () => {
  const ornek = `
    // import { yorum } from './yorum.repository';
    /* import { blok } from './blok.repository'; */
    import express, { Router } from 'express';
    import type { Satir } from './a.repository';
    import {
      x,
      y,
    } from './b.service';
    export { z } from './c.gorunum';
    import './d.yanetki';
    const e = require('./e.hesap');
  `;
  assert.deepEqual(icAktarmalar(ornek), [
    { hedef: 'express', tip: false },
    { hedef: './a.repository', tip: true },
    { hedef: './b.service', tip: false },
    { hedef: './c.gorunum', tip: false },
    { hedef: './d.yanetki', tip: false },
    { hedef: './e.hesap', tip: false },
  ]);
});

test('tarayıcı: katman dosya adından bulunur', () => {
  assert.equal(katman('musteriler/musteriler.service.ts'), 'service');
  assert.equal(katman('motor/ikinciElMotor.gorunum.ts'), 'gorunum');
  assert.equal(katman('vitrin/vitrinOrtak.ts'), null);
  assert.equal(katman('platform/lib/stok.ts'), null);
});

test('tarayıcı: modül sınırı kuralı (iç dosya yasak, index.ts serbest, kendi modülü serbest)', () => {
  const liste = ['musteriler', 'motor'];
  assert.equal(sinirIhlaliMi('motor', 'musteriler', 'musteriler.service', liste), true, 'iç dosyaya erişim ihlaldir');
  assert.equal(sinirIhlaliMi('motor', 'musteriler', '', liste), false, "'../musteriler' index.ts demektir");
  assert.equal(sinirIhlaliMi('motor', 'musteriler', 'index', liste), false);
  assert.equal(sinirIhlaliMi('motor', 'motor', 'sifirMotor.service', liste), false, 'kendi modülü serbest');
  assert.equal(sinirIhlaliMi('motor', 'platform', 'lib/stok', liste), false, 'platform modül değildir');
  assert.equal(sinirIhlaliMi(null, 'motor', 'ikinciElMotor.routes', liste), true, 'server.ts de iç dosyaya erişemez');
});

test('tarayıcı: modül döngüsünü bulur, döngüsüz grafiği geçirir', () => {
  assert.deepEqual(dongu({ a: ['b'], b: ['c'], c: ['a'] }), ['a', 'b', 'c', 'a']);
  assert.deepEqual(dongu({ a: ['b'], b: ['a'] }), ['a', 'b', 'a']);
  assert.equal(dongu({ a: ['b', 'c'], b: ['c'], c: [] }), null);
  assert.equal(dongu({}), null);
});

test('tarayıcı: gerçekten modül ve dosya buluyor', () => {
  assert.ok(moduller().length >= 9, `beklenenden az modül: ${moduller().join(', ')}`);
  assert.ok(modulDosyalari().length > 80, `beklenenden az dosya: ${modulDosyalari().length}`);
  assert.ok(tsDosyalari(ALTYAPI).length > 15, 'platform/ boş ya da yok');
  for (const m of moduller()) assert.ok(tsDosyalari(m).length > 1, `${m}/ boş`);
});

// --- Kurallar ---

test('R1+R2: modül içinde katman sırası bozulmamış, service/repository express bilmiyor', () => {
  assert.deepEqual(katmanIhlalleri(), []);
});

test('R3: platform/ modüllere bağlanmıyor ve içinde katman dosyası yok', () => {
  assert.deepEqual(platformIhlalleri(), []);
});

test('R4: her üst klasör modül ya da sistem klasörü; modül içinde alt klasör yok', () => {
  assert.deepEqual(yerlesimIhlalleri(), []);
});

test('R5: eski klasörler (modules/, core/, shared/ ve katman klasörleri) kökte geri gelmedi', () => {
  assert.deepEqual(
    ESKI_KLASORLER.filter((k) => fs.existsSync(path.join(KOK, k))),
    [],
  );
});

test('R6: modüller birbirinin iç dosyasına değil, yalnızca index.ts arayüzüne bağlanıyor', () => {
  assert.deepEqual(sinirIhlalleri(), []);
});

test('R7: modüller arası bağlar listedekilerle birebir aynı ve döngü yok', () => {
  const graf = modulGrafi();
  assert.deepEqual(graf, MODUL_BAGLARI, 'bağ eklediysen/kaldırdıysan MODUL_BAGLARI listesini gerekçesiyle güncelle');
  assert.equal(dongu(graf), null);
});

test('R8: index.ts yalnızca dışa aktarma satırlarından oluşuyor', () => {
  assert.deepEqual(indexIhlalleri(), []);
});

test('istisna listesi boş kalmalı (büyütmek için gerekçe şart)', () => {
  assert.deepEqual(Object.keys(ISTISNALAR), []);
});
