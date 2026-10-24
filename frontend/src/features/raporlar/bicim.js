import { paraYaz, tarihYaz } from '../../shared/utils/bicim';
// Raporlar ekranlarının ortak biçimleyicileri (para, tarih, kâr rengi). Saf fonksiyonlar: durumları yok.
export const formatTL = (v) => paraYaz(v);
export const formatDate = (d) => tarihYaz(d);

// Tablo başlık hücresi stili (kırmızı başlık satırında beyaz yazı)
export const headerSx = { color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' };

export const karColor = (v) => parseFloat(v || 0) >= 0 ? '#2e7d32' : '#C62828';

// Motorun toplam kârından yatırımcıya ayrılan pay düşüldükten sonra işletmede kalan tutar.
export const motorIsletmeKari = (motor) => parseFloat(motor?.kar || 0) - parseFloat(motor?.yatirimci_kar || 0);
