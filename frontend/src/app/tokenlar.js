// Tasarım tokenları: "Servis Defteri" yönü (kâğıt zemin, mürekkep yazı, kırmızı yalnızca eylem ve damgada).
// Tek yerde durur; tema (tema.js) ve ortak bileşenler (shared/ui) buradan okur. Taslaklar: docs/tasarim-yonleri/.

export const RENK = {
  kagit: '#EEEFEB', // sayfa zemini
  yuzey: '#FBFBF8', // kart, tablo, pencere
  yuzeyKoyu: '#F3F3EE', // tablo başlığı, pencere alt çubuğu
  kenarMenu: '#E4E5DE',
  murekkep: '#16181C',
  soluk: '#5B5F66',
  cizgi: '#D2D3CA',
  cizgiSoluk: '#E1E2DA',
  cizgiKesik: '#CBCCC2',
  alanCizgi: '#BFC0B6',
  odak: '#1F4FA0',
  kirmizi: '#C62828',
  kirmiziKoyu: '#A61F1F',
  yesil: '#1D6A3B',
  mavi: '#1E4A86',
  uyari: '#FBEAE7', // biten stok satırı
};

// Durum tonları: [yazı, zemin]. Damga (çerçeveli etiket) ve özet şeridi bunları kullanır.
export const TON = {
  bekle: { fg: '#8A5300', bg: '#F7E7C4' },
  mavi: { fg: '#1E4A86', bg: '#DCE6F4' },
  yesil: { fg: '#1D6A3B', bg: '#D8EBDD' },
  kirmizi: { fg: '#A52A22', bg: '#F6DAD7' },
  mor: { fg: '#5B3A8C', bg: '#E7DFF3' },
  gri: { fg: '#4A4F57', bg: '#E6E6E0' },
  turuncu: { fg: '#A5530F', bg: '#F8E1CC' },
};

// İşlem düğmeleri: [yazı, yumuşak zemin]
export const ISLEM = {
  goz: { fg: '#1E5FAE', bg: '#DCE6F4' },
  yaz: { fg: '#3C4046', bg: '#E3E3DC' },
  qr: { fg: '#6B3FA0', bg: '#E7DFF3' },
  duz: { fg: '#9A6200', bg: '#F7E7C4' },
  sil: { fg: '#B3261E', bg: '#F6DAD7' },
  sepet: { fg: '#1D6A3B', bg: '#D8EBDD' },
  onay: { fg: '#1D6A3B', bg: '#D8EBDD' },
  carpi: { fg: '#B3261E', bg: '#F6DAD7' },
  kilit: { fg: '#5B5F66', bg: '#E3E3DC' },
  indir: { fg: '#1E5FAE', bg: '#DCE6F4' },
  ac: { fg: '#6B3FA0', bg: '#E7DFF3' },
  yukari: { fg: '#5B5F66', bg: '#E3E3DC' },
  asagi: { fg: '#5B5F66', bg: '#E3E3DC' },
  gizle: { fg: '#9A6200', bg: '#F7E7C4' },
  belge: { fg: '#1E5FAE', bg: '#DCE6F4' },
};

// Kenar menü simge renkleri (anahtar: menü kodu)
export const MENU_RENK = {
  motor: '#B85C1E',
  servis: '#B3261E',
  aksesuar: '#6B3FA0',
  eticaret: '#1E5FAE',
  taksit: '#0F7B6C',
  yedek: '#9A6A00',
  vitrin: '#B0306A',
  veresiye: '#2E7D32',
  raporlar: '#0E7490',
  musteriler: '#3F51B5',
  belge: '#8A6D00',
  kullanicilar: '#0277BD',
  yetki: '#546E7A',
  ana: '#5D8A1F',
};

export const FONT = {
  baslik: '"Barlow Condensed", "Arial Narrow", sans-serif',
  metin: '"Barlow", "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", "Consolas", monospace',
};
