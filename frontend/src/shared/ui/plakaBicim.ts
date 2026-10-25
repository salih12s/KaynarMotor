// "34ABC123" -> "34 ABC 123". Boşluklu ya da tanınmayan biçimler aynen (büyük harfle) döner.
export const plakaBicim = (p: unknown): string => {
  const s = String(p ?? '')
    .trim()
    .toUpperCase();
  if (!s) return '';
  const t = s.replace(/\s+/g, '');
  const m = t.match(/^(\d{2})([A-ZÇĞİÖŞÜ]{1,3})(\d{1,5})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : s;
};
