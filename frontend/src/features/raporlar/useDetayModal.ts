import { useState } from 'react';

interface DetayDurumu<T> {
  open: boolean;
  data: T | null;
}

// Detay penceresinin açık/kapalı durumu ve gösterilen kayıt. Kapanınca kayıt hemen silinir (eski davranış).
export const useDetayModal = <T>() => {
  const [durum, setDurum] = useState<DetayDurumu<T>>({ open: false, data: null });
  return {
    ...durum,
    ac: (data: T) => setDurum({ open: true, data }),
    kapat: () => setDurum({ open: false, data: null }),
  };
};
