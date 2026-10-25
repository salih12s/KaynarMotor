// Taksit hesabı (saf fonksiyonlar: ekran/durum yok, doğrudan test edilebilir). Hem yönetim sayfası hem müşteriye giden
// paylaşım sayfası (/taksit/:fiyat) bu hesabı kullanır; testi: taksitHesap.test.ts.
import { sayiYaz, type Sayi } from '../../shared/utils/bicim';

// Taksit oranları (nakit fiyat / oran = taksitli toplam)
export const ORANLAR = [
  { ay: 3, oran: 0.9 },
  { ay: 6, oran: 0.83 },
  { ay: 9, oran: 0.78 },
  { ay: 12, oran: 0.73 },
];

export const fmtTL = (v: number): string => `${sayiYaz(Math.round(v))} ₺`;

// Para formatlı input yardımcıları: "50000" -> "50.000", girilen değerden sayı çıkarır
export const formatParaInput = (val: unknown): string => {
  const digits = String(val ?? '').replace(/\D/g, '');
  return digits ? sayiYaz(parseInt(digits, 10)) : '';
};
export const paraToNumber = (val: unknown): number => {
  const digits = String(val ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

// Makul üst sınır: paylaşım linki (/taksit/:fiyat) herkesçe değiştirilebildiğinden, absürt tutarlar "işletme teklifi" gibi görünmesin
export const MAKS_NAKIT = 10000000;

export interface TaksitSatiri {
  ay: number;
  toplam: number;
  aylik: number;
}

// Nakit fiyattan (peşinat düşülerek) taksit tablosunu hesaplar
export const hesaplaTaksit = (nakit: Sayi, pesinat: Sayi = 0): TaksitSatiri[] | null => {
  const n = parseFloat(String(nakit));
  const p = parseFloat(String(pesinat)) || 0;
  if (!n || n <= 0 || n > MAKS_NAKIT) return null;
  const kalan = n - p;
  if (kalan <= 0) return null;
  return ORANLAR.map((o) => {
    const toplam = kalan / o.oran;
    return { ay: o.ay, toplam, aylik: toplam / o.ay };
  });
};
