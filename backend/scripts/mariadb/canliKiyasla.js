/**
 * Geçiş sonrası doğrulama: eski canlı sistem (Railway) ile yeni sistemi (Hostinger) HERKESE AÇIK
 * uçlarda yan yana kıyaslar (giriş gerekmez, yalnızca GET). İki sistem aynı veriye sahipken
 * (geçiş penceresinde) yanıtlar aynı olmalıdır.
 *
 *   node scripts/mariadb/canliKiyasla.js <eskiAdres> <yeniAdres> [--gorsel-ornek 60]
 * örn: node scripts/mariadb/canliKiyasla.js https://web-production-ac0ed.up.railway.app https://kaynarmotor.com.tr
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [eski, yeni] = process.argv.slice(2, 4).map((u) => (u || '').replace(/\/$/, ''));
if (!eski || !yeni) {
  console.error('Kullanım: canliKiyasla.js <eskiAdres> <yeniAdres>');
  process.exit(1);
}
const gi = process.argv.indexOf('--gorsel-ornek');
const GORSEL_ORNEK = gi > -1 ? Number(process.argv[gi + 1]) : 60;
const YEDEK = path.join(process.env.USERPROFILE || process.env.HOME, 'KaynarMariaDB', 'railway-yedek');

async function al(taban, yol) {
  const r = await fetch(taban + yol, { headers: { Accept: '*/*' } });
  const tur = (r.headers.get('content-type') || '').split(';')[0];
  const buf = Buffer.from(await r.arrayBuffer());
  const s = { durum: r.status, tur };
  if (tur.includes('json')) {
    try { s.json = JSON.parse(buf.toString('utf8')); } catch { s.metin = buf.toString('utf8'); }
  } else if (tur.startsWith('text/')) s.metin = buf.toString('utf8');
  else s.sha = crypto.createHash('sha256').update(buf).digest('hex') + ':' + buf.length;
  return s;
}

const kanonik = (v) => {
  if (Array.isArray(v)) return v.map(kanonik);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, kanonik(v[k])]));
  return v;
};
// Ondalık metinlerin ölçeği ("1500" ile "1500.00") yok sayılır
const norm = (v) => JSON.stringify(kanonik(v), (k, x) => (typeof x === 'string' && /^-?\d+(\.\d+)?$/.test(x) ? String(Number(x)) : x));

(async () => {
  const yollar = ['/api/vitrin/segmentler', '/api/vitrin/iletisim', '/api/vitrin', '/api/vitrin?hepsi=1',
    '/api/vitrin?kategori=motor', '/api/vitrin?kategori=aksesuar', '/api/vitrin?kategori=yedek_parca',
    '/api/vitrin?kategori=motor&durum=ikinci_el', '/api/vitrin?kategori=motor&durum=sifir', '/api/vitrin?q=honda', '/api/vitrin?q=kask',
    '/api/vitrin?cc_min=100&cc_max=250', '/api/vitrin?km_max=20000', '/api/vitrin/markalar', '/api/vitrin/markalar?durum=ikinci_el',
    '/api/vitrin/markalar?durum=sifir', '/api/vitrin/iletisim-gorsel/motor', '/api/vitrin/iletisim-gorsel/nakliye',
    '/api/vitrin/iletisim-gorsel/bakim_servis', '/api/vitrin/iletisim-gorsel/sigorta', '/api/servis-gecmisi/yok'];
  // Tüm ilan ayrıntıları ve servis geçmişi sayfaları
  const liste = (await al(eski, '/api/vitrin?hepsi=1')).json || [];
  const ayrinti = [];
  for (const i of liste) { yollar.push(`/api/vitrin/${i.id}`); ayrinti.push(i.id); }
  const qr = fs.readFileSync(path.join(YEDEK, 'servis_qr_tokenler.ndjson'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).token);
  qr.forEach((t) => yollar.push(`/api/servis-gecmisi/${t}`));
  // Görseller: tüm kapak görselleri + her ilanın tüm görselleri (örnek sayısı kadar)
  const gorseller = new Set(liste.map((i) => i.kapak_gorsel_id).filter(Boolean));
  for (const id of ayrinti.slice(0, 40)) {
    const d = (await al(eski, `/api/vitrin/${id}`)).json;
    (d && d.gorsel_idler || []).forEach((g) => gorseller.add(g));
  }
  [...gorseller].slice(0, GORSEL_ORNEK).forEach((g) => yollar.push(`/api/vitrin/gorsel/${g}`));

  let ayni = 0;
  const farkli = [];
  for (const yol of yollar) {
    const [a, b] = await Promise.all([al(eski, yol), al(yeni, yol)]);
    // Liste uçlarında eşit anahtarlı satırların sırası serbest: elemanlar kanonik metinle sıralanır
    const sirala = (j) => (Array.isArray(j) ? [...j].map(kanonik).sort((x, y) => (norm(x) < norm(y) ? -1 : 1)) : j);
    const esit = a.durum === b.durum && a.tur === b.tur && a.sha === b.sha && a.metin === b.metin && norm(sirala(a.json)) === norm(sirala(b.json));
    if (esit) ayni++;
    else farkli.push({ yol, eski: a.durum, yeni: b.durum, tur: `${a.tur}≠${b.tur}` });
  }
  console.log(`${yollar.length} istek karşılaştırıldı: ${ayni} aynı, ${farkli.length} farklı`);
  farkli.slice(0, 20).forEach((f) => console.log(`  ✖ ${f.yol} (durum ${f.eski}/${f.yeni}) ${f.tur}`));
  process.exit(farkli.length ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
