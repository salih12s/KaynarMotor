/* İstek doğrulama yardımcıları (route'lar arasında ortak). */

// İstemcinin düzeltebileceği hata: 4xx döner, mesajı kullanıcıya gösterilir. Route içindeki
// try/catch'ler bunu `hataYanitla` ile ayırır; merkezi hata işleyicisi de tanır (server.js).
class GecersizIstek extends Error {
  constructor(mesaj, durum = 400) {
    super(mesaj);
    this.name = 'GecersizIstek';
    this.status = durum;
    this.istemciHatasi = true;
  }
}

// Adet: pozitif tam sayı olmalı. Boş/undefined/null → varsayılan (1). 0, negatif, ondalık, metin → 400.
// (Eskiden `Number(adet) || 1` negatif adedi geçiriyordu: negatif satış stoğu ARTIRIYORDU.)
const adetCoz = (deger, varsayilan = 1) => {
  if (deger === '' || deger === undefined || deger === null) return varsayilan;
  const n = Number(deger);
  if (!Number.isInteger(n) || n <= 0) throw new GecersizIstek('Adet pozitif bir tam sayı olmalıdır');
  return n;
};

// Formlar boş alanı '' olarak gönderir; tamsayı/FK kolonuna '' yazılamaz (katı SQL modunda hata) → NULL
const bosuNull = (deger) => (deger === '' || deger === undefined ? null : deger);

// Şifre kuralı: metin, 8–128 karakter. Sorun varsa kullanıcıya gösterilecek mesajı, yoksa null döndürür.
// (Yalnızca YENİ şifreler denetlenir; mevcut kullanıcılar eski şifreleriyle girmeye devam eder.)
const sifreSorunu = (sifre) => {
  if (typeof sifre !== 'string' || sifre.length < 8) return 'Şifre en az 8 karakter olmalıdır';
  if (sifre.length > 128) return 'Şifre en fazla 128 karakter olabilir';
  return null;
};

// catch içinde: istemci hatasıysa 4xx + mesaj, değilse günlüğe yaz ve 500
const hataYanitla = (res, hata, baglam) => {
  if (hata && hata.istemciHatasi) return res.status(hata.status).json({ message: hata.message });
  console.error(baglam, hata);
  return res.status(500).json({ message: 'Sunucu hatası' });
};

module.exports = { GecersizIstek, adetCoz, bosuNull, sifreSorunu, hataYanitla };
