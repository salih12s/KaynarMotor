/*
 * Ortak zod parçaları. API sözleşmesi dondurulduğu için şemalar BİLİNÇLİ OLARAK gevşektir: formlar aynı alanı
 * metin, sayı ya da boş olarak gönderebilir (ör. '' yerine null, 5 yerine '5'); işleyiciler bu değerleri zaten
 * normalize eder (emptyToZero, bosuNull vb.). Şema alan adlarını/tiplerini belgeler ve alakasız yapıları (dizi,
 * nesne) 400 ile reddeder; daha sıkı kurallar ayrı bir iş olarak, sözleşme değişikliğiyle birlikte gelir.
 */
import { z } from 'zod';

/** Metin ya da sayı; boş bırakılabilir. */
export const gevsekMetin = z.union([z.string(), z.number()]).nullish();
/** Sayı ya da sayı metni; boş bırakılabilir (''/null/undefined → işleyici 0/NULL yapar). */
export const gevsekSayi = z.union([z.number(), z.string()]).nullish();
/** true/false ya da formlardan gelen 'true'/'false', 0/1. */
export const gevsekMantiksal = z.union([z.boolean(), z.string(), z.number()]).nullish();
/** Yapısı işleyicide ayrıca ele alınan değer (ör. ödeme dağılımı: nesne, dizi ya da JSON metni). */
export const serbest = z.unknown().optional();
