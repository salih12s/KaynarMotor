/*
 * Aksesuar Satışları sayfası için KARAKTERİZASYON testleri: liste/istatistik/süzgeçler, kâr görünürlüğü, silme, detay penceresi
 * (stoktan marka/beden/renk zenginleştirme, indirim, kalan ödeme), satış formu (ürün satırları, stoktan seçim, barkod okutma, indirim
 * sınırı, kalan ödeme, telefondan müşteri eşleştirme), mobil görünüm. API, oturum ve yönlendirme sahte (mock).
 */
import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Aksesuarlar from './Aksesuarlar';
import { aksesuarService, aksesuarStokService } from './aksesuarApi';
import { musteriService } from '../musteriler/musteriApi';
import { useKarGor } from '../auth/AuthContext';

jest.mock('./aksesuarApi', () => ({
  aksesuarService: { getAll: jest.fn(), getStats: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  aksesuarStokService: { getAll: jest.fn(), getByBarkod: jest.fn() },
}));
jest.mock('../musteriler/musteriApi', () => ({ musteriService: { search: jest.fn(), searchByPhone: jest.fn() } }));
jest.mock('../auth/AuthContext', () => ({ useKarGor: jest.fn() }));
// react-router-dom v7'nin "exports" alanını CRA'nın Jest 27'si okuyamaz: yönlendirme kancaları sahte
let mockLocation = { pathname: '/aksesuar', state: null };
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => mockLocation }), { virtual: true });

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const BUGUN = new Date().toISOString();
const A1 = {
  id: 1,
  ad_soyad: 'Ayşe Yılmaz',
  telefon: '05551112233',
  toplam_satis: 2000,
  kar: 400,
  durum: 'tamamlandi',
  satis_tarihi: '2026-10-02T12:00:00',
  olusturan_kisi: 'ofis',
};
const A2 = { id: 2, ad_soyad: 'Veli Demir', telefon: '05332223344', toplam_satis: 1000, kar: -50, durum: 'beklemede', satis_tarihi: BUGUN };
const A3 = { id: 3, ad_soyad: 'Zeynep Kaya', toplam_satis: 500, kar: 100, durum: 'beklemede', created_at: '2026-09-15T12:00:00' };
const LISTE = [A1, A2, A3];
const STATS = { toplam_gelir: 3500, toplam_kar: 450 };
const STOK = [
  {
    id: 10,
    stok_adi: 'Kask LS2',
    stok_kodu: 'K-1',
    mevcut: 5,
    alis_fiyati: '1600',
    satis_fiyati: '2000',
    marka: 'LS2',
    beden: 'L',
    renk: 'Siyah',
    platform: 'Trendyol',
  },
  { id: 11, stok_adi: 'Eldiven', stok_kodu: 'E-1', mevcut: 3, alis_fiyati: 300, satis_fiyati: 500 },
];
const DETAY1 = {
  ...A1,
  odeme_sekli: 'nakit',
  aciklama: 'Acil',
  odeme_detaylari: 'Nakit',
  kalan_odeme: 500,
  indirim: 200,
  created_at: '2026-10-01T12:00:00',
  parcalar: [
    { stok_id: 10, urun_adi: 'Kask LS2', adet: 1, maliyet: 1600, satis_fiyati: 2000 },
    { stok_id: 11, urun_adi: 'Eldiven', adet: 2, maliyet: 300, satis_fiyati: 500 },
  ],
};
// Detay: brüt 2000 + 1000 = 3000, maliyet 1600 + 600 = 2200, indirim 200 -> net 2800, kâr 600

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
const kur = ({ karGor = true, liste = LISTE } = {}) => {
  useKarGor.mockReturnValue(karGor);
  aksesuarService.getAll.mockResolvedValue({ data: liste });
  aksesuarService.getStats.mockResolvedValue({ data: STATS });
  aksesuarService.getById.mockImplementation(async (id) => ({ data: id === 1 ? DETAY1 : liste.find((x) => x.id === id) }));
  aksesuarService.create.mockResolvedValue({ data: {} });
  aksesuarService.update.mockResolvedValue({ data: {} });
  aksesuarService.delete.mockResolvedValue({ data: {} });
  aksesuarStokService.getAll.mockResolvedValue({ data: STOK });
  aksesuarStokService.getByBarkod.mockRejectedValue(new Error('yok'));
  musteriService.search.mockResolvedValue({ data: [{ id: 5, ad_soyad: 'Mehmet Aksoy', telefon: '0555' }] });
  musteriService.searchByPhone.mockResolvedValue({ data: null });
};
const ekranAc = async (secenek = {}) => {
  kur(secenek);
  const user = userEvent.setup();
  render(<Aksesuarlar />);
  if (!secenek.bekleme) await screen.findByText('Zeynep Kaya');
  return user;
};
const satir = (ad) => screen.getByRole('row', { name: new RegExp(ad) });
const hucreler = (row) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent);
const basliklar = () => screen.getAllByRole('columnheader').map((h) => h.textContent);
const ikon = (kapsam, ad) => within(kapsam).getByTestId(ad);
const ozet = (etiket) => within(screen.getByLabelText('Özet')).getByText(etiket).previousSibling.textContent;
const ozetYok = (etiket) => within(screen.getByLabelText('Özet')).queryByText(etiket);
const alan = (etiket) => screen.getByLabelText(etiket);
const adlar = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);
const yazi = (metin) => screen.getByText((_, el) => (el.tagName === 'P' || el.tagName === 'SPAN') && el.textContent === metin);
const bekleDialogKapanana = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
const yeniAc = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Yeni Satış' }));
  return screen.findByRole('dialog');
};
const stokSec = async (user, kapsam, satirNo, ad) => {
  const kutu = within(kapsam).getAllByPlaceholderText('Ürün ara...')[satirNo];
  await user.click(kutu);
  await user.click(await screen.findByRole('option', { name: ad }));
};

