/*
 * Test için sahte (FAKE) veritabanı: gerçek MariaDB yok. Servis katmanı yalnızca `db.query` / `db.withTransaction`
 * kullandığı için iş kuralları sunucu ve veritabanı olmadan sınanabilir.
 *
 *   const db = sahteDb([['FROM musteriler WHERE LOWER(ad_soyad)', [{ id: 7 }]]]);
 *   await servis.fonksiyon(db, ...);
 *   db.cagrilar   // çalışan her sorgu: { sql, params }
 *
 * Yanıtlar SQL metninde GEÇEN BİR PARÇAYA göre verilir (ilk eşleşen kazanır); eşleşme yoksa boş sonuç döner.
 * Bir yanıt `Error` ise fırlatılır (veritabanı hatası senaryosu).
 */
const sahteDb = (yanitlar = []) => {
  const cagrilar = [];
  const sorgu = async (sql, params = []) => {
    cagrilar.push({ sql, params });
    const kural = yanitlar.find(([parca]) => sql.includes(parca));
    if (!kural) return { rows: [], rowCount: 0 };
    if (kural[1] instanceof Error) throw kural[1];
    return { rows: kural[1], rowCount: kural[1].length };
  };
  const olaylar = [];
  return {
    cagrilar,
    olaylar,
    query: sorgu,
    // Transaction: işleyici başarılıysa COMMIT, hata fırlatırsa ROLLBACK olarak kaydedilir ve hata yukarı iletilir.
    withTransaction: async (isleyici) => {
      olaylar.push('BEGIN');
      try {
        const sonuc = await isleyici({ query: sorgu });
        olaylar.push('COMMIT');
        return sonuc;
      } catch (hata) {
        olaylar.push('ROLLBACK');
        throw hata;
      }
    },
  };
};

module.exports = { sahteDb };
