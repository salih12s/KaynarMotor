/*
 * Çift gönderim koruması: bir işlem sürerken aynı işlemin yeniden başlatılması yok sayılır.
 *
 * Neden: Kaydet'e çift tıklamak (ya da yavaş yanıtta sabırsızca yeniden tıklamak) iki istek gönderiyordu; sunucuda iki iş emri / satış / müşteri
 * ve iki stok düşümü oluşuyordu (E04'te canlı ölçüldü). `useRef` ile kilitlenir, `useState` ile DEĞİL: çift tıklamada ikinci tıklama, state
 * güncellenip yeniden çizilmeden önce gelir; ref ise aynı anda anında görünür.
 *
 *   const { calistir } = useTekSeferlik();
 *   const handleSave = () => calistir(kaydet);       // `kaydet`: asıl async işlev
 *
 * İş bitince (başarılı ya da hatalı) kilit açılır; hata çağırana iletilir. Sunucu tarafı idempotency anahtarı bu iş kapsamında değildir.
 */
import { useCallback, useRef, useState } from 'react';

export const useTekSeferlik = () => {
  const calisiyor = useRef(false);
  const [bekliyor, setBekliyor] = useState(false);

  /** İş çalışıyorsa hiçbir şey yapmaz (undefined döner); değilse çalıştırır ve sonucunu döndürür. */
  const calistir = useCallback(async <T>(is: () => Promise<T>): Promise<T | undefined> => {
    if (calisiyor.current) return undefined;
    calisiyor.current = true;
    setBekliyor(true);
    try {
      return await is();
    } finally {
      calisiyor.current = false;
      setBekliyor(false);
    }
  }, []);

  return { bekliyor, calistir };
};
