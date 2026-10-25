import { isEmriYazdirHtml } from './isEmriYazdir';
import { escapeHtml } from '../../shared/utils/htmlKacis';
import { kayit } from '../../shared/test/kayit';
import type { IsEmriDetayi } from '../../shared/tipler';

// #1 (YAPILACAKLAR-INCELEME.md): iş emri yazdırma çıktısı, kullanıcının girdiği metni kaçışlamadan
// `document.write` ile yazıyordu. Servis yetkili bir personel arıza alanına <img onerror=...> yazarsa,
// admin yazdırınca betik admin'in oturumunda çalışırdı.

const temelIsEmri = {
  fis_no: 42,
  musteri_ad_soyad: 'Ali Veli',
  telefon: '05551112233',
  adres: 'Atatürk Cd. No:1',
  km: 12000,
  plaka: '34ABC123',
  marka: 'Yamaha',
  model_tip: 'R25',
  durum: 'beklemede',
  olusturan_kisi: 'Personel 1',
  created_at: '2026-10-01T10:00:00.000Z',
  parcalar: [{ takilan_parca: 'Yağ filtresi', adet: 2, birim_fiyat: 150, toplam_fiyat: 300 }],
};

describe('escapeHtml', () => {
  test("HTML'de özel anlamı olan beş karakteri kaçışlar", () => {
    expect(escapeHtml('<a href="x" title=\'y\'>&</a>')).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });

  test('null ve undefined boş metin olur, sayı metne çevrilir', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });

  test('Türkçe karakterlere dokunmaz', () => {
    expect(escapeHtml('Çağrı Şükrü İğdır')).toBe('Çağrı Şükrü İğdır');
  });
});

describe('isEmriYazdirHtml', () => {
  test('zararlı etiketleri ham hâliyle çıktıya koymaz (her serbest metin alanı)', () => {
    const zararli = '<img src=x onerror=alert(1)>';
    const html = isEmriYazdirHtml(
      kayit<IsEmriDetayi>({
        ...temelIsEmri,
        musteri_ad_soyad: zararli,
        telefon: zararli,
        adres: zararli,
        plaka: zararli,
        marka: zararli,
        model_tip: zararli,
        olusturan_kisi: zararli,
        teslim_alan_ad_soyad: zararli,
        teslim_eden_teknisyen: zararli,
        ariza_sikayetler: zararli,
        aciklama: zararli,
        odeme_detaylari: zararli,
        parcalar: [{ takilan_parca: zararli, adet: 1, birim_fiyat: 1, toplam_fiyat: 1 }],
      }),
    );
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('<script> ve olay niteliği enjekte edilemez', () => {
    const html = isEmriYazdirHtml(
      kayit<IsEmriDetayi>({ ...temelIsEmri, ariza_sikayetler: '<script>alert(document.cookie)</script>', aciklama: '"><b onmouseover=alert(2)>' }),
    );
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<b onmouseover');
    expect(html).toContain('&lt;script&gt;alert(document.cookie)&lt;/script&gt;');
  });

  test('sayısal alanlara yazılmış metin de kaçışlanır (fis_no, adet)', () => {
    const html = isEmriYazdirHtml(
      kayit<IsEmriDetayi>({
        ...temelIsEmri,
        fis_no: '<i>1</i>',
        parcalar: [{ takilan_parca: 'x', adet: '<u>2</u>', birim_fiyat: 1, toplam_fiyat: 1 }],
      }),
    );
    expect(html).not.toContain('<i>1</i>');
    expect(html).not.toContain('<u>2</u>');
  });

  test('normal veriyi bozmaz: Türkçe metin, & işareti, parça satırı ve toplam', () => {
    const html = isEmriYazdirHtml(kayit<IsEmriDetayi>({ ...temelIsEmri, musteri_ad_soyad: 'Çağrı & Şükrü', ariza_sikayetler: 'Motor sesi var' }));
    expect(html).toContain('Çağrı &amp; Şükrü');
    expect(html).toContain('Motor sesi var');
    expect(html).toContain('Yağ filtresi');
    expect(html).toContain('#42');
    expect(html).toContain('34ABC123');
    expect(html).toContain('Toplam: ₺300');
  });

  test('boş alanlar "-" gösterir, olmayan arıza/açıklama bölümü hiç basılmaz', () => {
    const html = isEmriYazdirHtml(kayit<IsEmriDetayi>({ fis_no: 1, parcalar: [] }));
    expect(html).toContain('Parça kaydı yok');
    expect(html).not.toContain('Arıza / Şikayetler');
    expect(html).not.toContain('Ödeme Detayları');
    expect(html).toContain('<span class="value">-</span>');
  });

  test('parça listesi hiç yoksa (undefined) çökmez', () => {
    expect(() => isEmriYazdirHtml(kayit<IsEmriDetayi>({ fis_no: 7 }))).not.toThrow();
  });
});
