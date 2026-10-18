/*
 * Stok hareketi (ortak). miktar > 0: stoktan DÜŞER, miktar < 0: GERİ EKLER.
 *
 * Stok EKSİYE düşebilir: fazla satış görünür kalır ve iade/silme her zaman tam geri verir.
 * Eskiden `GREATEST(mevcut - miktar, 0)` düşümü 0'da kesiyor ama iadeyi kesmiyordu:
 * "stok 2, 5 adet sat, satışı sil" → stok 2 değil 5 oluyordu. Envanter değeri eksiye düşmez.
 *
 * MariaDB SET atamalarını soldan sağa, GÜNCELLENMİŞ değerlerle çalıştırır (PostgreSQL hepsini eski değerle
 * hesaplar): envanter_degeri, mevcut'tan ÖNCE yazılmalıdır.
 *
 * `tablo` ve `kosul` kod içindeki sabitlerdir (kullanıcı girdisi değil); değerler $-parametresi olarak geçer.
 * Etkilenen satır sayısını döndürür.
 */
import type { Veritabani } from '../core/tipler';

export const stokAyarla = async (client: Veritabani, tablo: string, kosul: string, kosulDegeri: unknown, miktar: number): Promise<number> => {
  if (!miktar) return 0;
  const sonuc = await client.query(
    `UPDATE ${tablo} SET
       cikan_miktar = GREATEST(IFNULL(cikan_miktar, 0) + $1, 0),
       envanter_degeri = GREATEST(IFNULL(mevcut, 0) - $1, 0) * satis_fiyati,
       mevcut = IFNULL(mevcut, 0) - $1,
       updated_at = CURRENT_TIMESTAMP
     WHERE ${kosul}`,
    [miktar, kosulDegeri]
  );
  return sonuc.rowCount;
};
