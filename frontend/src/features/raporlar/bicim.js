import { paraYaz, tarihYaz } from '../../shared/utils/bicim';
// Raporlar ekranlarının ortak biçimleyicileri (para, tarih, kâr rengi). Saf fonksiyonlar: durumları yok.
export const formatTL = (v) => paraYaz(v);
export const formatDate = (d) => tarihYaz(d);

// Tablo başlık hücresi stili (renk ve ağırlık temadan gelir)
export const headerSx = { whiteSpace: 'nowrap' };

export { sagaSutunlar } from '../../shared/ui/sagaSutunlar';

export const karColor = (v) => (parseFloat(v || 0) >= 0 ? '#1D6A3B' : '#C62828');

// Motorun toplam kârından yatırımcıya ayrılan pay düşüldükten sonra işletmede kalan tutar.
export const motorIsletmeKari = (motor) => parseFloat(motor?.kar || 0) - parseFloat(motor?.yatirimci_kar || 0);