beforeEach(() => {
  mockLocation = { pathname: '/aksesuar', state: null };
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  jest.spyOn(window, 'confirm').mockImplementation(() => true);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

// ---- Liste -------------------------------------------------------------------------------------------------------
describe('Aksesuarlar: liste', () => {
  test('istatistik çipleri; kâr çipi yalnızca kâr yetkisi olana', async () => {
    await ekranAc();
    for (const [etiket, deger] of [
      ['Toplam', '3'],
      ['Bugün', '1'],
      ['Beklemede', '2'],
      ['İşlemde', '0'],
      ['Tamamlandı', '1'],
      ['İptal', '0'],
      ['Satış', '₺3.500'],
      ['Kâr', '₺450'],
    ])
      expect(ozet(etiket)).toBe(deger);
  });

  test('kâr yetkisi yoksa kâr çipi ve Kâr sütunu görünmez', async () => {
    await ekranAc({ karGor: false });
    expect(ozetYok('Kâr')).not.toBeInTheDocument();
    expect(basliklar()).toEqual(['Müşteri', 'Telefon', 'Toplam Satış', 'Oluşturan', 'Durum', 'Tarih', 'İşlemler']);
  });

  test('tablo: sütunlar ve satır içeriği (tarih yoksa tire; durum etiketi)', async () => {
    await ekranAc();
    expect(basliklar()).toEqual(['Müşteri', 'Telefon', 'Toplam Satış', 'Kâr', 'Oluşturan', 'Durum', 'Tarih', 'İşlemler']);
    expect(hucreler(satir('Ayşe Yılmaz'))).toEqual(['Ayşe Yılmaz', '05551112233', '2.000 ₺', '400 ₺', 'ofis', 'Tamamlandı', '02.10.2026', '']);
    expect(hucreler(satir('Zeynep Kaya'))).toEqual(['Zeynep Kaya', '-', '500 ₺', '100 ₺', '-', 'Beklemede', '-', '']);
  });

  test('arama ad ve telefonda; tarih aralığı satış (yoksa oluşturma) tarihine göre', async () => {
    const user = await ekranAc();
    const kutu = screen.getByPlaceholderText('Ad veya telefon ara...');
    await user.type(kutu, 'veli');
    expect(adlar()).toEqual(['Veli Demir']);
    await user.clear(kutu);
    await user.type(kutu, '0555');
    expect(adlar()).toEqual(['Ayşe Yılmaz']);
    await user.clear(kutu);
    fireEvent.change(screen.getByLabelText('Başlangıç Tarihi'), { target: { value: '2026-10-01' } });
    expect(adlar()).toEqual(['Ayşe Yılmaz', 'Veli Demir']);
    fireEvent.change(screen.getByLabelText('Başlangıç Tarihi'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Bitiş Tarihi'), { target: { value: '2026-09-30' } });
    expect(adlar()).toEqual(['Zeynep Kaya']); // created_at yedek tarih
  });

  test('hiç kayıt yoksa "Kayıt yok" satırı görünür', async () => {
    await ekranAc({ liste: [], bekleme: true });
    expect(await screen.findByText('Kayıt yok')).toBeInTheDocument();
  });

  test('silme: onay, iptal ve hata; silince stok da yenilenir', async () => {
    const user = await ekranAc();
    window.confirm.mockReturnValueOnce(false);
    await user.click(ikon(satir('Veli Demir'), 'DeleteIcon'));
    expect(aksesuarService.delete).not.toHaveBeenCalled();
    const stokCagri = aksesuarStokService.getAll.mock.calls.length;
    await user.click(ikon(satir('Veli Demir'), 'DeleteIcon'));
    expect(window.confirm).toHaveBeenLastCalledWith('Silmek istediğinizden emin misiniz?');
    await waitFor(() => expect(aksesuarService.delete).toHaveBeenCalledWith(2));
    await waitFor(() => expect(aksesuarStokService.getAll.mock.calls.length).toBe(stokCagri + 1));
    aksesuarService.delete.mockRejectedValue({ response: { data: { message: 'Silinemez' } } });
    await user.click(ikon(satir('Veli Demir'), 'DeleteIcon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Silinemez'));
  });
});

// Detay penceresindeki sayı kutusu: etiket yazısının hemen altındaki değer
const kutu = (pencere, etiket) =>
  within(pencere)
    .getAllByText(etiket)
    .find((e) => e.tagName === 'P' && e.nextElementSibling).nextElementSibling.textContent;

// ---- Detay -------------------------------------------------------------------------------------------------------
describe('Aksesuarlar: detay penceresi', () => {
  test('ürünler stoktan marka/beden/renk ile zenginleşir; indirimli toplamlar; kalan ödeme', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Ayşe Yılmaz'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(aksesuarService.getById).toHaveBeenCalledWith(1);
    expect(within(p).getByText('Aksesuar Satış Detayı')).toBeInTheDocument();
    expect(hucreler(within(p).getByRole('row', { name: /Kask LS2/ }))).toEqual([
      'Kask LS2',
      'LS2',
      'Trendyol',
      'L',
      'Siyah',
      '1',
      '₺1.600',
      '₺2.000',
      '₺2.000',
      '₺400',
    ]);
    expect(hucreler(within(p).getByRole('row', { name: /Eldiven/ }))).toEqual(['Eldiven', '-', '-', '-', '-', '2', '₺600', '₺1.000', '₺1.000', '₺400']);
    expect(kutu(p, 'Ara Toplam')).toBe('₺3.000');
    expect(kutu(p, 'İndirim')).toBe('−₺200');
    expect(kutu(p, 'Toplam Satış')).toBe('₺2.800');
    expect(kutu(p, 'Maliyet')).toBe('₺2.200');
    expect(kutu(p, 'Kâr')).toBe('₺600');
    expect(within(p).getByText('Kalan Ödeme: ₺500')).toBeInTheDocument();
    expect(within(p).getByText('Acil')).toBeInTheDocument();
    expect(within(p).getByText('Nakit')).toBeInTheDocument();
  });

  test('kâr yetkisi yoksa kâr kutusu ve kâr sütunu görünmez', async () => {
    const user = await ekranAc({ karGor: false });
    await user.click(ikon(satir('Ayşe Yılmaz'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).queryByRole('columnheader', { name: 'Kâr' })).not.toBeInTheDocument();
    expect(within(p).queryByText('Kâr', { selector: 'p' })).not.toBeInTheDocument();
    expect(kutu(p, 'Toplam Satış')).toBe('₺2.800');
  });

  test('ödeme tamamlanmışsa "Ödeme Tamamlandı ✓" yazar; Düzenle detayı kapatıp formu açar', async () => {
    const user = await ekranAc();
    aksesuarService.getById.mockResolvedValue({ data: { ...DETAY1, kalan_odeme: 0 } });
    await user.click(ikon(satir('Ayşe Yılmaz'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Ödeme Tamamlandı ✓')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Düzenle' }));
    expect(await screen.findByText('Satış Düzenle')).toBeInTheDocument();
    expect(alan('Ad Soyad *')).toHaveValue('Ayşe Yılmaz');
  });

  test('konumda openDetailId varsa o kayıt otomatik açılır ve durum temizlenir', async () => {
    mockLocation = { pathname: '/aksesuar', state: { openDetailId: 1 } };
    await ekranAc({ bekleme: true });
    expect(await screen.findByText('Aksesuar Satış Detayı')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/aksesuar', { replace: true, state: {} });
  });
});

// ---- Satış formu -------------------------------------------------------------------------------------------------
describe('Aksesuarlar: satış formu', () => {
  test('yeni satış: varsayılanlar; boş formla kaydedilince yük biçimi (kalan ödeme 0, odeme_tamamlandi yük dışı)', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni Aksesuar Satışı')).toBeInTheDocument();
    expect(alan('Satış Tarihi')).toHaveValue(new Date().toLocaleDateString('en-CA'));
    await user.type(alan('Ad Soyad *'), 'Test');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(aksesuarService.create).toHaveBeenCalled());
    const yuk = aksesuarService.create.mock.calls[0][0];
    expect(yuk).toMatchObject({ ad_soyad: 'Test', durum: 'beklemede', kalan_odeme: 0, parcalar: [], indirim: '' });
    expect(yuk).not.toHaveProperty('odeme_tamamlandi');
    await bekleDialogKapanana();
  });

  test('ürün ekle boş satır açar; stoktan seçmek fiyatları getirir; toplam ve kâr canlı hesaplanır', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Ürün Ekle' }));
    await stokSec(user, p, 0, 'Kask LS2 (Stok: 5)');
    const satirNo = within(p).getAllByRole('row')[1];
    const [adet, maliyet, satis] = within(satirNo).getAllByRole('spinbutton');
    expect(adet).toHaveValue(1);
    expect(maliyet).toHaveValue(1600);
    expect(satis).toHaveValue(2000);
    expect(within(satirNo).getAllByRole('cell')[4]).toHaveTextContent('2.000 ₺');
    await user.clear(adet);
    await user.type(adet, '2');
    expect(yazi('Ara Toplam: 4.000 ₺')).toBeInTheDocument();
    expect(yazi('Toplam: 4.000 ₺')).toBeInTheDocument();
    expect(yazi('Kâr: 800 ₺')).toBeInTheDocument(); // 4000 - 2 x 1600
  });

  test('indirim ürün toplamını aşamaz; indirimli toplam ve kâr', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Ürün Ekle' }));
    await stokSec(user, p, 0, 'Kask LS2 (Stok: 5)');
    await user.type(alan('İndirim (₺)'), '150');
    expect(yazi('İndirim: −150 ₺')).toBeInTheDocument();
    expect(yazi('Toplam: 1.850 ₺')).toBeInTheDocument();
    expect(yazi('Kâr: 250 ₺')).toBeInTheDocument();
    await user.clear(alan('İndirim (₺)'));
    await user.type(alan('İndirim (₺)'), '99999');
    expect(yazi('İndirim: −2.000 ₺')).toBeInTheDocument(); // 2.000'e kırpılır
    expect(yazi('Toplam: 0 ₺')).toBeInTheDocument();
  });

  test('satır silinir; kaydedilen yük ürün satırlarını stok kimliğiyle taşır', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Ürün Ekle' }));
    await user.click(within(p).getByRole('button', { name: 'Ürün Ekle' }));
    await stokSec(user, p, 0, 'Kask LS2 (Stok: 5)');
    await stokSec(user, p, 1, 'Eldiven (Stok: 3)');
    expect(within(p).getAllByRole('row')).toHaveLength(3);
    await user.click(ikon(within(p).getAllByRole('row')[2], 'DeleteIcon'));
    expect(within(p).getAllByRole('row')).toHaveLength(2);
    await user.type(alan('Ad Soyad *'), 'Test');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(aksesuarService.create).toHaveBeenCalled());
    expect(aksesuarService.create.mock.calls[0][0].parcalar).toEqual([{ stok_id: 10, urun_adi: 'Kask LS2', adet: 1, maliyet: 1600, satis_fiyati: 2000 }]);
  });

  test('barkod/stok kodu + Enter: stokta varsa satır eklenir, aynı kod tekrar okutulunca adet artar', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    const barkod = within(p).getByPlaceholderText(/Barkod okutun/);
    await user.type(barkod, 'K-1{Enter}');
    expect(within(p).getAllByRole('row')).toHaveLength(2);
    expect(barkod).toHaveValue('');
    await user.type(barkod, 'K-1{Enter}');
    expect(within(p).getAllByRole('row')).toHaveLength(2); // yeni satır yok
    expect(within(within(p).getAllByRole('row')[1]).getAllByRole('spinbutton')[0]).toHaveValue(2);
    expect(aksesuarStokService.getByBarkod).not.toHaveBeenCalled();
  });

  test('stok listesinde olmayan kod sunucuda aranır; bulunamazsa hata gösterilir', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    const barkod = within(p).getByPlaceholderText(/Barkod okutun/);
    aksesuarStokService.getByBarkod.mockResolvedValueOnce({ data: { id: 12, stok_adi: 'Bot', alis_fiyati: 700, satis_fiyati: 1100 } });
    await user.type(barkod, '8690001{Enter}');
    await waitFor(() => expect(aksesuarStokService.getByBarkod).toHaveBeenCalledWith('8690001'));
    await waitFor(() => expect(within(p).getAllByRole('row')).toHaveLength(2));
    await user.type(barkod, 'YOK{Enter}');
    expect(await within(p).findByText('Barkod bulunamadı: YOK')).toBeInTheDocument();
    expect(barkod).toHaveValue('');
  });

  test('kalan ödeme: işaret kalkınca alan çıkar ve yüke girer; sunucu hatası pencerede gösterilir', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' }));
    await user.type(alan('Kalan Ödeme (₺)'), '750');
    await user.type(alan('Ad Soyad *'), 'Test');
    aksesuarService.create.mockRejectedValueOnce({ response: { data: { message: 'Stok yetersiz' } } });
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Stok yetersiz')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(aksesuarService.create).toHaveBeenCalledTimes(2));
    expect(aksesuarService.create.mock.calls[1][0].kalan_odeme).toBe('750');
  });

  test('telefon 10+ hane yazılınca kayıtlı müşterinin adı boş alana dolar; dolu ad ezilmez', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    musteriService.searchByPhone.mockResolvedValue({ data: { ad_soyad: 'Kayıtlı Kişi' } });
    await user.type(within(p).getByLabelText('Telefon'), '05551112233');
    await waitFor(() => expect(alan('Ad Soyad *')).toHaveValue('Kayıtlı Kişi'));
    expect(musteriService.searchByPhone).toHaveBeenCalledWith('05551112233');
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await bekleDialogKapanana();
    const p2 = await yeniAc(user);
    await user.type(alan('Ad Soyad *'), 'Elle Yazılan');
    await user.type(within(p2).getByLabelText('Telefon'), '05551112233');
    await waitFor(() => expect(musteriService.searchByPhone.mock.calls.length).toBeGreaterThan(2));
    expect(alan('Ad Soyad *')).toHaveValue('Elle Yazılan');
  });

  test('ad yazılırken müşteri önerisi çıkar; seçilince ad ve telefon forma dolar', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(within(p).getByRole('combobox', { name: /Ad Soyad/ }), 'meh');
    await user.click(await screen.findByText('Mehmet Aksoy'));
    expect(alan('Ad Soyad *')).toHaveValue('Mehmet Aksoy');
    expect(within(p).getByLabelText('Telefon')).toHaveValue('0555');
    expect(musteriService.search).toHaveBeenCalledWith('meh');
  });

  test('düzenleme: kayıt getById ile gelir, ürün satırları ve kalan ödeme dolu; Güncelle update(id) çağırır; yükleme hatası gösterilir', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Ayşe Yılmaz'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Satış Düzenle')).toBeInTheDocument();
    expect(alan('Ad Soyad *')).toHaveValue('Ayşe Yılmaz');
    expect(alan('İndirim (₺)')).toHaveValue(200);
    expect(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' })).not.toBeChecked();
    expect(alan('Kalan Ödeme (₺)')).toHaveValue(500);
    expect(within(p).getAllByRole('row')).toHaveLength(3);
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(aksesuarService.update).toHaveBeenCalled());
    expect(aksesuarService.update.mock.calls[0][0]).toBe(1);
    expect(aksesuarService.update.mock.calls[0][1]).toMatchObject({ ad_soyad: 'Ayşe Yılmaz', kalan_odeme: 500, indirim: 200 });
    await bekleDialogKapanana();

    aksesuarService.getById.mockRejectedValue(new Error('x'));
    await user.click(ikon(satir('Veli Demir'), 'EditIcon'));
    expect(await screen.findByText('Yükleme hatası')).toBeInTheDocument();
  });
});

