/*
 * Yol parametresindeki kayıt numarasını doğrular (router.param('id', idParam)).
 *
 * PostgreSQL, tamsayı kolonuna "abc" ya da "5abc" gibi bir değer verilince hata veriyordu.
 * MariaDB ise metni sessizce sayıya çevirir ("5abc" -> 5) ve başka bir kaydı etkileyebilir.
 * Bu yüzden numaralar ISTEK GELİR GELMEZ doğrulanır: yalnızca pozitif tam sayı geçer.
 */
const idParam = (req, res, next, deger) => {
  if (!/^\d{1,10}$/.test(deger) || Number(deger) > 2147483647) {
    return res.status(400).json({ message: 'Geçersiz kayıt numarası' });
  }
  next();
};

module.exports = { idParam };
