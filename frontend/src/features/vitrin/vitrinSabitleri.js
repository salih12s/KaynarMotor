// Vitrin kategorileri, motor durumları ve segmentler: yönetim paneli ve herkese açık mağaza ortak kullanır.
export const KATEGORILER = [
  { key: 'motor', label: 'Motor Satışı' },
  { key: 'aksesuar', label: 'Aksesuar' },
  { key: 'yedek_parca', label: 'Yedek Parça' },
  { key: 'bakim_servis', label: 'Bakım / Servis' },
  { key: 'nakliye', label: 'Nakliye / Yol Kurtarma' },
  { key: 'sigorta', label: 'Araç Sigortası' },
];

// Motor ilanı durumu — sitede müşteri önce Sıfır / İkinci El seçer, sadece o tür listelenir
export const MOTOR_DURUMLARI = [
  { key: 'sifir', label: 'Sıfır' },
  { key: 'ikinci_el', label: 'İkinci El' },
];

export const SEGMENTLER = ['Chopper', 'Scooter', 'Racing', 'Naked', 'Touring', 'Cross/Enduro', 'Cub', 'Maxi Scooter'];

// İlan girilmeyen, sadece hizmet sayfası (resim + telefon + WhatsApp) gösterilen kategoriler
export const HIZMET_KATEGORILER = ['bakim_servis', 'nakliye', 'sigorta'];
