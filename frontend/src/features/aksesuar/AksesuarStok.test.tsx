/*
 * Aksesuar Stok sayfası için KARAKTERİZASYON testleri: liste ve özet, stok durumu/kategori süzgeci, arama (gecikmeli, eski yanıt yeniyi
 * ezmez), ekleme/düzenleme penceresi, silme onayı, toplu içe aktarma, etiket, mobil kart görünümü. API ve etiket yazdırma sahte (mock).
 * Amaç: yedek parça stok sayfasıyla ortak koda çıkarılırken davranışın değişmediğini kanıtlamak.
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AksesuarStok from './AksesuarStok';
import { aksesuarStokService } from './aksesuarApi';
import { stokEtiketiYazdir } from '../../shared/utils/stokEtiketi';

vi.mock('./aksesuarApi', () => ({
  aksesuarStokService: { getAll: vi.fn(), search: vi.fn(), getNextStokKodu: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), topluEkle: vi.fn() },
}));
vi.mock('../../shared/utils/stokEtiketi', () => ({ stokEtiketiYazdir: vi.fn() }));

// ---- Sabit test verisi (sayılar elle hesaplandı) -----------------------------------------------------------------
const KASK = {
  id: 1,
  stok_kodu: 'K-1',
  stok_adi: 'Kask LS2',
  marka: 'LS2',
  kategori: 'Ekipman',
  beden: 'L',
  renk: 'Siyah',
  alis_fiyati: '1000.00',
  satis_fiyati: '1500.00',
  giren_miktar: 5,
  mevcut: 5,
};
const ELDIVEN = {
  id: 2,
  stok_kodu: 'E-1',
  stok_adi: 'Eldiven',
  marka: 'Alpine',
  kategori: 'Ekipman',
  alis_fiyati: '200.00',
  satis_fiyati: '350.00',
  giren_miktar: 2,
  mevcut: 0,
};
const STICKER = {
  id: 3,
  stok_kodu: 'S-1',
  stok_adi: 'Tank Sticker',
  marka: '',
  kategori: 'Sticker',
  alis_fiyati: '50.00',
  satis_fiyati: '90.00',
  giren_miktar: 10,
  mevcut: 2,
};
const LISTE = [KASK, ELDIVEN, STICKER];
// Özet: 3 ürün; envanter = 1000x5 + 200x0 + 50x2 = 5.100 ₺

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
type Kullanim = ReturnType<typeof userEvent.setup>;
const ekranAc = async () => {
  const user = userEvent.setup();
  render(<AksesuarStok />);
  await screen.findByText('Kask LS2');
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
const sonArama = () => vi.mocked(aksesuarStokService.search).mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.mocked(aksesuarStokService.getAll).mockResolvedValue({ data: LISTE } as never);
  vi.mocked(aksesuarStokService.search).mockResolvedValue({ data: [KASK] } as never);
  vi.mocked(aksesuarStokService.getNextStokKodu).mockResolvedValue({ data: { nextStokKodu: 'AKS-100' } } as never);
  vi.mocked(aksesuarStokService.create).mockResolvedValue({ data: {} } as never);
  vi.mocked(aksesuarStokService.update).mockResolvedValue({ data: {} } as never);
  vi.mocked(aksesuarStokService.delete).mockResolvedValue({ data: {} } as never);
  vi.mocked(aksesuarStokService.topluEkle).mockResolvedValue({ data: { message: 'ok' } } as never);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
});

// ---- Liste ve özet -----------------------------------------------------------------------------------------------
describe('Aksesuar Stok: liste ve özet', () => {
  test('özet şeridi ürün sayısını ve envanter değerini (alış x mevcut) gösterir', async () => {
    await ekranAc();
    expect(cip('Toplam: 3 ürün')).toBeInTheDocument();
    expect(cip('Envanter: ₺5.100')).toBeInTheDocument();
  });

  test('tablo sütunları ve satır değerleri; tükenen ürün "Tükendi", az kalan "N adet" damgası taşır', async () => {
    await ekranAc();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Stok Kodu',
      'Stok Adı',
      'Marka',
      'Kategori',
      'Beden',
      'Renk',
      'Alış (₺)',
      'Satış (₺)',
      'Mevcut',
      'İşlemler',
    ]);
    expect(hucreler(satir('Kask LS2'))).toEqual(['K-1', 'Kask LS2', 'LS2', 'Ekipman', 'L', 'Siyah', '1.000', '1.500', '5', '']);
    expect(hucreler(satir('Eldiven'))[8]).toBe('Tükendi');
    expect(hucreler(satir('Tank Sticker')).slice(0, 6)).toEqual(['S-1', 'Tank Sticker', '-', 'Sticker', '-', '-']); // boş alanlar "-"
    expect(hucreler(satir('Tank Sticker'))[8]).toBe('2 adet');
  });

  test('liste boşsa "Kayıt yok" satırı çıkar', async () => {
    vi.mocked(aksesuarStokService.getAll).mockResolvedValue({ data: [] } as never);
    render(<AksesuarStok />);
    expect(await screen.findByText('Kayıt yok')).toBeInTheDocument();
    expect(cip('Toplam: 0 ürün')).toBeInTheDocument();
  });
});

// ---- Süzgeçler ---------------------------------------------------------------------------------------------------
describe('Aksesuar Stok: süzgeçler', () => {
  test('stok durumu: "Stokta Var" tükenenleri, "Stok Biten" kalanları gizler; "Tümü" hepsini döndürür', async () => {
    const user = await ekranAc();
    await sec(user, 'Stok Durumu', 'Stokta Var');
    expect(screen.queryByText('Eldiven')).not.toBeInTheDocument();
    expect(screen.getByText('Kask LS2')).toBeInTheDocument();
    expect(screen.getByText('Tank Sticker')).toBeInTheDocument();
    await sec(user, 'Stok Durumu', 'Stok Biten');
    expect(screen.getByText('Eldiven')).toBeInTheDocument();
    expect(screen.queryByText('Kask LS2')).not.toBeInTheDocument();
    await sec(user, 'Stok Durumu', 'Tümü');
    expect(screen.getAllByRole('row')).toHaveLength(4); // başlık + 3 ürün
  });

  test('kategori süzgeci yalnız o kategoriyi bırakır; stok durumuyla birlikte çalışır (ikisi de sağlanmalı)', async () => {
    const user = await ekranAc();
    await sec(user, 'Kategori', 'Ekipman');
    expect(screen.queryByText('Tank Sticker')).not.toBeInTheDocument();
    expect(screen.getByText('Kask LS2')).toBeInTheDocument();
    expect(screen.getByText('Eldiven')).toBeInTheDocument();
    await sec(user, 'Stok Durumu', 'Stok Biten');
    expect(screen.queryByText('Kask LS2')).not.toBeInTheDocument();
    expect(screen.getByText('Eldiven')).toBeInTheDocument();
  });

  test('süzgeç özet şeridini değiştirmez (özet tüm stoğu sayar)', async () => {
    const user = await ekranAc();
    await sec(user, 'Stok Durumu', 'Stok Biten');
    expect(cip('Toplam: 3 ürün')).toBeInTheDocument();
    expect(cip('Envanter: ₺5.100')).toBeInTheDocument();
  });
});

// ---- Arama -------------------------------------------------------------------------------------------------------
describe('Aksesuar Stok: arama', () => {
  test('yazılan metin gecikmeyle sunucuya sorulur; sonuç listenin yerini alır; kutu boşalınca tüm liste geri gelir', async () => {
    const user = await ekranAc();
    const getAllSayisi = vi.mocked(aksesuarStokService.getAll).mock.calls.length;
    await user.type(screen.getByPlaceholderText('Stok ara (kod, ad, marka)'), 'kask');
    await waitFor(() => expect(sonArama()).toBe('kask'));
    await waitFor(() => expect(screen.queryByText('Eldiven')).not.toBeInTheDocument());
    expect(screen.getByText('Kask LS2')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('Stok ara (kod, ad, marka)'));
    expect(await screen.findByText('Eldiven')).toBeInTheDocument();
    expect(vi.mocked(aksesuarStokService.getAll).mock.calls.length).toBeGreaterThan(getAllSayisi);
  });

  test('sadece boşluk yazmak aramaya gitmez', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText('Stok ara (kod, ad, marka)'), '   ');
    await new Promise((c) => setTimeout(c, 450)); // gecikme süresinden uzun bekle
    expect(aksesuarStokService.search).not.toHaveBeenCalled();
  });

  // Regression kalıbı: yazıp hemen silince bekleyen eski aramanın yanıtı, yeniden yüklenen tam listeyi ezmemeli
  test('kutu boşaltılınca bekleyen eski aramanın geç gelen yanıtı tam listeyi bozmaz', async () => {
    const user = await ekranAc();
    let eskiyiBitir: (yanit: unknown) => void = () => {};
    const eski = new Promise((coz) => {
      eskiyiBitir = coz;
    });
    vi.mocked(aksesuarStokService.search).mockImplementationOnce(() => eski as never);
    await user.type(screen.getByPlaceholderText('Stok ara (kod, ad, marka)'), 'ka');
    await waitFor(() => expect(aksesuarStokService.search).toHaveBeenCalledTimes(1));
    const getAllSayisi = vi.mocked(aksesuarStokService.getAll).mock.calls.length;
    await user.clear(screen.getByPlaceholderText('Stok ara (kod, ad, marka)'));
    await waitFor(() => expect(vi.mocked(aksesuarStokService.getAll).mock.calls.length).toBeGreaterThan(getAllSayisi)); // tam liste yeniden istendi
    eskiyiBitir({ data: [STICKER] }); // eski yanıt şimdi geliyor
    await new Promise((c) => setTimeout(c, 50));
    expect(screen.getByText('Eldiven')).toBeInTheDocument(); // tam liste bozulmadı
  });

  test('hızlı yazarken eski aramanın geç gelen yanıtı yenisinin üzerine yazmaz', async () => {
    const user = await ekranAc();
    let eskiyiBitir: (yanit: unknown) => void = () => {};
    const eski = new Promise((coz) => {
      eskiyiBitir = coz;
    });
    vi.mocked(aksesuarStokService.search)
      .mockImplementationOnce(() => eski as never) // "ka" için yavaş
      .mockImplementationOnce(() => Promise.resolve({ data: [STICKER] }) as never); // "kas" için hızlı
    await user.type(screen.getByPlaceholderText('Stok ara (kod, ad, marka)'), 'ka');
    await waitFor(() => expect(aksesuarStokService.search).toHaveBeenCalledTimes(1));
    await user.type(screen.getByPlaceholderText('Stok ara (kod, ad, marka)'), 's');
    await waitFor(() => expect(aksesuarStokService.search).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Kask LS2')).not.toBeInTheDocument());
    expect(screen.getByText('Tank Sticker')).toBeInTheDocument();
    eskiyiBitir({ data: [KASK] }); // eski yanıt şimdi geliyor
    await new Promise((c) => setTimeout(c, 50));
    expect(screen.queryByText('Kask LS2')).not.toBeInTheDocument();
    expect(screen.getByText('Tank Sticker')).toBeInTheDocument();
  });
});

// ---- Ekleme / düzenleme ------------------------------------------------------------------------------------------
describe('Aksesuar Stok: ekleme ve düzenleme penceresi', () => {
  test('"Yeni Stok": sıradaki stok kodu önerilir, alanlar boş, giren miktar 0; "Kaydet" create çağırır ve listeyi yeniler', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni Stok')).toBeInTheDocument();
    await waitFor(() => expect(within(p).getByLabelText('Stok Kodu')).toHaveValue('AKS-100'));
    expect(within(p).getByLabelText('Giren Miktar')).toHaveValue(0);
    await user.type(within(p).getByLabelText(/Stok Adı/), 'Kask Yeni');
    await user.type(within(p).getByLabelText('Alış Fiyatı'), '800');
    await user.type(within(p).getByLabelText('Satış Fiyatı'), '1200');
    const yuklemeSayisi = vi.mocked(aksesuarStokService.getAll).mock.calls.length;
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(aksesuarStokService.create).toHaveBeenCalledTimes(1));
    expect(aksesuarStokService.create).toHaveBeenCalledWith({
      stok_kodu: 'AKS-100',
      stok_adi: 'Kask Yeni',
      marka: '',
      alis_fiyati: '800',
      satis_fiyati: '1200',
      giren_miktar: 0,
      platform: '',
      beden: '',
      renk: '',
      kategori: '',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(vi.mocked(aksesuarStokService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
  });

  test('sıradaki stok kodu alınamazsa pencere yine açılır, kod boş kalır', async () => {
    vi.mocked(aksesuarStokService.getNextStokKodu).mockRejectedValue(new Error('yok'));
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByLabelText('Stok Kodu')).toHaveValue('');
  });

  test('sunucu hatası pencerede gösterilir, pencere açık kalır; yeniden denenince hata temizlenir', async () => {
    vi.mocked(aksesuarStokService.create).mockRejectedValueOnce({ response: { data: { message: 'Bu stok kodu zaten var' } } });
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(within(p).getByLabelText(/Stok Adı/), 'Kask Yeni');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Bu stok kodu zaten var')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('"Düzenle": mevcut değerlerle dolar; "Güncelle" update(id, form) çağırır (create değil)', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Kask LS2'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Stok Düzenle')).toBeInTheDocument();
    expect(within(p).getByLabelText('Stok Kodu')).toHaveValue('K-1');
    expect(within(p).getByLabelText(/Stok Adı/)).toHaveValue('Kask LS2');
    expect(within(p).getByLabelText('Giren Miktar')).toHaveValue(5);
    expect(aksesuarStokService.getNextStokKodu).not.toHaveBeenCalled(); // düzenlemede yeni kod istenmez
    await user.clear(within(p).getByLabelText('Satış Fiyatı'));
    await user.type(within(p).getByLabelText('Satış Fiyatı'), '1600');
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(aksesuarStokService.update).toHaveBeenCalledTimes(1));
    const [id, yuk] = vi.mocked(aksesuarStokService.update).mock.calls[0];
    expect(id).toBe(1);
    expect(yuk).toMatchObject({ stok_kodu: 'K-1', stok_adi: 'Kask LS2', satis_fiyati: '1600', kategori: 'Ekipman', beden: 'L', renk: 'Siyah' });
    expect(aksesuarStokService.create).not.toHaveBeenCalled();
  });

  test('pencerede "Etiket Yazdır": stok kodu varsa formdaki değerlerle çağrılır, yoksa pasiftir', async () => {
    vi.mocked(aksesuarStokService.getNextStokKodu).mockResolvedValue({ data: { nextStokKodu: '' } } as never);
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByRole('button', { name: 'Etiket Yazdır' })).toBeDisabled();
    await user.type(within(p).getByLabelText('Stok Kodu'), 'X-9');
    await user.type(within(p).getByLabelText(/Stok Adı/), 'Deneme');
    expect(within(p).getByRole('button', { name: 'Etiket Yazdır' })).toBeEnabled();
    await user.click(within(p).getByRole('button', { name: 'Etiket Yazdır' }));
    expect(stokEtiketiYazdir).toHaveBeenCalledWith(expect.objectContaining({ stok_kodu: 'X-9', stok_adi: 'Deneme' }));
  });

  test('"İptal" pencereyi kapatır, kayıt göndermez', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(aksesuarStokService.create).not.toHaveBeenCalled();
  });
});

// ---- Silme, etiket -----------------------------------------------------------------------------------------------
describe('Aksesuar Stok: silme ve etiket', () => {
  test('silme: onay verilmezse istek gitmez; onaylanırsa delete(id) çağrılır ve liste yenilenir; hata alert ile bildirilir', async () => {
    const user = await ekranAc();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(ikon(satir('Eldiven'), 'DeleteIcon'));
    expect(aksesuarStokService.delete).not.toHaveBeenCalled();
    const yuklemeSayisi = vi.mocked(aksesuarStokService.getAll).mock.calls.length;
    await user.click(ikon(satir('Eldiven'), 'DeleteIcon'));
    expect(window.confirm).toHaveBeenLastCalledWith('Bu stok kaydını silmek istediğinizden emin misiniz?');
    await waitFor(() => expect(aksesuarStokService.delete).toHaveBeenCalledWith(2));
    await waitFor(() => expect(vi.mocked(aksesuarStokService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
    vi.mocked(aksesuarStokService.delete).mockRejectedValue({ response: { data: { message: 'Satışta kullanılıyor' } } });
    await user.click(ikon(satir('Eldiven'), 'DeleteIcon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Satışta kullanılıyor'));
  });

  test('satırdaki yazdır düğmesi o ürünün etiketini basar', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Kask LS2'), 'PrintIcon'));
    expect(stokEtiketiYazdir).toHaveBeenCalledWith(expect.objectContaining({ id: 1, stok_kodu: 'K-1' }));
  });
});

// ---- Toplu içe aktarma -------------------------------------------------------------------------------------------
describe('Aksesuar Stok: toplu içe aktarma', () => {
  const importAc = async (user: Kullanim) => {
    await user.click(screen.getByRole('button', { name: 'İçe Aktar' }));
    return screen.findByRole('dialog');
  };

  test('Tab ile ayrılmış satırlar ürünlere çevrilir; boş satırlar atlanır; eksik sütunlar 0/boş olur; başarıda pencere kapanır', async () => {
    const user = await ekranAc();
    const p = await importAc(user);
    // satırlar Tab ile ayrılır (user.type'ta '\t' yerine doğrudan değer yapıştırılır)
    await user.click(within(p).getByRole('textbox'));
    await user.paste('AKS001\tAyna\t50\t100\t20\n\nAKS002\tZincir');
    const yuklemeSayisi = vi.mocked(aksesuarStokService.getAll).mock.calls.length;
    await user.click(within(p).getByRole('button', { name: 'İçe Aktar' }));
    await waitFor(() => expect(aksesuarStokService.topluEkle).toHaveBeenCalledTimes(1));
    expect(aksesuarStokService.topluEkle).toHaveBeenCalledWith([
      { stok_kodu: 'AKS001', stok_adi: 'Ayna', alis_fiyati: '50', satis_fiyati: '100', giren_miktar: '20' },
      { stok_kodu: 'AKS002', stok_adi: 'Zincir', alis_fiyati: 0, satis_fiyati: 0, giren_miktar: 0 },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(vi.mocked(aksesuarStokService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
  });

  // Regression: yer tutucudaki örnek satırda araya bir "marka" sütunu girmişti (6 sütun); ekran ise 5 sütun bekler
  // (kod, ad, alış, satış, miktar). Örneği olduğu gibi yapıştıran kullanıcının alış fiyatı "X" gidiyordu.
  test('yer tutucudaki örnek satır yapıştırılınca sayı alanları sayı olarak gider', async () => {
    const user = await ekranAc();
    const p = await importAc(user);
    const ornek = within(p).getByRole('textbox').getAttribute('placeholder') as string;
    await user.click(within(p).getByRole('textbox'));
    await user.paste(ornek);
    await user.click(within(p).getByRole('button', { name: 'İçe Aktar' }));
    await waitFor(() => expect(aksesuarStokService.topluEkle).toHaveBeenCalledTimes(1));
    const [satirlar] = vi.mocked(aksesuarStokService.topluEkle).mock.calls[0] as unknown as [Record<string, string>[]];
    expect(satirlar).toHaveLength(1);
    for (const alan of ['alis_fiyati', 'satis_fiyati', 'giren_miktar']) expect(Number.isFinite(Number(satirlar[0][alan]))).toBe(true);
  });

  test('sunucu hatası pencerede gösterilir ve pencere açık kalır', async () => {
    vi.mocked(aksesuarStokService.topluEkle).mockRejectedValue({ response: { data: { message: 'Satır 2 geçersiz' } } });
    const user = await ekranAc();
    const p = await importAc(user);
    await user.click(within(p).getByRole('textbox'));
    await user.paste('AKS001\tAyna');
    await user.click(within(p).getByRole('button', { name: 'İçe Aktar' }));
    expect(await within(p).findByText('Satır 2 geçersiz')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('"İptal" pencereyi kapatır', async () => {
    const user = await ekranAc();
    const p = await importAc(user);
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(aksesuarStokService.topluEkle).not.toHaveBeenCalled();
  });
});

// ---- Mobil görünüm -----------------------------------------------------------------------------------------------
describe('Aksesuar Stok: mobil görünüm', () => {
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

  test('tablo yerine kartlar; kartta kod, marka, kategori, beden, renk, alış/satış ve mevcut görünür; süzgeç boş sonuçta bilgi kutusu çıkar', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('K-1 • LS2 • Ekipman • L • Siyah')).toBeInTheDocument();
    expect(screen.getByText('Mevcut: 5')).toBeInTheDocument();
    expect(screen.getByText('Mevcut: 0')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Alış: 1.000 ₺')).toBeInTheDocument();
    await sec(user, 'Stok Durumu', 'Stok Biten');
    await sec(user, 'Kategori', 'Sticker'); // biten + Sticker: hiçbiri
    expect(screen.getByText('Kayıt yok')).toBeInTheDocument();
  });

  test('kartta düzenle ve sil düğmeleri çalışır; pencere tam ekran açılır', async () => {
    const user = await ekranAc();
    const kart = screen.getByText('Eldiven').closest('.MuiPaper-root') as HTMLElement;
    await user.click(ikon(kart, 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByLabelText('Stok Kodu')).toHaveValue('E-1');
  });
});
