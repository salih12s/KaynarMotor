/* Sayı/metin normalizasyonu (modüller arasında ortak). Formlar boş alanı '', null ya da hiç göndermeyebilir. */

/** Boş ('', null, undefined) ya da sayıya çevrilemeyen değer 0 olur. */
export const bosuSifir = (v: unknown): number => {
  if (v === '' || v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

/** parseFloat(v) || 0: sayı metni → sayı, olmayan/NaN → 0 (ondalık). */
export const ondalik = (v: unknown): number => parseFloat(v as string) || 0;

/** parseInt(v) || 0: tam sayı, olmayan/NaN → 0. */
export const tamSayi = (v: unknown): number => parseInt(v as string) || 0;
