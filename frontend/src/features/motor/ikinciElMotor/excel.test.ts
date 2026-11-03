/*
 * Excel dışa aktarma (HTML tablosu olarak .xls) için BİRİM testleri. Regression (E08): hücre metni `=`, `+`, `-`, `@` ile başlarsa Excel bunu
 * FORMÜL sayabilir (formül enjeksiyonu): alıcı adı gibi serbest metin alanları saldırgan girdisi taşıyabilir. Tehlikeli hücrelerin başına
 * tek tırnak konur; telefon ve negatif tutar gibi meşru değerler bozulmaz.
 * Not: gerçek Excel'de açılış davranışı bu ortamda denenmedi; test, üretilen HTML'in güvenli biçimini doğrular.
 */
import { excelHtml, excelMetni } from './excel';
import { kayit } from '../../../shared/test/kayit';
import type { Motor } from '../../../shared/tipler';

const motor = (ek: Record<string, unknown>) => kayit<Motor>({ plaka: '34ABC123', marka: 'Honda', model: 'PCX', satis_fiyati: 50000, kar: -1500, ...ek });
const yetki = { canAlis: true, canKar: true };

describe('excelMetni', () => {
  test.each([
    ['=1+1', "'=1+1"],
    ['=HYPERLINK("http://x")', '\'=HYPERLINK("http://x")'],
    ['@SUM(1+1)', "'@SUM(1+1)"],
    ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
    ['-2+3', "'-2+3"],
    ['\t=1+1', "'\t=1+1"],
    ['\r=1+1', "'\r=1+1"],
  ])('tehlikeli hücre %j başına tek tırnak alır', (girdi, beklenen) => {
    expect(excelMetni(girdi)).toBe(beklenen);
  });

  test.each(['Ali Yılmaz', '34ABC123', '', '05551112233', '+90 555 111 22 33', '+90 (555) 111-22-33', '-1.500,00', '1.250,50', 'a=b', 'Ali @ Veli'])(
    'meşru değer %j olduğu gibi kalır',
    (girdi) => {
      expect(excelMetni(girdi)).toBe(girdi);
    },
  );

  test('null ve undefined boş metin olur', () => {
    expect(excelMetni(null)).toBe('');
    expect(excelMetni(undefined)).toBe('');
  });
});

describe('excelHtml: formül enjeksiyonu', () => {
  test('alıcı ve satıcı adındaki formül hücrenin başına tırnak konarak çıkar; ham formül hücre başında görünmez', () => {
    const html = excelHtml([motor({ alici_adi: '=1+1', satici_adi: '@SUM(1+1)', alici_telefon: '+90 555 111 22 33' })], yetki);
    expect(html).toContain(">'=1+1</td>");
    expect(html).toContain(">'@SUM(1+1)</td>");
    expect(html).not.toMatch(/>=1\+1<\/td>/);
    expect(html).not.toMatch(/>@SUM/);
    expect(html).toContain('>+90 555 111 22 33</td>'); // telefon bozulmaz
  });

  test('negatif kâr ve normal veriler bozulmaz; HTML özel karakterleri kaçışlanır', () => {
    const html = excelHtml([motor({ alici_adi: 'A<B>&C' })], yetki);
    expect(html).toContain('>-1.500</td>'); // kâr sayıYaz biçiminde, eksi korunur
    expect(html).toContain('>A&lt;B&gt;&amp;C</td>');
    expect(html).toContain('>34ABC123</td>');
  });
});
