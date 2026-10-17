/*
 * Bellekte sınırlı boyutlu (bayt) LRU önbellek: vitrin görselleri/videoları veritabanında base64 metin olarak durur ve
 * her istekte okunup çözülür. Sık istenen küçük medya buradan sunulur (veritabanı okuması + base64 çözme yok);
 * toplam bellek `azamiBayt` ile sınırlıdır. Sınırın yarısından büyük tek bir değer (büyük video) alınmaz ki
 * önbelleğin geri kalanını boşa çıkarmasın.
 *
 * Kayıtlar değişmez (yeni medya yeni kimlikle eklenir); yine de silinen medya sonsuza dek sunulmasın diye `omurMs` sonra düşer.
 */
class MedyaOnbellegi {
  constructor({ azamiBayt = 0, omurMs = 10 * 60 * 1000, simdi = Date.now } = {}) {
    this.azamiBayt = azamiBayt;
    this.omurMs = omurMs;
    this.simdi = simdi;
    this.kayitlar = new Map(); // anahtar -> { deger, bayt, dogum }; Map ekleme sırasını tutar: ilk eleman en eski kullanılan
    this.toplamBayt = 0;
  }

  get(anahtar) {
    const k = this.kayitlar.get(anahtar);
    if (!k) return undefined;
    if (this.simdi() - k.dogum > this.omurMs) { this._sil(anahtar); return undefined; }
    this.kayitlar.delete(anahtar); this.kayitlar.set(anahtar, k); // en son kullanılana taşı
    return k.deger;
  }

  set(anahtar, deger, bayt) {
    if (this.azamiBayt <= 0 || bayt > this.azamiBayt / 2) return;
    this._sil(anahtar);
    this.kayitlar.set(anahtar, { deger, bayt, dogum: this.simdi() });
    this.toplamBayt += bayt;
    while (this.toplamBayt > this.azamiBayt) this._sil(this.kayitlar.keys().next().value);
  }

  _sil(anahtar) {
    const k = this.kayitlar.get(anahtar);
    if (!k) return;
    this.toplamBayt -= k.bayt;
    this.kayitlar.delete(anahtar);
  }
}

module.exports = { MedyaOnbellegi };
