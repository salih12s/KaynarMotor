require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./config/initDb');
const { pool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5100;

// Uygulama bir ters vekil sunucunun arkasında çalışır (Hostinger'da LiteSpeed/CDN). Bu ayar
// olmadan req.ip vekilin adresini gösterir; hız sınırlama ve aktivite logu yanlış IP kaydeder.
// Değerin sayı olması (true değil) express-rate-limit'in "aşırı geniş" uyarısını da önler.
// Vekil sayısı farklıysa TRUST_PROXY ortam değişkeniyle ayarlanır.
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3100',
  'http://localhost:5000',
  'http://localhost:5100',
  'https://web-production-ac0ed.up.railway.app',
  // Hostinger prova adresi (kaynarmotor.com.tr'ye geçişten önce denenir)
  'https://yeni.kaynarmotor.com.tr',
  'https://kaynarmotor.com.tr',
  'https://www.kaynarmotor.com.tr',
  'http://kaynarmotor.com.tr',
  'http://www.kaynarmotor.com.tr',
  // Eski domain (geriye dönük uyumluluk)
  'https://kaynarmotorservis.com',
  'https://www.kaynarmotorservis.com',
  'http://kaynarmotorservis.com',
  'http://www.kaynarmotorservis.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // origin olmayan istekler (same-origin, Postman vs.)
    // Production'da frontend backend tarafından servis edildiği için ana uygulama
    // buradan geçer; CORS kontrolü yalnızca farklı origin'lerden gelen istekler içindir.
    if (!origin) return callback(null, true);
    // Bilinen origin'ler veya development modunda hepsine izin ver
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    // Bilinmeyen origin reddedilir. Yeni bir alan adından servis ediyorsanız
    // FRONTEND_URL ortam değişkenini o adrese ayarlayın; aşağıdaki log hangi
    // origin'in reddedildiğini gösterir.
    console.warn(`CORS reddedildi: ${origin} (izin vermek için FRONTEND_URL ayarlayın)`);
    callback(Object.assign(new Error('CORS policy violation'), { status: 403 }));
  },
  credentials: true
}));

// Güvenlik başlıkları.
// contentSecurityPolicy kapalı: CRA build'i inline script/stil üretir, varsayılan CSP
// bunları engelleyip arayüzü bozar. crossOriginResourcePolicy 'cross-origin':
// vitrin görsel/videoları API'den farklı bir origin'deki siteye servis ediliyor.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// Kimlik doğrulama ve yetkilendirme middleware'leri (bkz. middleware/)
const { authenticateToken, isAdmin } = require('./middleware/auth');
const {
  modulYetkisi, yazmaYetkisi, rolYetkisi, motorYazmaYetkisi, vitrinYetkili, kariGizle
} = require('./middleware/yetki');

// Gövde limiti: yüksek limit yalnızca vitrin yükleme uçlarında gerekli (görsel/video base64, 120 MB).
// Bu devasa gövde KİMLİK DOĞRULANMADAN okunursa yetkisiz biri sunucu belleğini şişirebilir. Bu yüzden
// vitrinde GET dışındaki her istek önce doğrulanır ve vitrin yetkisi aranır; gövde ondan SONRA okunur.
// Vitrin gövde ayrıştırıcısı genel limitten ÖNCE gelmeli; gövde bir kez ayrıştırıldığında
// express.json sonraki çağrıda devreye girmez.
const vitrinYazmaKapisi = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  authenticateToken(req, res, () => vitrinYetkili(req, res, next));
};
app.use('/api/vitrin', vitrinYazmaKapisi);
app.use('/api/vitrin', express.json({ limit: '120mb' }));
app.use(express.json({ limit: '10mb' }));

// Routes
const authRoutes = require('./routes/auth');
const musteriRoutes = require('./routes/musteriler');
const isEmriRoutes = require('./routes/isEmirleri');
const aksesuarRoutes = require('./routes/aksesuarlar');
const aksesuarStokRoutes = require('./routes/aksesuarStok');
const ikinciElMotorRoutes = require('./routes/ikinciElMotor');
const satisBelgeRoutes = require('./routes/satisBelgeleri');
const eticaretRoutes = require('./routes/eticaret');
const yedekParcaRoutes = require('./routes/yedekParcalar');
const yedekParcaStokRoutes = require('./routes/yedekParcaStok');
const raporRoutes = require('./routes/raporlar');
const veresiyeRoutes = require('./routes/veresiye');
const vitrinRoutes = require('./routes/vitrin');
const servisGecmisiRoutes = require('./routes/servisGecmisi');

