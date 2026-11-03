/*
 * Denetim günlüğü için "ne değişti" özeti: `alan: eski → yeni; alan2: eski → yeni`.
 *
 * Neden: günlük yalnız "#N güncellendi" yazıyordu; bir fiyatın kim tarafından kaç TL'den kaç TL'ye çevrildiği sonradan anlaşılamıyordu
 * (alış fiyatı 500.000 → 1 yapılınca kâr bozuluyor, iz kalmıyordu). Yalnızca ÇAĞIRANIN verdiği alanlar izlenir: kişisel veri (ad, TC,
 * telefon, adres) bu listeye konmaz, günlüğe yazılmaz (KVKK).
 *
 * Eşitlik "değer" olarak bakar: DECIMAL metin gelir ("500000.00"), 500000 ile aynıdır; null, undefined ve boş metin aynıdır (boş); tarihler gündür.
 */

const BOS = '(boş)';
const EN_FAZLA = 60; // tek değer için; günlük şişmesin

const bosMu = (v: unknown): boolean => v === null || v === undefined || v === '';
const sayiMi = (v: unknown): v is number | string => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)));

const metne = (v: unknown): string => {
  if (bosMu(v)) return BOS;
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return s.length > EN_FAZLA ? `${s.slice(0, EN_FAZLA)}…` : s;
};

const esitMi = (a: unknown, b: unknown): boolean => {
  if (bosMu(a) && bosMu(b)) return true;
  if (bosMu(a) || bosMu(b)) return false;
  if (sayiMi(a) && sayiMi(b)) return Number(a) === Number(b);
  return metne(a) === metne(b);
};

/** `alanlar` içinde eski ve yeni satır arasında değişenleri yazar; hiçbiri değişmediyse boş metin döner. */
export const degisiklikOzeti = (eski: Record<string, unknown>, yeni: Record<string, unknown>, alanlar: readonly string[]): string =>
  alanlar
    .filter((alan) => !esitMi(eski[alan], yeni[alan]))
    .map((alan) => `${alan}: ${metne(eski[alan])} → ${metne(yeni[alan])}`)
    .join('; ');
