const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/*
 * Kimlik doğrulama.
 *
 * Token yalnızca "kim" olduğunu kanıtlar (id). Rol ve yetkiler HER İSTEKTE veritabanından okunur
 * (kısa süreli önbellekle). Eskiden yetkiler 24 saatlik token'ın içinde taşınıyordu: yetkisi alınan, hesabı
 * silinen ya da reddedilen kullanıcı token süresi dolana kadar çalışmaya devam ediyordu.
 *
 * Önbellek: kullanıcı başına 15 sn. Yönetici bir kullanıcıyı değiştirince/silince kullaniciOnbellegiTemizle çağrılır
 * ve etki ANINDA olur. Birden fazla sunucu süreci çalışırsa diğer süreçlerde etki en geç 15 sn sonra görülür.
 */
const KULLANICI_KOLONLARI = [
  'id', 'kullanici_adi', 'ad_soyad', 'rol', 'onay_durumu',
  'aksesuar_yetkisi', 'motor_satis_yetkisi', 'eticaret_yetkisi', 'servis_yetkisi',
  'aksesuar_stok_yetkisi', 'yedek_parca_yetkisi', 'motor_vitrin_yetkisi', 'aksesuar_vitrin_yetkisi',
  'liste_fiyati_gor', 'alis_fiyati_gor', 'satis_fiyati_gor', 'kar_gor', 'musteri_gor', 'satis_gecmisi_gor',
].join(', ');
const ONBELLEK_MS = 15000;
const onbellek = new Map(); // id -> { kullanici | null, bitis }

const kullaniciGetir = async (id) => {
  const simdi = Date.now();
  const kayit = onbellek.get(id);
  if (kayit && kayit.bitis > simdi) return kayit.kullanici;
  const sonuc = await pool.query(`SELECT ${KULLANICI_KOLONLARI} FROM kullanicilar WHERE id = $1`, [id]);
  const kullanici = sonuc.rows[0] || null; // bulunamadıysa da önbelleğe alınır (silinmiş kullanıcı)
  onbellek.set(id, { kullanici, bitis: simdi + ONBELLEK_MS });
  return kullanici;
};

// Yönetici bir kullanıcıyı onayladığında/reddettiğinde/sildiğinde/yetkisini ya da şifresini değiştirdiğinde çağrılır.
const kullaniciOnbellegiTemizle = (id) => {
  if (id === undefined) onbellek.clear(); else onbellek.delete(Number(id));
};

const tokenYukuOku = (req) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return { token: null };
  try {
    return { token, yuk: jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }) };
  } catch {
    return { token, yuk: null };
  }
};

// code alanı, frontend'in "oturum bitti" ile "bu işleme yetkin yok" (403) ayrımını
// mesaj metnine bakmadan yapabilmesi içindir; bkz. frontend/src/services/api.js.
const authenticateToken = async (req, res, next) => {
  const { token, yuk } = tokenYukuOku(req);
  if (!token) {
    return res.status(401).json({ message: 'Yetkilendirme token\'ı gerekli', code: 'TOKEN_MISSING' });
  }
  if (!yuk) {
    return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token', code: 'TOKEN_INVALID' });
  }
  // Veritabanı hatası fırlatırsa merkezi hata işleyicisi 500 döner (config/asyncHata.js)
  const kullanici = await kullaniciGetir(Number(yuk.id));
  if (!kullanici || kullanici.onay_durumu !== 'onaylandi') {
    return res.status(401).json({ message: 'Oturumunuz geçersiz. Lütfen yeniden giriş yapın.', code: 'TOKEN_INVALID' });
  }
  req.user = kullanici; // rol ve yetkiler token'dan DEĞİL veritabanından
  next();
};

// Herkese açık uçlarda "giriş yapmış (ve hâlâ geçerli) bir kullanıcı var mı?" sorusu için.
// Token yoksa/bozuksa/kullanıcı artık geçerli değilse null döner; yanıt yazmaz, hata fırlatmaz (token hatası dışında).
const opsiyonelKullanici = async (req) => {
  const { yuk } = tokenYukuOku(req);
  if (!yuk) return null;
  const kullanici = await kullaniciGetir(Number(yuk.id));
  return kullanici && kullanici.onay_durumu === 'onaylandi' ? kullanici : null;
};

const isAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
  }
  next();
};

module.exports = { authenticateToken, isAdmin, opsiyonelKullanici, kullaniciOnbellegiTemizle };
