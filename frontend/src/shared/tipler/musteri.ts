/* `musteriler` tablosu. */
export interface Musteri {
  id: number;
  ad_soyad: string | null;
  adres: string | null;
  telefon: string | null;
  created_at?: string;
  updated_at?: string;
}
