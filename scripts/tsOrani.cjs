/**
 * Frontend'in TypeScript oranını ölçer: .ts/.tsx dosya ve satır sayısı / toplam (.js/.jsx/.ts/.tsx).
 * Her geçiş aşamasının sonunda çalıştırılır (docs/VITE-TS-YOL-HARITASI.md).
 *
 * Kullanım (depo kökünden):  node scripts/tsOrani.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const kaynak = path.resolve(__dirname, '..', 'frontend', 'src');
const sayac = { ts: { dosya: 0, satir: 0 }, js: { dosya: 0, satir: 0 } };

function gez(klasor) {
  for (const ad of fs.readdirSync(klasor)) {
    const yol = path.join(klasor, ad);
    if (fs.statSync(yol).isDirectory()) {
      gez(yol);
      continue;
    }
    const tur = /\.(ts|tsx)$/.test(ad) ? 'ts' : /\.(js|jsx)$/.test(ad) ? 'js' : null;
    if (!tur) continue;
    sayac[tur].dosya += 1;
    sayac[tur].satir += fs.readFileSync(yol, 'utf8').split('\n').length;
  }
}

gez(kaynak);

const yuzde = (a, b) => (a + b === 0 ? 0 : (100 * a) / (a + b)).toFixed(1);
console.log(`TypeScript: ${sayac.ts.dosya} dosya, ${sayac.ts.satir} satır`);
console.log(`JavaScript: ${sayac.js.dosya} dosya, ${sayac.js.satir} satır`);
console.log(`Oran: dosyaların %${yuzde(sayac.ts.dosya, sayac.js.dosya)}'i, satırların %${yuzde(sayac.ts.satir, sayac.js.satir)}'i TypeScript`);
