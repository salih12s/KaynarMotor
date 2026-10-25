/*
 * Yedek Parça Stok sayfası için KARAKTERİZASYON testleri: liste ve özet, stok durumu süzgeci, arama (gecikmeli, eski yanıt yeniyi ezmez),
 * ekleme/düzenleme penceresi, silme onayı, toplu içe aktarma, etiket, mobil kart görünümü. API ve etiket yazdırma sahte (mock).
 * Amaç: aksesuar stok sayfasıyla ortak koda çıkarılırken davranışın değişmediğini kanıtlamak.
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YedekParcaStok from './YedekParcaStok';
import { yedekParcaStokService } from './yedekParcaApi';
import { stokEtiketiYazdir } from '../../shared/utils/stokEtiketi';

vi.mock('./yedekParcaApi', () => ({
  yedekParcaStokService: { getAll: vi.fn(), search: vi.fn(), getNextStokKodu: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), topluEkle: vi.fn() },
}));
vi.mock('../../shared/utils/stokEtiketi', () => ({ stokEtiketiYazdir: vi.fn() }));

// ---- Sabit test verisi (sayılar elle hesaplandı) -----------------------------------------------------------------
const BALATA = {
  id: 1,
  stok_kodu: 'B-1',
  stok_adi: 'Fren Balatası',
  marka: 'Brembo',
  alis_fiyati: '250.00',
  satis_fiyati: '400.00',
  giren_miktar: 10,
  mevcut: 10,
};
const ZINCIR = { id: 2, stok_kodu: 'Z-1', stok_adi: 'Zincir Seti', marka: 'DID', alis_fiyati: '900.00', satis_fiyati: '1400.00', giren_miktar: 2, mevcut: 0 };
const FILTRE = { id: 3, stok_kodu: 'F-1', stok_adi: 'Yağ Filtresi', marka: '', alis_fiyati: '60.00', satis_fiyati: '120.00', giren_miktar: 5, mevcut: 2 };
const LISTE = [BALATA, ZINCIR, FILTRE];
// Özet: 3 ürün; envanter = 250x10 + 900x0 + 60x2 = 2.620 ₺

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
type Kullanim = ReturnType<typeof userEvent.setup>;
const ekranAc = async () => {
  const user = userEvent.setup();
  render(<YedekParcaStok />);
  await screen.findByText('Fren Balatası');
  return user;
};
const satir = (ad: string) => screen.getByRole('row', { name: new RegExp(ad) });
const ikon = (kapsam: HTMLElement, ad: string) => within(kapsam).getByTestId(ad);
const hucreler = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent);
const sec = async (user: Kullanim, etiket: string, secenek: string) => {
  await user.click(screen.getByRole('combobox', { name: etiket }));
  await user.click(screen.getByRole('option', { name: secenek }));
};
const yeniAc = async (user: Kullanim) => {
  await user.click(screen.getByRole('button', { name: 'Yeni Stok' }));
  return screen.findByRole('dialog');
};
// Özet şeridi çipi: etiket ve değer ayrı yazı parçaları ("Toplam: 3 ürün"); bütün metne göre bulunur
const cip = (metin: string) => screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === metin);
const sonArama = () => vi.mocked(yedekParcaStokService.search).mock.calls.at(-1)?.[0];
const ARAMA = 'Stok ara (kod, ad, marka)';

beforeEach(() => {
  vi.mocked(yedekParcaStokService.getAll).mockResolvedValue({ data: LISTE } as never);
  vi.mocked(yedekParcaStokService.search).mockResolvedValue({ data: [BALATA] } as never);
  vi.mocked(yedekParcaStokService.getNextStokKodu).mockResolvedValue({ data: { nextStokKodu: '9000000000099' } } as never);
  vi.mocked(yedekParcaStokService.create).mockResolvedValue({ data: {} } as never);
  vi.mocked(yedekParcaStokService.update).mockResolvedValue({ data: {} } as never);
  vi.mocked(yedekParcaStokService.delete).mockResolvedValue({ data: {} } as never);
  vi.mocked(yedekParcaStokService.topluEkle).mockResolvedValue({ data: { message: 'ok' } } as never);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
});

// ---- Liste ve özet -----------------------------------------------------------------------------------------------
describe('Yedek Parça Stok: liste ve özet', () => {
  test('özet şeridi ürün sayısını ve envanter değerini (alış x mevcut) gösterir', async () => {
    await ekranAc();
    expect(cip('Toplam: 3 ürün')).toBeInTheDocument();
    expect(cip('Envanter: ₺2.620')).toBeInTheDocument();
  });

  test('tablo sütunları ve satır değerleri; tükenen ürün "Tükendi", az kalan "N adet" damgası taşır', async () => {
    await ekranAc();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Stok Kodu',
      'Stok Adı',
      'Marka',
      'Alış (₺)',
      'Satış (₺)',
      'Mevcut',
      'İşlemler',
    ]);
    expect(hucreler(satir('Fren Balatası'))).toEqual(['B-1', 'Fren Balatası', 'Brembo', '250', '400', '10', '']);
    expect(hucreler(satir('Zincir Seti'))[5]).toBe('Tükendi');
    expect(hucreler(satir('Yağ Filtresi')).slice(0, 3)).toEqual(['F-1', 'Yağ Filtresi', '-']); // boş marka "-"
    expect(hucreler(satir('Yağ Filtresi'))[5]).toBe('2 adet');
  });

  test('liste boşsa "Kayıt yok" satırı çıkar', async () => {
    vi.mocked(yedekParcaStokService.getAll).mockResolvedValue({ data: [] } as never);
    render(<YedekParcaStok />);
    expect(await screen.findByText('Kayıt yok')).toBeInTheDocument();
    expect(cip('Toplam: 0 ürün')).toBeInTheDocument();
  });
});

// ---- Süzgeç ------------------------------------------------------------------------------------------------------
describe('Yedek Parça Stok: stok durumu süzgeci', () => {
  test('"Stokta Var" tükenenleri, "Stok Biten" kalanları gizler; "Tümü" hepsini döndürür', async () => {
    const user = await ekranAc();
    await sec(user, 'Stok Durumu', 'Stokta Var');
    expect(screen.queryByText('Zincir Seti')).not.toBeInTheDocument();
    expect(screen.getByText('Fren Balatası')).toBeInTheDocument();
    expect(screen.getByText('Yağ Filtresi')).toBeInTheDocument();
    await sec(user, 'Stok Durumu', 'Stok Biten');
    expect(screen.getByText('Zincir Seti')).toBeInTheDocument();
    expect(screen.queryByText('Fren Balatası')).not.toBeInTheDocument();
    await sec(user, 'Stok Durumu', 'Tümü');
    expect(screen.getAllByRole('row')).toHaveLength(4); // başlık + 3 ürün
  });

  test('süzgeç özet şeridini değiştirmez (özet tüm stoğu sayar)', async () => {
    const user = await ekranAc();
    await sec(user, 'Stok Durumu', 'Stok Biten');
    expect(cip('Toplam: 3 ürün')).toBeInTheDocument();
    expect(cip('Envanter: ₺2.620')).toBeInTheDocument();
  });
});

// ---- Arama -------------------------------------------------------------------------------------------------------
describe('Yedek Parça Stok: arama', () => {
  test('yazılan metin gecikmeyle sunucuya sorulur; sonuç listenin yerini alır; kutu boşalınca tüm liste geri gelir', async () => {
    const user = await ekranAc();
    const getAllSayisi = vi.mocked(yedekParcaStokService.getAll).mock.calls.length;
    await user.type(screen.getByPlaceholderText(ARAMA), 'balata');
    await waitFor(() => expect(sonArama()).toBe('balata'));
    await waitFor(() => expect(screen.queryByText('Zincir Seti')).not.toBeInTheDocument());
    expect(screen.getByText('Fren Balatası')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(ARAMA));
    expect(await screen.findByText('Zincir Seti')).toBeInTheDocument();
    expect(vi.mocked(yedekParcaStokService.getAll).mock.calls.length).toBeGreaterThan(getAllSayisi);
  });

  test('sadece boşluk yazmak aramaya gitmez', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), '   ');
    await new Promise((c) => setTimeout(c, 450)); // gecikme süresinden uzun bekle
    expect(yedekParcaStokService.search).not.toHaveBeenCalled();
  });

  test('hızlı yazarken eski aramanın geç gelen yanıtı yenisinin üzerine yazmaz', async () => {
    const user = await ekranAc();
    let eskiyiBitir: (yanit: unknown) => void = () => {};
    const eski = new Promise((coz) => {
      eskiyiBitir = coz;
    });
    vi.mocked(yedekParcaStokService.search)
      .mockImplementationOnce(() => eski as never) // "fr" için yavaş
      .mockImplementationOnce(() => Promise.resolve({ data: [FILTRE] }) as never); // "fre" için hızlı
    await user.type(screen.getByPlaceholderText(ARAMA), 'fr');
    await waitFor(() => expect(yedekParcaStokService.search).toHaveBeenCalledTimes(1));
    await user.type(screen.getByPlaceholderText(ARAMA), 'e');
    await waitFor(() => expect(yedekParcaStokService.search).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Fren Balatası')).not.toBeInTheDocument());
    expect(screen.getByText('Yağ Filtresi')).toBeInTheDocument();
    eskiyiBitir({ data: [BALATA] }); // eski yanıt şimdi geliyor
    await new Promise((c) => setTimeout(c, 50));
    expect(screen.queryByText('Fren Balatası')).not.toBeInTheDocument();
    expect(screen.getByText('Yağ Filtresi')).toBeInTheDocument();
  });
});

// ---- Ekleme / düzenleme ------------------------------------------------------------------------------------------
describe('Yedek Parça Stok: ekleme ve düzenleme penceresi', () => {
  test('"Yeni Stok": sıradaki stok kodu önerilir, giren miktar 0; "Kaydet" create çağırır ve listeyi yeniler', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni Yedek Parça Stoğu')).toBeInTheDocument();
    await waitFor(() => expect(within(p).getByLabelText('Stok Kodu (Barkod)')).toHaveValue('9000000000099'));
    expect(within(p).getByLabelText('Giren Miktar')).toHaveValue(0);
    await user.type(within(p).getByLabelText(/Ürün Adı/), 'Rulman');
    await user.type(within(p).getByLabelText('Alış Fiyatı'), '80');
    await user.type(within(p).getByLabelText('Satış Fiyatı'), '150');
    const yuklemeSayisi = vi.mocked(yedekParcaStokService.getAll).mock.calls.length;
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(yedekParcaStokService.create).toHaveBeenCalledTimes(1));
    expect(yedekParcaStokService.create).toHaveBeenCalledWith({
      stok_kodu: '9000000000099',
      stok_adi: 'Rulman',
      marka: '',
      alis_fiyati: '80',
      satis_fiyati: '150',
      giren_miktar: 0,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(vi.mocked(yedekParcaStokService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
  });

  test('sıradaki stok kodu alınamazsa pencere yine açılır, kod boş kalır', async () => {
    vi.mocked(yedekParcaStokService.getNextStokKodu).mockRejectedValue(new Error('yok'));
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByLabelText('Stok Kodu (Barkod)')).toHaveValue('');
  });

  test('sunucu hatası pencerede gösterilir, pencere açık kalır; yeniden denenince hata temizlenir', async () => {
    vi.mocked(yedekParcaStokService.create).mockRejectedValueOnce({ response: { data: { message: 'Bu stok kodu zaten var' } } });
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(within(p).getByLabelText(/Ürün Adı/), 'Rulman');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Bu stok kodu zaten var')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('"Düzenle": mevcut değerlerle dolar; "Güncelle" update(id, form) çağırır (create değil)', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Fren Balatası'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Stok Düzenle')).toBeInTheDocument();
    expect(within(p).getByLabelText('Stok Kodu (Barkod)')).toHaveValue('B-1');
    expect(within(p).getByLabelText(/Ürün Adı/)).toHaveValue('Fren Balatası');
    expect(within(p).getByLabelText('Giren Miktar')).toHaveValue(10);
    expect(yedekParcaStokService.getNextStokKodu).not.toHaveBeenCalled(); // düzenlemede yeni kod istenmez
    await user.clear(within(p).getByLabelText('Satış Fiyatı'));
    await user.type(within(p).getByLabelText('Satış Fiyatı'), '450');
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(yedekParcaStokService.update).toHaveBeenCalledTimes(1));
    const [id, yuk] = vi.mocked(yedekParcaStokService.update).mock.calls[0];
    expect(id).toBe(1);
    expect(yuk).toMatchObject({ stok_kodu: 'B-1', stok_adi: 'Fren Balatası', marka: 'Brembo', satis_fiyati: '450' });
    expect(yedekParcaStokService.create).not.toHaveBeenCalled();
  });

  test('pencerede "Etiket Yazdır": stok kodu varsa formdaki değerlerle çağrılır, yoksa pasiftir', async () => {
    vi.mocked(yedekParcaStokService.getNextStokKodu).mockResolvedValue({ data: { nextStokKodu: '' } } as never);
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByRole('button', { name: 'Etiket Yazdır' })).toBeDisabled();
    await user.type(within(p).getByLabelText('Stok Kodu (Barkod)'), 'X-9');
    await user.type(within(p).getByLabelText(/Ürün Adı/), 'Deneme');
    expect(within(p).getByRole('button', { name: 'Etiket Yazdır' })).toBeEnabled();
    await user.click(within(p).getByRole('button', { name: 'Etiket Yazdır' }));
    expect(stokEtiketiYazdir).toHaveBeenCalledWith(expect.objectContaining({ stok_kodu: 'X-9', stok_adi: 'Deneme' }));
  });

  test('"İptal" pencereyi kapatır, kayıt göndermez', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(yedekParcaStokService.create).not.toHaveBeenCalled();
  });
});

// ---- Silme, etiket -----------------------------------------------------------------------------------------------
describe('Yedek Parça Stok: silme ve etiket', () => {
  test('silme: onay verilmezse istek gitmez; onaylanırsa delete(id) çağrılır ve liste yenilenir; hata alert ile bildirilir', async () => {
    const user = await ekranAc();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(ikon(satir('Zincir Seti'), 'DeleteIcon'));
    expect(yedekParcaStokService.delete).not.toHaveBeenCalled();
    const yuklemeSayisi = vi.mocked(yedekParcaStokService.getAll).mock.calls.length;
    await user.click(ikon(satir('Zincir Seti'), 'DeleteIcon'));
    expect(window.confirm).toHaveBeenLastCalledWith('Bu stok kaydını silmek istediğinizden emin misiniz?');
    await waitFor(() => expect(yedekParcaStokService.delete).toHaveBeenCalledWith(2));
    await waitFor(() => expect(vi.mocked(yedekParcaStokService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
    vi.mocked(yedekParcaStokService.delete).mockRejectedValue({ response: { data: { message: 'Satışta kullanılıyor' } } });
    await user.click(ikon(satir('Zincir Seti'), 'DeleteIcon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Satışta kullanılıyor'));
  });

  test('satırdaki yazdır düğmesi o ürünün etiketini basar', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Fren Balatası'), 'PrintIcon'));
    expect(stokEtiketiYazdir).toHaveBeenCalledWith(expect.objectContaining({ id: 1, stok_kodu: 'B-1' }));
  });
});

// ---- Toplu içe aktarma -------------------------------------------------------------------------------------------
describe('Yedek Parça Stok: toplu içe aktarma', () => {
  const importAc = async (user: Kullanim) => {
    await user.click(screen.getByRole('button', { name: 'İçe Aktar' }));
    return screen.findByRole('dialog');
  };

  test('Tab ile ayrılmış satırlar ürünlere çevrilir; boş satırlar atlanır; eksik sütunlar 0 olur; başarıda pencere kapanır', async () => {
    const user = await ekranAc();
    const p = await importAc(user);
    await user.click(within(p).getByRole('textbox'));
    await user.paste('Y001\tRulman\t50\t100\t20\n\nY002\tCivata');
    const yuklemeSayisi = vi.mocked(yedekParcaStokService.getAll).mock.calls.length;
    await user.click(within(p).getByRole('button', { name: 'İçe Aktar' }));
    await waitFor(() => expect(yedekParcaStokService.topluEkle).toHaveBeenCalledTimes(1));
    expect(yedekParcaStokService.topluEkle).toHaveBeenCalledWith([
      { stok_kodu: 'Y001', stok_adi: 'Rulman', alis_fiyati: '50', satis_fiyati: '100', giren_miktar: '20' },
      { stok_kodu: 'Y002', stok_adi: 'Civata', alis_fiyati: 0, satis_fiyati: 0, giren_miktar: 0 },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(vi.mocked(yedekParcaStokService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
  });

  test('yer tutucudaki örnek satır yapıştırılınca sayı alanları sayı olarak gider', async () => {
    const user = await ekranAc();
    const p = await importAc(user);
    const ornek = within(p).getByRole('textbox').getAttribute('placeholder') as string;
    await user.click(within(p).getByRole('textbox'));
    await user.paste(ornek);
    await user.click(within(p).getByRole('button', { name: 'İçe Aktar' }));
    await waitFor(() => expect(yedekParcaStokService.topluEkle).toHaveBeenCalledTimes(1));
    const [satirlar] = vi.mocked(yedekParcaStokService.topluEkle).mock.calls[0] as unknown as [Record<string, string>[]];
    expect(satirlar).toHaveLength(1);
    for (const alan of ['alis_fiyati', 'satis_fiyati', 'giren_miktar']) expect(Number.isFinite(Number(satirlar[0][alan]))).toBe(true);
  });

  test('sunucu hatası pencerede gösterilir ve pencere açık kalır', async () => {
    vi.mocked(yedekParcaStokService.topluEkle).mockRejectedValue({ response: { data: { message: 'Satır 2 geçersiz' } } });
    const user = await ekranAc();
    const p = await importAc(user);
    await user.click(within(p).getByRole('textbox'));
    await user.paste('Y001\tRulman');
    await user.click(within(p).getByRole('button', { name: 'İçe Aktar' }));
    expect(await within(p).findByText('Satır 2 geçersiz')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('"İptal" pencereyi kapatır', async () => {
    const user = await ekranAc();
    const p = await importAc(user);
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(yedekParcaStokService.topluEkle).not.toHaveBeenCalled();
  });
});

// ---- Mobil görünüm -----------------------------------------------------------------------------------------------
describe('Yedek Parça Stok: mobil görünüm', () => {
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
    delete (window as Partial<Window>).matchMedia;
  });

  test('tablo yerine kartlar; kartta kod, marka, alış/satış ve mevcut görünür; süzgeç boş sonuçta bilgi kutusu çıkar', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('B-1 • Brembo')).toBeInTheDocument();
    expect(screen.getByText('Mevcut: 10')).toBeInTheDocument();
    expect(screen.getByText('Mevcut: 0')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Alış: 250 ₺')).toBeInTheDocument();
    vi.mocked(yedekParcaStokService.search).mockResolvedValue({ data: [ZINCIR] } as never);
    await user.type(screen.getByPlaceholderText(ARAMA), 'x');
    await waitFor(() => expect(screen.queryByText('Mevcut: 10')).not.toBeInTheDocument()); // arama sonucu: tek ürün, tükenmiş
    await sec(user, 'Stok Durumu', 'Stokta Var'); // tükenmişler gizlenir: hiçbiri kalmaz
    expect(await screen.findByText('Kayıt yok')).toBeInTheDocument();
  });

  test('kartta düzenle düğmesi pencereyi o ürünle açar', async () => {
    const user = await ekranAc();
    const kart = screen.getByText('Zincir Seti').closest('.MuiPaper-root') as HTMLElement;
    await user.click(ikon(kart, 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByLabelText('Stok Kodu (Barkod)')).toHaveValue('Z-1');
  });
});
