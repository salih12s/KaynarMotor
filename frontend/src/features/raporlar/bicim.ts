import { paraYaz, sayiDegeri, tarihYaz, type Sayi, type TarihGirdisi } from '../../shared/utils/bicim';
import { RENK } from '../../app/tokenlar';
// Raporlar ekranlarının ortak biçimleyicileri (para, tarih, kâr rengi). Saf fonksiyonlar: durumları yok.
export const formatTL = (v: Sayi): string => paraYaz(v);
export const formatDate = (d: TarihGirdisi): string => tarihYaz(d);

// Tablo başlık hücresi stili (renk ve ağırlık temadan gelir)
export const headerSx = { whiteSpace: 'nowrap' } as const;

export { sagaSutunlar } from '../../shared/ui/sagaSutunlar';

export const karColor = (v: Sayi): string => (sayiDegeri(v) >= 0 ? RENK.yesil : RENK.kirmizi);

// Kayıtla gelen parça listesi: eski yanıtlarda JSON metni olarak da gelebilir (PostgreSQL json_agg dönemi); dizi ise aynen döner.
export const parcaListesi = <T>(v: T[] | string | null | undefined): T[] => (typeof v === 'string' ? (JSON.parse(v) as T[]) : v || []);

// Motorun toplam kârından yatırımcıya ayrılan pay düşüldükten sonra işletmede kalan tutar.
export const motorIsletmeKari = (motor: { kar?: Sayi; yatirimci_kar?: Sayi } | null | undefined): number =>
  sayiDegeri(motor?.kar) - sayiDegeri(motor?.yatirimci_kar);