// Yetkilendirme kuralları frontend/src/App.jsx içindeki route guard'larıyla birebir
// eşleşecek şekilde seçilmiştir. Bazı uçlar sahibi olmadıkları ekranlar tarafından da
// OKUMA amaçlı kullanıldığından (ör. stok araması servis/e-ticaret/rapor ekranlarında),
// bu uçlarda yalnızca yazma işlemleri yetkiye bağlanır — bkz. middleware/yetki.js.
app.use('/api/auth', authRoutes);
// Müşteri: arama uçları tüm modüllerdeki formlar tarafından kullanılır,
// yönetim uçları admin'e kısıtlıdır — kural route dosyası içinde uygulanır.
app.use('/api/musteriler', authenticateToken, kariGizle, musteriRoutes);
app.use('/api/is-emirleri', authenticateToken, kariGizle, modulYetkisi('servis_yetkisi'), isEmriRoutes);
app.use('/api/aksesuarlar', authenticateToken, kariGizle, modulYetkisi('aksesuar_yetkisi'), aksesuarRoutes);
app.use('/api/aksesuar-stok', authenticateToken, yazmaYetkisi('aksesuar_stok_yetkisi'), aksesuarStokRoutes);
app.use('/api/ikinci-el-motor', authenticateToken, kariGizle, motorYazmaYetkisi, ikinciElMotorRoutes);
// Satış belgeleri (sözleşme vb.): yetki kontrolü route dosyasında; yükleme gövdesi ham ikili (express.raw)
app.use('/api/satis-belgeleri', authenticateToken, satisBelgeRoutes);
app.use('/api/eticaret', authenticateToken, kariGizle, modulYetkisi('eticaret_yetkisi'), eticaretRoutes);
app.use('/api/yedek-parcalar', authenticateToken, modulYetkisi('yedek_parca_yetkisi'), yedekParcaRoutes);
app.use('/api/yedek-parca-stok', authenticateToken, yazmaYetkisi('yedek_parca_yetkisi'), yedekParcaStokRoutes);
app.use('/api/raporlar', authenticateToken, kariGizle, rolYetkisi('admin', 'yatirimci'), raporRoutes);
app.use('/api/veresiye', authenticateToken, rolYetkisi('admin'), veresiyeRoutes);
// Vitrin: public + admin uçları karışık; auth route içinde uygulanır
app.use('/api/vitrin', vitrinRoutes(authenticateToken, isAdmin));
// Müşteri servis geçmişi (QR ile erişilen halka açık sayfa) — token bazlı, auth gerektirmez
app.use('/api/servis-gecmisi', servisGecmisiRoutes);

// Health check
// NOT: Production'daki SPA catch-all ('*') bu satırdan SONRA tanımlanmalı,
// aksi hâlde /api/health isteği catch-all'a takılıp index.html döner.
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Veritabanı sağlık kontrolü (deploy sonrası duman testi). Ayrıntı sızdırmaz.
app.get('/api/health/database', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK' });
  } catch (error) {
    console.error('Veritabanı sağlık kontrolü başarısız:', error.message);
    res.status(503).json({ status: 'HATA' });
  }
});

// Arayüzü sun (production). Hostinger paketinde arayüz sunucunun yanındaki "public" klasöründedir;
// depodan çalışırken frontend/build kullanılır.
if (process.env.NODE_ENV === 'production') {
  const paketlenmis = path.join(__dirname, 'public');
  const arayuzKlasoru = fs.existsSync(paketlenmis) ? paketlenmis : path.join(__dirname, '../frontend/build');
  // Derleme çıktısındaki dosya adları içerik özetli olduğundan sonsuza kadar önbelleğe alınabilir.
  app.use('/static', express.static(path.join(arayuzKlasoru, 'static'), { immutable: true, maxAge: '1y', index: false }));
  app.use(express.static(arayuzKlasoru, { index: false }));
  // /api ile başlayan bilinmeyen adres arayüz sayfası yerine 404 JSON döner.
  app.use('/api', (req, res) => res.status(404).json({ message: 'Bulunamadı' }));
  app.get('*', (req, res) => {
    // Uzantılı bir dosya (örn. /eski.mp4) bulunamadıysa arayüz sayfası yerine 404 döner.
    if (/\.[A-Za-z0-9]{2,8}$/.test(req.path)) return res.status(404).type('text/plain').send('Bulunamadı');
    // index.html önbelleğe alınmaz: yeni sürüm yayınlanınca tarayıcı yeni dosya adlarını görsün.
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(arayuzKlasoru, 'index.html'));
  });
}

// Global hata yakalayıcı.
// Route'larda yakalanmayan hatalar buraya düşer; istemciye hiçbir zaman yığın izi
// (stack trace) sızdırılmaz, ayrıntı yalnızca sunucu loguna yazılır.
// eslint-disable-next-line no-unused-vars -- Express hata middleware'i 4 argüman ister
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  // İstemci kaynaklı hatalar (bozuk JSON, büyük gövde, reddedilen origin) 500 değildir ve yığın izi gerektirmez.
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Gönderilen veri boyutu çok büyük' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Geçersiz istek gövdesi (JSON okunamadı)' });
  }
  if (err && err.message === 'CORS policy violation') {
    return res.status(403).json({ message: 'Bu adresten erişime izin verilmiyor' });
  }
  if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: 'Geçersiz istek' });
  }
  console.error('Yakalanmayan hata:', err);
  res.status(500).json({ message: 'Sunucu hatası' });
});

// Beklenmeyen hata sürecin sessizce ölmesine yol açmasın: Hostinger'da süreç kapanınca site 503 verir.
process.on('unhandledRejection', (neden) => {
  console.error('Yakalanmayan söz reddi:', neden);
});
process.on('uncaughtException', (hata) => {
  console.error('Yakalanmayan istisna:', hata);
});

// Start server (DB'den bağımsız)
app.listen(PORT, () => {
  console.log(`Sunucu port ${PORT} üzerinde çalışıyor`);
});

// DB init arka planda
const MAX_RETRIES = 10;
let retryCount = 0;

const tryInitDb = async () => {
  try {
    await initializeDatabase();
    console.log('Veritabanı başarıyla başlatıldı');
  } catch (error) {
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(retryCount * 5000, 30000);
      console.log(`DB init denemesi ${retryCount}/${MAX_RETRIES} başarısız. ${delay / 1000}s sonra tekrar...`);
      setTimeout(tryInitDb, delay);
    } else {
      console.error('Veritabanı başlatılamadı:', error.message);
    }
  }
};

tryInitDb();

module.exports = { authenticateToken, isAdmin };
