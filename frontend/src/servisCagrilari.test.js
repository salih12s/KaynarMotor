// "api.js'te tanımlı olmayan servis metodunu çağırmak" hatasını (örn. aksesuarStokService.bulkImport)
// derleme zamanında değil çalışma zamanında yakalıyorduk: Aksesuar Stok "İçe Aktar" düğmesi hiç çalışmıyordu.
// Bu test, kaynak koddaki TÜM `xxxService.metot` çağrılarının bir `export const xxxService = { ... }` tanımına
// karşılık geldiğini denetler. Klasör yapısından bağımsızdır (src altındaki her dosyayı tarar).
const fs = require('fs');
const path = require('path');

const KOK = __dirname;
const dosyalar = [];
(function gez(klasor) {
  for (const ad of fs.readdirSync(klasor)) {
    const yol = path.join(klasor, ad);
    if (fs.statSync(yol).isDirectory()) gez(yol);
    else if (/\.(js|jsx|ts|tsx)$/.test(ad) && !/\.test\.(js|jsx|ts|tsx)$/.test(ad)) dosyalar.push(yol);
  }
})(KOK);

const kaynak = Object.fromEntries(dosyalar.map((d) => [path.relative(KOK, d), fs.readFileSync(d, 'utf8')]));

// export const xServis = { metot: ..., metot2: ... };  (üst düzey anahtarlar; iç içe nesneler atlanır)
const tanimlar = {};
for (const metin of Object.values(kaynak)) {
  for (const m of metin.matchAll(/export const (\w+Service) = \{\n([\s\S]*?)\n\};/g)) {
    const anahtarlar = new Set();
    for (const satir of m[2].split('\n')) {
      const a = /^ {2}(\w+):/.exec(satir);
      if (a) anahtarlar.add(a[1]);
    }
    tanimlar[m[1]] = anahtarlar;
  }
}

describe('servis çağrıları', () => {
  test('en az birkaç servis tanımı bulunur (tarama gerçekten çalışıyor)', () => {
    expect(Object.keys(tanimlar).length).toBeGreaterThanOrEqual(5);
  });

  test('her xxxService.metot çağrısı tanımlı bir metoda karşılık gelir', () => {
    const tanimsiz = [];
    for (const [dosya, metin] of Object.entries(kaynak)) {
      for (const m of metin.matchAll(/\b(\w+Service)\.(\w+)\b/g)) {
        const [, servis, metot] = m;
        if (!tanimlar[servis]) continue; // başka bir şey (ör. servisGecmisiService olmayan ad)
        if (!tanimlar[servis].has(metot)) tanimsiz.push(`${dosya}: ${servis}.${metot}`);
      }
    }
    expect(tanimsiz).toEqual([]);
  });
});
