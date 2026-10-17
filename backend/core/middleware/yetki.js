/*
 * Modül bazlı yetkilendirme.
 *
 * Bu kurallar frontend/src/App.jsx içindeki route guard'larının sunucu tarafındaki
 * karşılığıdır. Guard'lar yalnızca gezinmeyi kısıtlar; asıl koruma buradadır.
 *
 * ÖNEMLİ — okuma/yazma ayrımı:
 * Bazı uçlar, sahibi olmadıkları sayfalar tarafından da OKUMA amaçlı kullanılır.
 * Örneğin aksesuar stoğu; servis, e-ticaret, rapor ve vitrin ekranlarında ürün
 * aramak için okunur. Bu yüzden salt-okunur uçlar açık bırakılıp yalnızca yazma
 * işlemleri (POST/PUT/PATCH/DELETE) yetkiye bağlanır. Frontend'de tüm çapraz
 * kullanımların salt-okunur olduğu doğrulanmıştır.
 */

const YAZMA_METODLARI = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Verilen yetki alanlarından en az birine sahip olmayı zorunlu kılar.
// Admin her zaman geçer.
const modulYetkisi = (...alanlar) => (req, res, next) => {
  if (req.user.rol === 'admin') return next();
  if (alanlar.some((alan) => req.user[alan])) return next();
  return res.status(403).json({ message: 'Bu modül için yetkiniz yok' });
};

// Yalnızca yazma işlemlerinde yetki arar; GET istekleri serbest bırakılır.
const yazmaYetkisi = (...alanlar) => (req, res, next) => {
  if (!YAZMA_METODLARI.includes(req.method)) return next();
  if (req.user.rol === 'admin') return next();
  if (alanlar.some((alan) => req.user[alan])) return next();
  return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
};

// Belirli rollere kısıtlar.
const rolYetkisi = (...roller) => (req, res, next) => {
  if (roller.includes(req.user.rol)) return next();
  return res.status(403).json({ message: 'Bu bölüme erişim yetkiniz yok' });
};

// Yalnızca yazma işlemlerinde rol arar; GET istekleri serbest bırakılır.
const yazmaRolu = (...roller) => (req, res, next) => {
  if (!YAZMA_METODLARI.includes(req.method)) return next();
  if (roller.includes(req.user.rol)) return next();
  return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
};

// Vitrin yönetimi: admin VEYA motor/aksesuar vitrin yetkisi olan personel.
// Hem route'ta hem de gövde ayrıştırılmadan önce (server.js) kullanılır.
const vitrinYetkili = (req, res, next) => {
  const u = req.user || {};
  if (u.rol === 'admin' || u.motor_vitrin_yetkisi || u.aksesuar_vitrin_yetkisi) return next();
  return res.status(403).json({ message: 'Vitrin yönetim yetkiniz yok' });
};

// Motor kayıtlarında yazma yetkisi: admin veya motor satış yetkisi olan personel.
// Yatırımcı motor ekranında SALT OKUNURDUR (arayüzde de düzenleme yok): eskiden POST/PUT geçiyordu, yatırımcı
// kendi motorunun durumunu/plakasını değiştirebiliyor ve sahipsiz motor kaydı açabiliyordu.
// Okuma serbesttir; hassas alanlar zaten ikinciElMotor.js içindeki sanitizeMotor() tarafından gizlenir.
const motorYazmaYetkisi = (req, res, next) => {
  if (!YAZMA_METODLARI.includes(req.method)) return next();
  if (req.user.rol === 'admin') return next();
  if (req.user.rol !== 'yatirimci' && req.user.motor_satis_yetkisi) return next();
  return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
};

// Okuma uçlarını hangi yetkililerin kullandığı (ekran bağımlılıklarından): bu listeler dışındaki hesaplar
// (yatırımcı, muhasebeci, yetkisiz personel) müşteri dizinini ve stok maliyetlerini okuyamaz.
// Yeni bir ekran bu uçları kullanacaksa yetkisini buraya ekleyin.
const MUSTERI_ARAYANLAR = ['servis_yetkisi', 'aksesuar_yetkisi', 'motor_satis_yetkisi', 'yedek_parca_yetkisi'];
const AKSESUAR_STOK_OKUYANLAR = ['aksesuar_yetkisi', 'aksesuar_stok_yetkisi', 'eticaret_yetkisi', 'servis_yetkisi', 'motor_vitrin_yetkisi', 'aksesuar_vitrin_yetkisi'];
const YEDEK_PARCA_STOK_OKUYANLAR = ['yedek_parca_yetkisi', 'servis_yetkisi'];

// Karlılık bilgisi yalnızca admin'e açıktır. Bu alanlar admin dışındaki herkesin yanıtından,
// iç içe nesneler ve diziler dahil, silinir. Uç tek tek temizlenmediği için yeni bir uç kâr
// döndürse bile sızmaz. (kar_gor gibi kullanıcı bayrakları artık hiçbir şeyi açmaz.)
const KAR_ALANLARI = new Set(['kar', 'toplam_kar', 'kar_toplam', 'isletme_kar']);
// Yatırımcının kendi payı: yatırımcı kendi raporunda bunu görür, diğer roller görmez.
const YATIRIMCI_PAYI_ALANLARI = new Set(['yatirimci_kar', 'yatirimci_kar_orani', 'toplam_yatirimci_kar']);

const duzNesneMi = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

const alanlariSil = (v, gizli) => {
  if (Array.isArray(v)) return v.map((x) => alanlariSil(x, gizli));
  if (!duzNesneMi(v)) return v; // Date, Buffer, sayı, metin olduğu gibi kalır
  const temiz = {};
  for (const [k, x] of Object.entries(v)) {
    if (!gizli.has(k)) temiz[k] = alanlariSil(x, gizli);
  }
  return temiz;
};

const kariGizle = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') return next();
  const gizli = (req.user && req.user.rol === 'yatirimci')
    ? KAR_ALANLARI
    : new Set([...KAR_ALANLARI, ...YATIRIMCI_PAYI_ALANLARI]);
  const json = res.json.bind(res);
  res.json = (govde) => json(alanlariSil(govde, gizli));
  next();
};

module.exports = {
  modulYetkisi, yazmaYetkisi, rolYetkisi, yazmaRolu, motorYazmaYetkisi, vitrinYetkili, kariGizle, alanlariSil, KAR_ALANLARI, YATIRIMCI_PAYI_ALANLARI,
  MUSTERI_ARAYANLAR, AKSESUAR_STOK_OKUYANLAR, YEDEK_PARCA_STOK_OKUYANLAR,
};
