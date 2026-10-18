/*
 * İkinci El Motor'un saf kurallarının (form dönüşümleri, süzme+sıralama, canlı kâr, Excel HTML'i) BİRİM testleri:
 * ekran, sahte API, bekleme yok; girdi -> çıktı. Ekran düzeyindeki karşılıkları ../IkinciElMotor.test.js içinde.
 */
import { ilkForm, bosForm, motordenForm, hesaplaCanliKar, filtrele } from './satisVeri';
import { excelHtml } from './excel';

describe('hesaplaCanliKar', () => {
  test('kâr = satış - (alış + masraf + komisyoncu); boş/metin değerler 0 sayılır', () => {
    expect(hesaplaCanliKar({ satis_fiyati: '60000', alis_fiyati: 50000, masraflar: '1000', komisyoncu_tutari: 500 })).toBe(8500);
    expect(hesaplaCanliKar({ satis_fiyati: '', alis_fiyati: '', masraflar: '', komisyoncu_tutari: '' })).toBe(0);
    expect(hesaplaCanliKar({ satis_fiyati: 100, alis_fiyati: 150 })).toBe(-50); // zarar negatif
  });
});

describe('form dönüşümleri', () => {
  test('bosForm: yeni satış "tamamlandi" başlar, ödeme tamamlandı işaretli; ilkForm kapalıyken tutulan hâl "stokta"', () => {
    expect(bosForm()).toMatchObject({ durum: 'tamamlandi', odeme_sekli: 'nakit', odeme_tamamlandi: true, tarih: '', plaka: '' });
    expect(ilkForm()).toMatchObject({ durum: 'stokta', stok_tipi: 'sahip' });
    expect(bosForm()).not.toBe(bosForm());
  });

  test('motordenForm: boşlar "", tarihler yyyy-aa-gg; kalan ödeme varsa ödeme tamamlanmadı, "0.00" metni ödendi sayılır', () => {
    const f = motordenForm({ plaka: 'X', tarih: '2026-09-01T12:00:00', satis_tarihi: '2026-10-05T12:00:00', kalan_odeme: '2500.00' });
    expect(f).toMatchObject({ plaka: 'X', marka: '', tarih: '2026-09-01', satis_tarihi: '2026-10-05', kalan_odeme: '2500.00', odeme_tamamlandi: false, durum: 'tamamlandi', odeme_sekli: 'nakit' });
    expect(motordenForm({ kalan_odeme: '0.00' }).odeme_tamamlandi).toBe(true);
    expect(motordenForm({}).odeme_tamamlandi).toBe(true);
    expect(motordenForm({}).tarih).toBe('');
  });
});

describe('filtrele', () => {
  const liste = [
    { id: 1, plaka: 'AAA', marka: 'Honda', alici_adi: 'Ahmet', satis_tarihi: '2026-10-05T12:00:00' },
    { id: 2, plaka: 'BBB', marka: 'Yamaha', satici_adi: 'Zeynep', tarih: '2026-09-20T12:00:00' },
    { id: 3, plaka: 'CCC', marka: 'Suzuki' }, // tarihsiz: en sona
  ];
  const bos = { search: '', tarihBaslangic: '', tarihBitis: '' };
  const idler = (o) => filtrele(liste, { ...bos, ...o }).map((m) => m.id);

  test('satış tarihine (yoksa alım tarihine) göre yeniden eskiye; tarihsiz kayıt sona', () => {
    expect(idler({})).toEqual([1, 2, 3]);
  });

  test('tarih aralığı uçlar dahil; tarihsiz kayıt başlangıç süzgecinde elenir', () => {
    expect(idler({ tarihBaslangic: '2026-10-05' })).toEqual([1]);
    expect(idler({ tarihBitis: '2026-09-20' })).toEqual([2, 3]);
  });

  test('arama plaka, marka, model, alıcı ve satıcıda (büyük/küçük harf farkı olmadan)', () => {
    expect(idler({ search: 'AHMET' })).toEqual([1]);
    expect(idler({ search: 'zeynep' })).toEqual([2]);
    expect(idler({ search: 'suz' })).toEqual([3]);
  });
});

describe('excelHtml', () => {
  const motorlar = [{ plaka: 'A&B', marka: '<M>', yil: 2020, km: 10000, alis_fiyati: 50000, satis_fiyati: 60000, noter_alis: 40000, noter_satis: 55000, kar: 9000, satici_adi: 'S', alici_adi: 'A', alici_telefon: '05', odeme_sekli: 'nakit', yevmiye_no: 'Y', satis_tarihi: '2026-10-05T12:00:00' }];
  const basliklar = (html) => [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);

  test('admin: alım ve kâr sütunları var', () => {
    const b = basliklar(excelHtml(motorlar, { canAlis: true, canKar: true }));
    expect(b).toContain('Alım (₺)');
    expect(b).toContain('Kâr (₺)');
  });

  test('kâr yetkisizse kâr sütunu ve değeri dosyada hiç yoktur; alım yetkisizse alım da yok', () => {
    const html = excelHtml(motorlar, { canAlis: false, canKar: false });
    expect(basliklar(html)).not.toContain('Kâr (₺)');
    expect(basliklar(html)).not.toContain('Alım (₺)');
    expect(html).not.toContain('9.000');
    expect(html).not.toContain('50.000');
  });

  test('HTML özel karakterleri kaçırılır; tarih ve tutarlar tr-TR biçiminde', () => {
    const html = excelHtml(motorlar, { canAlis: true, canKar: true });
    expect(html).toContain('A&amp;B');
    expect(html).toContain('&lt;M&gt;');
    expect(html).toContain('05.10.2026');
    expect(html).toContain('60.000');
  });
});
