/*
 * E-Ticaret sayfası için KARAKTERİZASYON testleri: satışlar/platformlar sekmeleri, platform süzgeci, satış formu (stok ve platform
 * seçimiyle otomatik doldurma, 3 platform tipi için canlı komisyon önizlemesi), detay penceresi, rol farkları (kâr e-ticaret yetkisi olanlara açık; platform yönetimi yalnız admin).
 * Komisyon hesabı gerçek fonksiyonla (hesaplaKomisyon) üretilir; beklenen değerler aynı fonksiyondan alınır, ekranın ona uyduğu sınanır.
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ETicaret from './ETicaret';
import { eticaretService } from './eticaretApi';
import { aksesuarStokService } from '../aksesuar/aksesuarApi';
import { useAuth } from '../auth/AuthContext';
import { hesaplaKomisyon, detectPlatform } from './komisyon';

jest.mock('./eticaretApi', () => ({
  eticaretService: {
    getSales: jest.fn(), getPlatforms: jest.fn(), getStats: jest.fn(), createSale: jest.fn(), updateSale: jest.fn(), deleteSale: jest.fn(),
    createPlatform: jest.fn(), updatePlatform: jest.fn(), deletePlatform: jest.fn(),
  },
}));
jest.mock('../aksesuar/aksesuarApi', () => ({ aksesuarStokService: { getAll: jest.fn() } }));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const P1 = { id: 1, platform_adi: 'Trendyol', komisyon_orani: 15, kdv_orani: 20, kargo_ucreti: 50 };
const P2 = { id: 2, platform_adi: 'Hepsiburada', komisyon_orani: 12, kdv_orani: 20, kargo_ucreti: 40 };
const P3 = { id: 3, platform_adi: 'N11', komisyon_orani: 10, kdv_orani: 18, kargo_ucreti: 30 };
const E1 = { id: 1, urun_adi: 'Kask Visor', platform_id: 1, platform_adi: 'Trendyol', adet: 2, alis_fiyati: 600, satis_fiyati: 1000, komisyon_orani: 15, kdv_orani: 20, kargo_ucreti: 50, tarih: '2026-10-02T12:00:00', stok_id: 10 };
const E2 = { id: 2, urun_adi: 'Eldiven', platform_id: 2, platform_adi: 'Hepsiburada', adet: 1, alis_fiyati: 300, satis_fiyati: 500, komisyon_orani: 12, kdv_orani: 20, kargo_ucreti: 40, tarih: '2026-10-03T12:00:00' };
const E3 = { id: 3, urun_adi: 'Mont', platform_id: 3, platform_adi: 'N11', adet: 1, alis_fiyati: 800, satis_fiyati: 1500, komisyon_orani: 10, kdv_orani: 18, kargo_ucreti: 30, tarih: '2026-10-04T12:00:00' };
const SATISLAR = [E1, E2, E3];
const PLATFORMLAR = [P1, P2, P3];
const STOK = [{ id: 10, stok_adi: 'Kask Visor', mevcut: 5, alis_fiyati: '650.00' }, { id: 11, stok_adi: 'Eldiven', mevcut: 2, alis_fiyati: 300 }];
const STATS = { toplam_satis: 3, toplam_gelir: 3000, toplam_komisyon: 480 };

const ADMIN = { rol: 'admin' };
const PERSONEL = { rol: 'personel', eticaret_yetkisi: true };
const YETKISIZ = { rol: 'personel' }; // sayfaya normalde giremez; kâr yine de gösterilmemeli (savunma)

const tl = (v) => parseFloat(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hesap = (s) => hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, detectPlatform(s.platform_adi));

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
const kur = ({ user = ADMIN, satislar = SATISLAR } = {}) => {
  useAuth.mockReturnValue({ user });
  eticaretService.getSales.mockResolvedValue({ data: satislar });
  eticaretService.getPlatforms.mockResolvedValue({ data: PLATFORMLAR });
  eticaretService.getStats.mockResolvedValue({ data: STATS });
  eticaretService.createSale.mockResolvedValue({ data: {} });
  eticaretService.updateSale.mockResolvedValue({ data: {} });
  eticaretService.deleteSale.mockResolvedValue({ data: {} });
  eticaretService.createPlatform.mockResolvedValue({ data: {} });
  eticaretService.updatePlatform.mockResolvedValue({ data: {} });
  eticaretService.deletePlatform.mockResolvedValue({ data: {} });
  aksesuarStokService.getAll.mockResolvedValue({ data: STOK });
};
const ekranAc = async (secenek = {}) => {
  kur(secenek);
  const user = userEvent.setup();
  render(<ETicaret />);
  if (!secenek.bekleme) await screen.findByText('Kask Visor');
  return user;
};
const satir = (ad) => screen.getByRole('row', { name: new RegExp(ad) });
const hucreler = (row) => within(row).getAllByRole('cell').map((c) => c.textContent);
const basliklar = () => screen.getAllByRole('columnheader').map((h) => h.textContent);
const ikon = (kapsam, ad) => within(kapsam).getByTestId(ad);
const alan = (etiket) => screen.getByLabelText(etiket);
const kart = (etiket) => screen.getByText(etiket).nextElementSibling.textContent;
const bekleDialogKapanana = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
const sec = async (user, kapsam, etiket, secenek) => {
  await user.click(within(kapsam).getByRole('combobox', { name: etiket }));
  await user.click(screen.getByRole('option', { name: secenek }));
};

beforeEach(() => {
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  jest.spyOn(window, 'confirm').mockImplementation(() => true);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); });

// ---- Liste ve roller ---------------------------------------------------------------------------------------------
describe('E-Ticaret: satışlar', () => {
  test('admin: sütunlar (kâr dahil), satır içeriği hesaplaKomisyon sonuçlarıyla, Yeni Satış düğmesi', async () => {
    await ekranAc();
    expect(basliklar()).toEqual(['Ürün', 'Platform', 'Adet', 'Alış (₺)', 'Satış (₺)', 'Komisyon (%)', 'KDV (%)', 'Komisyon (₺)', 'Kâr (₺)', 'Tarih', 'İşlemler']);
    const h = hesap(E1);
    expect(hucreler(satir('Kask Visor'))).toEqual(['Kask Visor', 'Trendyol', '2', '600,00', '1.000,00', '%15.00', '%20', tl(h.komisyonTutari), tl(h.netKar), '02.10.2026', '']);
    expect(screen.getByRole('button', { name: 'Yeni Satış' })).toBeInTheDocument();
  });

  test('istatistik çipleri: sunucu toplamları + canlı hesaplanan toplam kâr (yalnızca admin)', async () => {
    await ekranAc();
    const toplamKar = SATISLAR.reduce((t, s) => t + hesap(s).netKar, 0);
    expect(screen.getByText('Satış: 3')).toBeInTheDocument();
    expect(screen.getByText('Gelir: ₺3.000')).toBeInTheDocument();
    expect(screen.getByText('Komisyon: ₺480')).toBeInTheDocument();
    expect(screen.getByText(`Kâr: ₺${toplamKar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`)).toBeInTheDocument();
  });

  test('e-ticaret yetkili personel: admin gibi kâr sütununu ve kâr çipini görür', async () => {
    await ekranAc({ user: PERSONEL });
    const h = hesap(E1);
    expect(basliklar()).toContain('Kâr (₺)');
    expect(screen.getByText(/^Kâr: ₺/)).toBeInTheDocument();
    expect(hucreler(satir('Kask Visor'))).toHaveLength(11);
    expect(hucreler(satir('Kask Visor'))[8]).toBe(tl(h.netKar));
  });

  test('e-ticaret yetkisi olmayan kullanıcıya kâr gösterilmez (savunma)', async () => {
    await ekranAc({ user: YETKISIZ });
    expect(basliklar()).not.toContain('Kâr (₺)');
    expect(screen.queryByText(/^Kâr:/)).not.toBeInTheDocument();
    expect(hucreler(satir('Kask Visor'))).toHaveLength(10);
  });

  test('platform süzgeci yalnızca o platformun satışlarını gösterir; yeniden "Tümü" hepsini getirir', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('combobox', { name: 'Platform Filtre' }));
    await user.click(screen.getByRole('option', { name: 'Hepsiburada' }));
    expect(screen.getByText('Eldiven')).toBeInTheDocument();
    expect(screen.queryByText('Kask Visor')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Platform Filtre' }));
    await user.click(screen.getByRole('option', { name: 'Tümü' }));
    expect(screen.getByText('Kask Visor')).toBeInTheDocument();
  });

  test('satış yoksa "Kayıt yok" satırı görünür', async () => {
    await ekranAc({ satislar: [], bekleme: true });
    expect(await screen.findByText('Kayıt yok')).toBeInTheDocument();
  });

  test('silme: onay, iptal ve hata', async () => {
    const user = await ekranAc();
    window.confirm.mockReturnValueOnce(false);
    await user.click(ikon(satir('Eldiven'), 'DeleteIcon'));
    expect(eticaretService.deleteSale).not.toHaveBeenCalled();
    const cagri = eticaretService.getSales.mock.calls.length;
    await user.click(ikon(satir('Eldiven'), 'DeleteIcon'));
    await waitFor(() => expect(eticaretService.deleteSale).toHaveBeenCalledWith(2));
    await waitFor(() => expect(eticaretService.getSales.mock.calls.length).toBe(cagri + 1));
    eticaretService.deleteSale.mockRejectedValue({ response: { data: { message: 'Silinemez' } } });
    await user.click(ikon(satir('Eldiven'), 'DeleteIcon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Silinemez'));
  });
});

// ---- Platformlar -------------------------------------------------------------------------------------------------
describe('E-Ticaret: platformlar', () => {
  test('admin: tablo, işlem düğmeleri ve Yeni Platform; "Yeni Satış" yalnızca satışlar sekmesinde', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('tab', { name: 'Platformlar' }));
    expect(basliklar()).toEqual(['Platform Adı', 'Komisyon (%)', 'KDV (%)', 'Kargo (₺)', 'İşlemler']);
    expect(hucreler(satir('N11'))).toEqual(['N11', '%10.00', '%18.00', '30,00 ₺', '']);
    expect(screen.getByRole('button', { name: 'Yeni Platform' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yeni Satış' })).not.toBeInTheDocument();
  });

  test('personel: platformları görür ama işlem sütunu ve Yeni Platform düğmesi yoktur', async () => {
    const user = await ekranAc({ user: PERSONEL });
    await user.click(screen.getByRole('tab', { name: 'Platformlar' }));
    expect(basliklar()).toEqual(['Platform Adı', 'Komisyon (%)', 'KDV (%)', 'Kargo (₺)']);
    expect(screen.queryByRole('button', { name: 'Yeni Platform' })).not.toBeInTheDocument();
  });

  test('platform ekleme: yük biçimi ve liste yenileme; sunucu hatası pencerede gösterilir', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('tab', { name: 'Platformlar' }));
    await user.click(screen.getByRole('button', { name: 'Yeni Platform' }));
    let p = await screen.findByRole('dialog');
    expect(within(p).getByText('Yeni Platform')).toBeInTheDocument();
    expect(alan('KDV Oranı (%)')).toHaveValue(20);
    await user.type(alan('Platform Adı *'), 'Amazon');
    await user.type(alan('Komisyon Oranı (%) *'), '9');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(eticaretService.createPlatform).toHaveBeenCalledWith({ platform_adi: 'Amazon', komisyon_orani: '9', kdv_orani: '20', kargo_ucreti: '0' }));
    await bekleDialogKapanana();

    eticaretService.createPlatform.mockRejectedValue({ response: { data: { message: 'Platform var' } } });
    await user.click(screen.getByRole('button', { name: 'Yeni Platform' }));
    p = await screen.findByRole('dialog');
    await user.type(alan('Platform Adı *'), 'X'); await user.type(alan('Komisyon Oranı (%) *'), '1');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Platform var')).toBeInTheDocument();
  });

  test('platform düzenleme dolu gelir; Güncelle updatePlatform çağırır; silme onaylı', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('tab', { name: 'Platformlar' }));
    await user.click(ikon(satir('Trendyol'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Platform Düzenle')).toBeInTheDocument();
    expect(alan('Platform Adı *')).toHaveValue('Trendyol');
    expect(alan('Kargo Ücreti (₺)')).toHaveValue(50);
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(eticaretService.updatePlatform).toHaveBeenCalledWith(1, { platform_adi: 'Trendyol', komisyon_orani: 15, kdv_orani: 20, kargo_ucreti: 50 }));
    await bekleDialogKapanana();
    await user.click(ikon(satir('N11'), 'DeleteIcon'));
    await waitFor(() => expect(eticaretService.deletePlatform).toHaveBeenCalledWith(3));
  });
});

// ---- Satış formu -------------------------------------------------------------------------------------------------
describe('E-Ticaret: satış formu', () => {
  const yeniAc = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Yeni Satış' }));
    return screen.findByRole('dialog');
  };

  test('yeni satış: varsayılan değerler; fiyat girilmeden komisyon önizlemesi yok', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni E-Ticaret Satışı')).toBeInTheDocument();
    expect(alan('Adet')).toHaveValue(1);
    expect(alan('KDV (%)')).toHaveValue(20);
    expect(alan('Kargo (₺)')).toHaveValue(0);
    expect(alan('Tarih')).toHaveValue(new Date().toLocaleDateString('en-CA'));
    expect(within(p).queryByText(/Komisyon Hesaplama/)).not.toBeInTheDocument();
  });

  test('stok seçilince ürün adı ve alış fiyatı dolar; platform seçilince komisyon, KDV ve kargo dolar', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await sec(user, p, 'Ürün (Stoktan)', 'Kask Visor (Stok: 5)');
    expect(alan('Ürün Adı *')).toHaveValue('Kask Visor');
    expect(alan('Ürün Alış Fiyatı (₺)')).toHaveValue(650);
    await sec(user, p, 'Platform', 'N11 (%10.00)');
    expect(alan('Komisyon (%)')).toHaveValue(10);
    expect(alan('KDV (%)')).toHaveValue(18);
    expect(alan('Kargo (₺)')).toHaveValue(30);
  });

  test('canlı önizleme Trendyol (varsayılan): komisyon kartı, KDV kalemleri ve Net Kâr hesaplaKomisyon ile uyumlu (admin)', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await sec(user, p, 'Platform', 'Trendyol (%15.00)');
    await user.type(alan('Ürün Satış Fiyatı (₺)'), '1000');
    await user.type(alan('Ürün Alış Fiyatı (₺)'), '600');
    await user.clear(alan('Adet')); await user.type(alan('Adet'), '2');
    const h = hesaplaKomisyon('1000', '600', 15, 20, 50, '2', 'trendyol');
    expect(within(p).getByText('Komisyon Hesaplama (Trendyol)')).toBeInTheDocument();
    expect(kart('Komisyon (Toplam)')).toBe(`${tl(h.toplamKomisyon)} ₺`);
    expect(kart('Kâr Oranı')).toBe(`%${h.karOrani}`);
    expect(kart('Yat. Geri Dönüş Oranı')).toBe(`%${h.yatirimGeriDonus}`);
    expect(within(p).getByText('Hizmet Bedeli KDV').nextElementSibling).toHaveTextContent(`${tl(h.hizmetKDV)} ₺`);
    expect(within(p).getByText('Net Kâr (2 adet)').nextElementSibling).toHaveTextContent(`${tl(h.netKar)} ₺`);
  });

  test('canlı önizleme HepsiBurada ve N11: platforma özel kartlar', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(alan('Ürün Satış Fiyatı (₺)'), '500');
    await sec(user, p, 'Platform', 'Hepsiburada (%12.00)');
    expect(within(p).getByText('Komisyon Hesaplama (HepsiBurada)')).toBeInTheDocument();
    for (const e of ['Ödeme Bedeli', 'İşlem Bedeli', 'Stopaj Bedeli']) expect(within(p).getByText(e)).toBeInTheDocument();
    expect(within(p).getByText('Ödeme ve İşlem Bedeli KDV')).toBeInTheDocument();
    await sec(user, p, 'Platform', 'N11 (%10.00)');
    expect(within(p).getByText('Komisyon Hesaplama (N11)')).toBeInTheDocument();
    expect(within(p).getByText('S. Pazarlama ve Hizmet')).toBeInTheDocument();
    expect(within(p).getByText('Pazarlama ve Hizmet KDV')).toBeInTheDocument();
    expect(within(p).queryByText('Ödeme Bedeli')).not.toBeInTheDocument();
  });

  test('e-ticaret yetkili personel önizlemede kâr oranı, yatırım geri dönüşü ve Net Kâr görür', async () => {
    const user = await ekranAc({ user: PERSONEL });
    const p = await yeniAc(user);
    await user.type(alan('Ürün Satış Fiyatı (₺)'), '1000');
    expect(within(p).getByText('Komisyon (Toplam)')).toBeInTheDocument();
    expect(within(p).getByText('Satıştan Oluşan KDV')).toBeInTheDocument();
    expect(within(p).getByText('Kâr Oranı')).toBeInTheDocument();
    expect(within(p).getByText('Yat. Geri Dönüş Oranı')).toBeInTheDocument();
    expect(within(p).getByText(/^Net Kâr/)).toBeInTheDocument();
  });

  test('yetkisiz kullanıcı önizlemede kâr alanlarını görmez; komisyon ve KDV görür (savunma)', async () => {
    const user = await ekranAc({ user: YETKISIZ });
    const p = await yeniAc(user);
    await user.type(alan('Ürün Satış Fiyatı (₺)'), '1000');
    expect(within(p).getByText('Komisyon (Toplam)')).toBeInTheDocument();
    expect(within(p).queryByText('Kâr Oranı')).not.toBeInTheDocument();
    expect(within(p).queryByText('Yat. Geri Dönüş Oranı')).not.toBeInTheDocument();
    expect(within(p).queryByText(/^Net Kâr/)).not.toBeInTheDocument();
  });

  test('kaydet: yük (form alanları olduğu gibi) createSale\'e gider; pencere kapanır, liste yenilenir; hata gösterilir', async () => {
    const user = await ekranAc();
    const cagri = eticaretService.getSales.mock.calls.length;
    let p = await yeniAc(user);
    await sec(user, p, 'Platform', 'Trendyol (%15.00)');
    await user.type(alan('Ürün Adı *'), 'Test Ürün');
    await user.type(alan('Ürün Satış Fiyatı (₺)'), '1000');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(eticaretService.createSale).toHaveBeenCalled());
    expect(eticaretService.createSale.mock.calls[0][0]).toMatchObject({ stok_id: '', platform_id: 1, urun_adi: 'Test Ürün', satis_fiyati: '1000', komisyon_orani: 15, kdv_orani: 20, kargo_ucreti: 50, adet: 1 });
    await bekleDialogKapanana();
    await waitFor(() => expect(eticaretService.getSales.mock.calls.length).toBe(cagri + 1));

    eticaretService.createSale.mockRejectedValue({ response: { data: { message: 'Stok yetersiz' } } });
    p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Stok yetersiz')).toBeInTheDocument();
  });

  test('düzenleme: kayıt forma dolar; Güncelle updateSale(id) çağırır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Kask Visor'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Satış Düzenle')).toBeInTheDocument();
    expect(alan('Ürün Adı *')).toHaveValue('Kask Visor');
    expect(alan('Tarih')).toHaveValue('2026-10-02');
    expect(alan('Adet')).toHaveValue(2);
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(eticaretService.updateSale).toHaveBeenCalled());
    expect(eticaretService.updateSale.mock.calls[0][0]).toBe(1);
    expect(eticaretService.updateSale.mock.calls[0][1]).toMatchObject({ stok_id: 10, platform_id: 1, urun_adi: 'Kask Visor', adet: 2, tarih: '2026-10-02' });
  });
});

// ---- Detay -------------------------------------------------------------------------------------------------------
describe('E-Ticaret: detay penceresi', () => {
  test('admin: ürün/fiyat bilgileri, Net Kâr ve Trendyol komisyon/KDV dökümü', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Kask Visor'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    const h = hesap(E1);
    expect(within(p).getByText('E-Ticaret Satış Detayı')).toBeInTheDocument();
    expect(within(p).getByText('Net Kâr').nextElementSibling).toHaveTextContent(`${tl(h.netKar)} ₺`);
    expect(within(p).getByText('Komisyon Hesaplama Detayları (Trendyol)', { exact: false })).toBeInTheDocument();
    expect(within(p).getByText('Komisyon (Toplam)').nextElementSibling).toHaveTextContent(`${tl(h.toplamKomisyon)} ₺`);
    expect(within(p).getByText('Hizmet Bedeli KDV').nextElementSibling).toHaveTextContent(`${tl(h.hizmetKDV)} ₺`);
    expect(within(p).getByText('Ödenecek KDV').nextElementSibling).toHaveTextContent(`${tl(h.odenecekKDV)} ₺`);
  });

  test('HepsiBurada ve N11 satışlarının dökümü platforma özeldir', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Eldiven'), 'VisibilityIcon'));
    let p = await screen.findByRole('dialog');
    expect(within(p).getByText('Ödeme Bedeli')).toBeInTheDocument();
    expect(within(p).getByText('Ödeme ve İşlem Bedeli KDV')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kapat' }));
    await bekleDialogKapanana();
    await user.click(ikon(satir('Mont'), 'VisibilityIcon'));
    p = await screen.findByRole('dialog');
    expect(within(p).getByText('S. Pazarlama ve Hizmet')).toBeInTheDocument();
    expect(within(p).getByText('Pazarlama ve Hizmet KDV')).toBeInTheDocument();
  });

  test('e-ticaret yetkili personel: Net Kâr kutusu, kâr oranı ve yatırım geri dönüşü görünür', async () => {
    const user = await ekranAc({ user: PERSONEL });
    await user.click(ikon(satir('Kask Visor'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Net Kâr')).toBeInTheDocument();
    expect(within(p).getByText('Stopaj')).toBeInTheDocument();
  });

  test('yetkisiz kullanıcı: detayda Net Kâr kutusu, kâr oranı ve yatırım geri dönüşü görünmez (savunma)', async () => {
    const user = await ekranAc({ user: YETKISIZ });
    await user.click(ikon(satir('Kask Visor'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).queryByText('Net Kâr')).not.toBeInTheDocument();
    expect(within(p).queryByText('Kâr Oranı')).not.toBeInTheDocument();
    expect(within(p).queryByText('Yat. Geri Dönüş')).not.toBeInTheDocument();
    expect(within(p).getByText('Stopaj')).toBeInTheDocument();
  });

  test('Düzenle detayı kapatıp düzenleme formunu açar', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Kask Visor'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('button', { name: 'Düzenle' }));
    expect(await screen.findByText('Satış Düzenle')).toBeInTheDocument();
  });
});

describe('E-Ticaret: mobil görünüm', () => {
  beforeEach(() => {
    window.matchMedia = (q) => ({ matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false });
  });
  afterEach(() => { delete window.matchMedia; });

  test('kart listesi: kâr görünür; karta dokunmak detayı açar; platform sekmesi kartlarla', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const h = hesap(E1);
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === `Kâr: ${tl(h.netKar)} ₺`)).toBeInTheDocument();
    await user.click(screen.getByText('Kask Visor'));
    expect(await screen.findByText('E-Ticaret Satış Detayı')).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Kapat' }));
    await bekleDialogKapanana();
    await user.click(screen.getByRole('tab', { name: 'Platformlar' }));
    expect(screen.getByText('Trendyol')).toBeInTheDocument();
  });

  test('e-ticaret yetkili personel kartında kâr var; yetkisizde yok', async () => {
    await ekranAc({ user: PERSONEL });
    expect(screen.getAllByText(/Kâr:/).length).toBeGreaterThan(0);
  });

  test('yetkisiz kullanıcı kartında kâr yok (savunma)', async () => {
    await ekranAc({ user: YETKISIZ });
    expect(screen.queryByText(/Kâr:/)).not.toBeInTheDocument();
  });
});
