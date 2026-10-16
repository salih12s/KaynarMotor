/*
 * Tarih yardımcıları.
 *
 * `new Date().toISOString().split('T')[0]` UTC gününü verir: Türkiye'de (UTC+3) gece 00:00–03:00 arasında
 * "bugün" bir önceki gün görünür. Form varsayılanları için kullanıcının yerel gününü kullanın.
 */
const iki = (n) => String(n).padStart(2, '0');

// Yerel saate göre YYYY-AA-GG
export const yerelTarih = (d = new Date()) => `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;

export const bugunYerel = () => yerelTarih(new Date());
