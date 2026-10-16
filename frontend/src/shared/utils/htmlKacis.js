// Yeni bir pencereye `document.write` ile HTML yazarken kullanıcı girdisini güvenli hâle getirir.
// Aksi hâlde "<img onerror=...>" gibi bir metin yazdırma penceresinde (aynı origin) betik çalıştırır.
const KACIS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (deger) => String(deger ?? '').replace(/[&<>"']/g, (c) => KACIS[c]);
