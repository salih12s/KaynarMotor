/*
 * MİMARİ testi: docs/TS-GECISI.md'deki katman kuralını makineye zorlatır (yeni kod kuralı sessizce bozamasın).
 *
 *   routes → controller → service → repository → veritabanı
 *   (HTTP)   (istek/yanıt)  (iş kuralı)  (SQL)
 *
 * R1  Katman sırası (yalnızca ÇALIŞMA ZAMANI içe aktarmaları; `import type` serbest: çalışma zamanında bağ kurmaz).
 *     routes → controller, schemas · controller → service, schemas, gorunum, hesap · service → repository, schemas, gorunum, hesap
 *     repository → (başka katman yok) · gorunum/hesap saf kuraldır → yalnızca gorunum, hesap
 * R2  `express` yalnızca routes ve controller'da (service/repository/saf kurallar HTTP bilmez; tip olarak bile).
 * R3  core/ ve shared/ modules/'a bağlanamaz (bağımlılık içeriden dışarı akmaz).
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

// "<modules'a göre dosya yolu> -> <içe aktarılan>": gerekçe. Boş olması hedeftir.
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
  const gez = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') gez(p);
      } else if (p.endsWith('.ts')) cikti.push(p);
    }
  };
  gez(klasor);
  return cikti;
};

const goreli = (dosya) => path.relative(KOK, dosya).split(path.sep).join('/');

const modulIhlalleri = () => {
  const ihlal = [];
  for (const dosya of tsDosyalari(path.join(KOK, 'modules'))) {
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
      if (!hk || hk === k) continue; // katmansız yardımcı (core, ortak dosya) ya da aynı katman
      if (!IZINLI[k].includes(hk)) ihlal.push(`R1 ${anahtar} (${k} → ${hk} yasak; izinli: ${IZINLI[k].join(', ') || 'hiçbiri'})`);
    }
  }
  return ihlal;
};

const icdenDisaIhlalleri = () => {
  const ihlal = [];
  for (const klasor of ['core', 'shared']) {
    for (const dosya of tsDosyalari(path.join(KOK, klasor))) {
      for (const { hedef } of icAktarmalar(fs.readFileSync(dosya, 'utf8'))) {
        if (hedef.startsWith('.') && /(^|\/)modules(\/|$)/.test(hedef)) ihlal.push(`R3 ${goreli(dosya)} -> ${hedef} (${klasor}/ modules'a bağlanamaz)`);
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
  assert.equal(katman('modules/musteriler/musteriler.service.ts'), 'service');
  assert.equal(katman('modules/motor/ikinciElMotor/ikinciElMotor.gorunum.ts'), 'gorunum');
  assert.equal(katman('modules/vitrin/vitrin.ortak.ts'), null);
});

test('tarayıcı: gerçekten dosya buluyor (her modülde controller ve service var)', () => {
  const dosyalar = tsDosyalari(path.join(KOK, 'modules'));
  assert.ok(dosyalar.length > 50, `beklenenden az dosya: ${dosyalar.length}`);
  for (const k of ['routes', 'controller', 'service', 'repository']) {
    assert.ok(dosyalar.some((d) => katman(d) === k), `${k} katmanında dosya bulunamadı`);
  }
});

// --- Kurallar ---

test('R1+R2: katman sırası bozulmamış, service/repository express bilmiyor', () => {
  assert.deepEqual(modulIhlalleri(), []);
});

test("R3: core/ ve shared/ modules/'a bağlanmıyor", () => {
  assert.deepEqual(icdenDisaIhlalleri(), []);
});

test('istisna listesi boş kalmalı (büyütmek için gerekçe şart)', () => {
  assert.deepEqual(Object.keys(ISTISNALAR), []);
});
