import { useState } from 'react';

// Detay penceresinin açık/kapalı durumu ve gösterilen kayıt. Kapanınca kayıt hemen silinir (eski davranış).
export const useDetayModal = () => {
  const [durum, setDurum] = useState({ open: false, data: null });
  return {
    ...durum,
    ac: (data) => setDurum({ open: true, data }),
    kapat: () => setDurum({ open: false, data: null }),
  };
};
