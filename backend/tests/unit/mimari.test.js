/*
 * MİMARİ testi: backend klasör düzenini ve katman kuralını makineye zorlatır (yeni kod kuralı sessizce bozamasın).
 *
 *   routes/ → controllers/ → services/ → repositories/ → database/
 *   (HTTP)    (istek/yanıt)   (iş kuralı)  (SQL)
 *
 * Klasörler: routes, controllers, services, repositories, schemas, rules (saf kurallar: *.gorunum, *.hesap, komisyon, vitrinOrtak)
 * Altyapı:   middleware, database, lib
 *
 * R1  Katman sırası (yalnızca ÇALIŞMA ZAMANI içe aktarmaları; `import type` serbest: çalışma zamanında bağ kurmaz).
 *     routes → controller, schemas · controller → service, schemas, gorunum, hesap · service → repository, schemas, gorunum, hesap
 *     repository → (başka katman yok) · gorunum/hesap saf kuraldır → yalnızca gorunum, hesap
 * R2  `express` yalnızca routes ve controller'da (service/repository/saf kurallar HTTP bilmez; tip olarak bile).
 * R3  Altyapı klasörleri (middleware, database, lib) katman klasörlerine bağlanamaz (bağımlılık içeriden dışarı akmaz).
 * R4  Dosya doğru klasörde: *.service.ts yalnız services/'te, *.routes.ts yalnız routes/'ta ... (gorunum/hesap/katmansız → rules/).
 * R5  Eski klasörler (modules/, core/, shared/) geri gelmez.
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

// Dosya adı soneki → bulunması gereken klasör
const KLASOR = { routes: 'routes', controller: 'controllers', service: 'services', repository: 'repositories', schemas: 'schemas', gorunum: 'rules', hesap: 'rules' };
const KATMAN_KLASORLERI = ['routes', 'controllers', 'services', 'repositories', 'schemas', 'rules'];
const ALTYAPI_KLASORLERI = ['middleware', 'database', 'lib'];
const ESKI_KLASORLER = ['modules', 'core', 'shared'];

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
  const re = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^'";]*?\bfrom\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
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

const katmanDosyalari = () => KATMAN_KLASORLERI.flatMap(tsDosyalari);
const goreli = (dosya) => path.relative(KOK, dosya).split(path.sep).join('/');
const ilkKlasor = (dosya) => goreli(dosya).split('/')[0];

const katmanIhlalleri = () => {
  const ihlal = [];
  for (const dosya of katmanDosyalari()) {
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
      const hk = katman(hedef + '.ts');
      if (!hk || hk === k) continue; // katmansız yardımcı (lib, rules/komisyon) ya da aynı katman
      if (!IZINLI[k].includes(hk)) ihlal.push(`R1 ${anahtar} (${k} → ${hk} yasak; izinli: ${IZINLI[k].join(', ') || 'hiçbiri'})`);
    }
  }
  return ihlal;
};

const altyapiIhlalleri = () => {
  const ihlal = [];
  for (const dosya of ALTYAPI_KLASORLERI.flatMap(tsDosyalari)) {
    for (const { hedef } of icAktarmalar(fs.readFileSync(dosya, 'utf8'))) {
      if (!hedef.startsWith('.')) continue;
      const hedefKlasor = ilkKlasor(path.resolve(path.dirname(dosya), hedef));
      if (KATMAN_KLASORLERI.includes(hedefKlasor)) ihlal.push(`R3 ${goreli(dosya)} -> ${hedef} (${ilkKlasor(dosya)}/ ${hedefKlasor}/ klasörüne bağlanamaz)`);
    }
  }
  return ihlal;
};

const yerlesimIhlalleri = () => {
  const ihlal = [];
  for (const dosya of katmanDosyalari()) {
    const k = katman(dosya);
    const beklenen = k ? KLASOR[k] : 'rules'; // katmansız yardımcılar (komisyon, vitrinOrtak) rules/ altında
    if (ilkKlasor(dosya) !== beklenen) ihlal.push(`R4 ${goreli(dosya)} (${k || 'katmansız'} dosyası ${beklenen}/ içinde olmalı)`);
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
  assert.equal(katman('services/musteriler.service.ts'), 'service');
  assert.equal(katman('rules/ikinciElMotor.gorunum.ts'), 'gorunum');
  assert.equal(katman('rules/vitrinOrtak.ts'), null);
});

test('tarayıcı: gerçekten dosya buluyor (her katman klasöründe dosya var)', () => {
  assert.ok(katmanDosyalari().length > 60, `beklenenden az dosya: ${katmanDosyalari().length}`);
  for (const klasor of KATMAN_KLASORLERI) assert.ok(tsDosyalari(klasor).length > 0, `${klasor}/ boş ya da yok`);
  for (const klasor of ALTYAPI_KLASORLERI) assert.ok(tsDosyalari(klasor).length > 0, `${klasor}/ boş ya da yok`);
});

// --- Kurallar ---

test('R1+R2: katman sırası bozulmamış, service/repository express bilmiyor', () => {
  assert.deepEqual(katmanIhlalleri(), []);
});

test('R3: middleware/, database/ ve lib/ katman klasörlerine bağlanmıyor', () => {
  assert.deepEqual(altyapiIhlalleri(), []);
});

test('R4: her dosya kendi katman klasöründe (service → services/, routes → routes/ ...)', () => {
  assert.deepEqual(yerlesimIhlalleri(), []);
});

test('R5: eski klasörler (modules/, core/, shared/) geri gelmedi', () => {
  assert.deepEqual(
    ESKI_KLASORLER.filter((k) => fs.existsSync(path.join(KOK, k))),
    [],
  );
});

test('istisna listesi boş kalmalı (büyütmek için gerekçe şart)', () => {
  assert.deepEqual(Object.keys(ISTISNALAR), []);
});
