/*
 * Ortam hazırlığı (YAN ETKİ modülü): server.ts bunu İLK içe aktarır. ES `import`'lar yukarı taşındığı ve core/db gibi
 * modüller yüklenir yüklenmez ortam değişkenlerini okuduğu için, .env dosyaları başka hiçbir şey yüklenmeden ÖNCE burada okunur.
 *
 * Sıra (eskiden server.js'in ilk satırları): önce depo kökündeki .env, sonra çalışma klasöründeki .env. Zaten tanımlı
 * ortam değişkenleri ezilmez (dotenv varsayılanı).
 */
import path from 'node:path';
import dotenv from 'dotenv';

// Kaynaktan (core/ içinden) çalışırken depo kökü iki üstte; esbuild paketinde (dist/main.cjs) bir üstte (eski davranış).
const kok = path.basename(__dirname) === 'core' ? path.resolve(__dirname, '..', '..') : path.resolve(__dirname, '..');
dotenv.config({ path: path.join(kok, '.env') });
dotenv.config();

// Oturum imzası için gizli anahtar şart: yoksa sunucu açılmaz (eskiden açılır, giriş yapan herkese 500 verirdi).
if (!process.env.JWT_SECRET) {
  console.error('HATA: JWT_SECRET tanımlı değil; sunucu başlatılmadı. Güçlü, rastgele bir değer verin (en az 32 karakter).');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.warn('UYARI: JWT_SECRET 32 karakterden kısa; üretimde güçlü ve rastgele bir değer kullanın.');
}
