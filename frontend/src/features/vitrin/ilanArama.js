// Arama için metni sadeleştirir: küçük harf + Türkçe karakter/aksan farkı yok ("Küçük" = "kucuk" = "KÜÇÜK")
const aramaMetni = (s) =>
  String(s ?? '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');

// İlan, aramadaki HER kelimeyi başlık/marka/model/segment/açıklama/yıl/ilan no alanlarından birinde içeriyorsa eşleşir.
// ("yamaha 2021" → marka Yamaha + yıl 2021 olan ilan da bulunur)
export const ilanAramaUygunMu = (u, arama) => {
  const kelimeler = aramaMetni(arama).split(/\s+/).filter(Boolean);
  if (kelimeler.length === 0) return true;
  const ilanNo = u.ilan_no != null ? `iln-${String(u.ilan_no).padStart(4, '0')}` : '';
  const metin = aramaMetni([u.baslik, u.marka, u.model, u.segment, u.aciklama, u.yil, ilanNo].filter(Boolean).join(' '));
  return kelimeler.every((k) => metin.includes(k));
};