describe('Aksesuarlar: kalan ödeme dönüşümü', () => {
  test('veritabanından "0.00" (metin) gelen kalan ödeme ödendi sayılır ve 0 (sayı) olarak gönderilir', async () => {
    const user = await ekranAc();
    aksesuarService.getById.mockResolvedValue({ data: { ...DETAY1, kalan_odeme: '0.00' } });
    await user.click(ikon(satir('Ayşe Yılmaz'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' })).toBeChecked();
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(aksesuarService.update).toHaveBeenCalled());
    expect(aksesuarService.update.mock.calls[0][1].kalan_odeme).toBe(0);
  });
});

describe('Aksesuarlar: mobil görünüm', () => {
  beforeEach(() => {
    window.matchMedia = (q) => ({
      matches: true,
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    });
  });
  afterEach(() => {
    delete window.matchMedia;
  });

  test('kart listesi: kâr yetkiye göre; süzgeç sonucu boşsa bilgi kutusu; karta dokunmak detayı açar', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(yazi('Kâr: 400 ₺')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Ad veya telefon ara...'), 'zzz');
    expect(screen.getByText('Kayıt yok')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('Ad veya telefon ara...'));
    await user.click(screen.getByText('Ayşe Yılmaz'));
    expect(await screen.findByText('Aksesuar Satış Detayı')).toBeInTheDocument();
  });

  test('personel kartında kâr yok; formda ürünler kart olarak listelenir', async () => {
    const user = await ekranAc({ karGor: false });
    expect(screen.queryByText(/Kâr:/)).not.toBeInTheDocument();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Ürün Ekle' }));
    expect(within(p).getByText('Ürün #1')).toBeInTheDocument();
    expect(within(p).queryByRole('table')).not.toBeInTheDocument();
  });
});
