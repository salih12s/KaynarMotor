import { plakaBicim } from './plakaBicim';

describe('plakaBicim', () => {
  it('bitişik yazılmış plakayı boşluklu yazar', () => {
    expect(plakaBicim('34ABC123')).toBe('34 ABC 123');
    expect(plakaBicim('33hn5764')).toBe('33 HN 5764');
  });
  it('zaten boşluklu plakaya dokunmaz', () => {
    expect(plakaBicim('33 HN 5764')).toBe('33 HN 5764');
  });
  it('tek ya da iki harfli ve kısa rakamlı plakaları tanır', () => {
    expect(plakaBicim('01SD1258')).toBe('01 SD 1258');
    expect(plakaBicim('07A12')).toBe('07 A 12');
  });
  it('tanınmayan biçimi (PLAKASIZ) büyük harfle aynen döndürür, boşu boş bırakır', () => {
    expect(plakaBicim('Plakasız')).toBe('PLAKASIZ');
    expect(plakaBicim('')).toBe('');
    expect(plakaBicim(null)).toBe('');
  });
});
