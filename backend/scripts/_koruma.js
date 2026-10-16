/*
 * Tek seferlik veri scriptleri için emniyet kilidi.
 *
 * Bu scriptler (silme/güncelleme/içe aktarma) bağlı olunan veritabanına doğrudan yazar; yanlışlıkla
 * çalıştırılırsa canlı veriyi bozabilir. Her script en üstte `require('./_koruma')` ile bu dosyayı çağırır:
 * hedef veritabanı ekrana yazılır ve komut satırında `--onayliyorum` yoksa script HİÇBİR ŞEY yapmadan çıkar.
 *
 *   node scripts/fixFatura.js --onayliyorum
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config();

const hedef = `${process.env.DB_HOST || '(DB_HOST yok)'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || '(DB_NAME yok)'}`;

if (!process.argv.includes('--onayliyorum')) {
  console.error(`Durduruldu. Bu script veritabanına yazar. Hedef: ${hedef}`);
  console.error('Emin iseniz komuta --onayliyorum ekleyerek yeniden çalıştırın (önce yedek alın).');
  process.exit(1);
}
console.log(`Hedef veritabanı: ${hedef}`);
