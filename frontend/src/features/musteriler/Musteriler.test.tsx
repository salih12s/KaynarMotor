/*
 * Müşteriler sayfası için KARAKTERİZASYON testleri: liste ve sayaç, arama (gecikmeli, eski yanıt yeniyi ezmez), ekleme/düzenleme,
 * silme onayı (mesajda müşterinin adı), detay penceresi (motor rolü ad eşleşmesiyle, aksesuar kârı renkli, servis, boş durum),
 * mobil kart görünümü. API sahte (mock).
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Musteriler from './Musteriler';
import { musteriService } from './musteriApi';
import { OnayProvider } from '../../shared/ui';
import { RENK } from '../../app/tokenlar';

vi.mock('./musteriApi', () => ({
  musteriService: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), search: vi.fn() },
}));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const AYSE = { id: 1, ad_soyad: 'Ayşe Yılmaz', telefon: '05551112233', adres: 'Kadıköy' };
const VELI = { id: 2, ad_soyad: 'Veli Demir', telefon: '', adres: '' };
const LISTE = [AYSE, VELI];

// Ayşe'nin geçmişi: bir motoru SATMIŞ (satıcı), bir motoru ALMIŞ (alıcı); 1 aksesuar satışı (zararda), 1 iptal servis
const DETAY_AYSE = {
  ...AYSE,
  motorlar: [
    {
      id: 10,
      plaka: '34ABC123',
      marka: 'Honda',
      model: 'PCX',
      yil: 2020,
      satici_adi: 'AYŞE YILMAZ',
      alici_adi: 'Başka Kişi',
      alis_fiyati: '40000',
      satis_fiyati: '50000',
      durum: 'tamamlandi',
      satis_tarihi: '2026-10-02T12:00:00',
    },
    {
      id: 11,
      plaka: '35XYZ001',
      marka: 'Yamaha',
      model: 'NMAX',
      yil: null,
      satici_adi: 'Başka Satıcı',
      alici_adi: 'ayşe yılmaz',
      alis_fiyati: '30000',
      satis_fiyati: '39000',
      durum: 'stokta',
      tarih: '2026-09-01T12:00:00',
    },
  ],
  aksesuarlar: [{ id: 5, toplam_satis: '2000', kar: '-100', durum: 'beklemede', satis_tarihi: '2026-10-03T12:00:00' }],
  isEmirleri: [{ id: 7, fis_no: 101, marka: 'Suzuki', model_tip: 'Burgman', gercek_toplam_ucret: '1500', durum: 'iptal', created_at: '2026-10-01T12:00:00' }],
};
const DETAY_BOS = { ...VELI, motorlar: [], aksesuarlar: [], isEmirleri: [] };

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
type Kullanim = ReturnType<typeof userEvent.setup>;
const ekranAc = async () => {
  const user = userEvent.setup();
  render(
    <OnayProvider>
      <Musteriler />
    </OnayProvider>,
  );
  await screen.findByText('Ayşe Yılmaz');
  return user;
};
const satir = (ad: string) => screen.getByRole('row', { name: new RegExp(ad) });
const ikon = (kapsam: HTMLElement, ad: string) => within(kapsam).getByTestId(ad);
const ARAMA = 'Müşteri ara (ad, telefon)';
const yeniAc = async (user: Kullanim) => {
  await user.click(screen.getByRole('button', { name: 'Yeni Müşteri' }));
  return screen.findByRole('dialog');
};
const sonArama = () => vi.mocked(musteriService.search).mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.mocked(musteriService.getAll).mockResolvedValue({ data: LISTE } as never);
  vi.mocked(musteriService.search).mockResolvedValue({ data: [AYSE] } as never);
  vi.mocked(musteriService.getById).mockImplementation((async (id: number) => ({ data: id === 1 ? DETAY_AYSE : DETAY_BOS })) as never);
  vi.mocked(musteriService.create).mockResolvedValue({ data: {} } as never);
  vi.mocked(musteriService.update).mockResolvedValue({ data: {} } as never);
  vi.mocked(musteriService.delete).mockResolvedValue({ data: {} } as never);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

// ---- Liste -------------------------------------------------------------------------------------------------------
describe('Müşteriler: liste', () => {
  test('tablo sütunları, satır değerleri ("-" boş alanlar için) ve toplam sayaç', async () => {
    await ekranAc();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Ad Soyad', 'Telefon', 'Adres', 'İşlemler']);
    expect(
      within(satir('Ayşe Yılmaz'))
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Ayşe Yılmaz', '05551112233', 'Kadıköy', '']);
    expect(
      within(satir('Veli Demir'))
        .getAllByRole('cell')
        .slice(0, 3)
        .map((c) => c.textContent),
    ).toEqual(['Veli Demir', '-', '-']);
    expect(screen.getByText('Toplam: 2 müşteri')).toBeInTheDocument();
  });

  test('liste boşsa "Kayıt bulunamadı" satırı çıkar', async () => {
    vi.mocked(musteriService.getAll).mockResolvedValue({ data: [] } as never);
    render(<Musteriler />);
    expect(await screen.findByText('Kayıt bulunamadı')).toBeInTheDocument();
    expect(screen.getByText('Toplam: 0 müşteri')).toBeInTheDocument();
  });
});

// ---- Arama -------------------------------------------------------------------------------------------------------
describe('Müşteriler: arama', () => {
  test('yazılan metin gecikmeyle sunucuya sorulur; sonuç listenin yerini ve sayacı değiştirir; kutu boşalınca tüm liste döner', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), 'ayşe');
    await waitFor(() => expect(sonArama()).toBe('ayşe'));
    await waitFor(() => expect(screen.queryByText('Veli Demir')).not.toBeInTheDocument());
    expect(screen.getByText('Toplam: 1 müşteri')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(ARAMA));
    expect(await screen.findByText('Veli Demir')).toBeInTheDocument();
    expect(screen.getByText('Toplam: 2 müşteri')).toBeInTheDocument();
  });

  test('sadece boşluk yazmak aramaya gitmez', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), '   ');
    await new Promise((c) => setTimeout(c, 450)); // gecikme süresinden uzun bekle
    expect(musteriService.search).not.toHaveBeenCalled();
  });

  test('hızlı yazarken eski aramanın geç gelen yanıtı yenisinin üzerine yazmaz', async () => {
    const user = await ekranAc();
    let eskiyiBitir: (yanit: unknown) => void = () => {};
    const eski = new Promise((coz) => {
      eskiyiBitir = coz;
    });
    vi.mocked(musteriService.search)
      .mockImplementationOnce(() => eski as never) // "ay" için yavaş
      .mockImplementationOnce(() => Promise.resolve({ data: [VELI] }) as never); // "aya" için hızlı
    await user.type(screen.getByPlaceholderText(ARAMA), 'ay');
    await waitFor(() => expect(musteriService.search).toHaveBeenCalledTimes(1));
    await user.type(screen.getByPlaceholderText(ARAMA), 'a');
    await waitFor(() => expect(musteriService.search).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Ayşe Yılmaz')).not.toBeInTheDocument());
    eskiyiBitir({ data: [AYSE] }); // eski yanıt şimdi geliyor
    await new Promise((c) => setTimeout(c, 50));
    expect(screen.queryByText('Ayşe Yılmaz')).not.toBeInTheDocument();
    expect(screen.getByText('Veli Demir')).toBeInTheDocument();
  });

  test('kutu boşaltılınca bekleyen eski aramanın geç gelen yanıtı tam listeyi bozmaz', async () => {
    const user = await ekranAc();
    let eskiyiBitir: (yanit: unknown) => void = () => {};
    const eski = new Promise((coz) => {
      eskiyiBitir = coz;
    });
    vi.mocked(musteriService.search).mockImplementationOnce(() => eski as never);
    await user.type(screen.getByPlaceholderText(ARAMA), 'ay');
    await waitFor(() => expect(musteriService.search).toHaveBeenCalledTimes(1));
    const getAllSayisi = vi.mocked(musteriService.getAll).mock.calls.length;
    await user.clear(screen.getByPlaceholderText(ARAMA));
    await waitFor(() => expect(vi.mocked(musteriService.getAll).mock.calls.length).toBeGreaterThan(getAllSayisi)); // tam liste yeniden istendi
    eskiyiBitir({ data: [AYSE] }); // eski yanıt şimdi geliyor
    await new Promise((c) => setTimeout(c, 50));
    expect(screen.getByText('Veli Demir')).toBeInTheDocument(); // tam liste bozulmadı
  });
});

// ---- Ekleme / düzenleme / silme ----------------------------------------------------------------------------------
describe('Müşteriler: ekleme, düzenleme, silme', () => {
  test('"Yeni Müşteri": boş form; "Kaydet" create çağırır, pencere kapanır, liste yenilenir', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni Müşteri')).toBeInTheDocument();
    expect(within(p).getByLabelText(/Ad Soyad/)).toHaveValue('');
    await user.type(within(p).getByLabelText(/Ad Soyad/), 'Zeynep Kaya');
    await user.type(within(p).getByLabelText('Telefon'), '05320000000');
    await user.type(within(p).getByLabelText('Adres'), 'Üsküdar');
    const yuklemeSayisi = vi.mocked(musteriService.getAll).mock.calls.length;
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(musteriService.create).toHaveBeenCalledWith({ ad_soyad: 'Zeynep Kaya', telefon: '05320000000', adres: 'Üsküdar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(vi.mocked(musteriService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
  });

  test('sunucu hatası pencerede gösterilir ve pencere açık kalır; yeni denemede hata temizlenir', async () => {
    vi.mocked(musteriService.create).mockRejectedValueOnce({ response: { data: { message: 'Ad soyad zorunlu' } } });
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Ad soyad zorunlu')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const p2 = await yeniAc(user); // yeniden açılınca eski hata gösterilmez
    expect(within(p2).queryByText('Ad soyad zorunlu')).not.toBeInTheDocument();
  });

  test('"Düzenle": mevcut değerlerle dolar (boş alan boş metin); "Güncelle" update(id, form) çağırır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Veli Demir'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Müşteri Düzenle')).toBeInTheDocument();
    expect(within(p).getByLabelText(/Ad Soyad/)).toHaveValue('Veli Demir');
    expect(within(p).getByLabelText('Telefon')).toHaveValue('');
    await user.type(within(p).getByLabelText('Telefon'), '05330000000');
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(musteriService.update).toHaveBeenCalledWith(2, { ad_soyad: 'Veli Demir', telefon: '05330000000', adres: '' }));
    expect(musteriService.create).not.toHaveBeenCalled();
  });

  test('silme: onay penceresi müşterinin adını ve geçmiş kayıtların silinmeyeceğini söyler; vazgeçilirse istek gitmez; hata bildirim olur', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Veli Demir'), 'DeleteIcon'));
    const onay = await screen.findByRole('dialog');
    expect(within(onay).getByText('Müşteriyi sil')).toBeInTheDocument();
    expect(onay).toHaveTextContent('Veli Demir kaydı silinecek. Bu işlem geri alınamaz. Müşterinin geçmiş satış ve servis kayıtları silinmez.');
    await user.click(within(onay).getByRole('button', { name: 'Vazgeç' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(musteriService.delete).not.toHaveBeenCalled();
    const yuklemeSayisi = vi.mocked(musteriService.getAll).mock.calls.length;
    await user.click(ikon(satir('Veli Demir'), 'DeleteIcon'));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(musteriService.delete).toHaveBeenCalledWith(2));
    await waitFor(() => expect(vi.mocked(musteriService.getAll).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); // onay penceresi kapanınca satırlar erişilebilir olur
    vi.mocked(musteriService.delete).mockRejectedValue({ response: { data: { message: 'Silinemedi' } } });
    await user.click(ikon(satir('Veli Demir'), 'DeleteIcon'));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Silinemedi'));
  });
});

// ---- Detay penceresi ---------------------------------------------------------------------------------------------
describe('Müşteriler: detay penceresi', () => {
  test('sayaçlar ve üç tablo; motorda rol müşteri adıyla (büyük/küçük harf fark etmez) satıcı/alıcı diye belirlenir ve ilgili fiyat gösterilir', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Ayşe Yılmaz'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(musteriService.getById).toHaveBeenCalledWith(1);
    expect(within(p).getByText('Motor: 2')).toBeInTheDocument();
    expect(within(p).getByText('Aksesuar: 1')).toBeInTheDocument();
    expect(within(p).getByText('Servis: 1')).toBeInTheDocument();
    expect(within(p).getByText('Motor İşlemleri')).toBeInTheDocument();
    // satıcı olduğu motor: alış fiyatı; alıcı olduğu motor: satış fiyatı
    const honda = within(p).getByRole('row', { name: /Honda/ });
    expect(
      within(honda)
        .getAllByRole('cell')
        .slice(2, 5)
        .map((c) => c.textContent),
    ).toEqual(['Satıcı', '₺40.000', 'Tamamlandı']);
    const yamaha = within(p).getByRole('row', { name: /Yamaha/ });
    expect(
      within(yamaha)
        .getAllByRole('cell')
        .slice(2, 5)
        .map((c) => c.textContent),
    ).toEqual(['Alıcı', '₺39.000', 'Stokta']);
  });

  test('tarih: motor için satış tarihi, yoksa alım tarihi; aksesuar ve servis tutarları ile durum damgaları', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Ayşe Yılmaz'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    const hucreler = (satirMetni: RegExp) =>
      within(within(p).getByRole('row', { name: satirMetni }))
        .getAllByRole('cell')
        .map((c) => c.textContent);
    expect(hucreler(/Honda/)[5]).toBe('02.10.2026'); // satış tarihi var
    expect(hucreler(/Yamaha/)[5]).toBe('01.09.2026'); // satış tarihi yok: alım tarihi
    expect(hucreler(/₺2\.000/)).toEqual(['₺2.000', '₺-100', 'Beklemede', '03.10.2026']);
    expect(hucreler(/#101/)).toEqual(['#101', 'Suzuki Burgman', '₺1.500', 'İptal', '01.10.2026']);
  });

  test('aksesuar kârı pozitifse yeşil, zarardaysa kırmızı yazılır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Ayşe Yılmaz'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    const zarar = within(p).getByText('₺-100');
    expect(getComputedStyle(zarar).color).toBe(hexRgb(RENK.kirmizi));
  });

  test('kaydı olmayan müşteride bilgi kutusu çıkar, tablo yoktur', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Veli Demir'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Bu müşteriye ait işlem kaydı bulunamadı.')).toBeInTheDocument();
    expect(within(p).queryByRole('table')).not.toBeInTheDocument();
    expect(within(p).getByText('Motor: 0')).toBeInTheDocument();
  });

  test('"Düzenle" detayı kapatıp düzenleme penceresini açar; "Kapat" kapatır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Veli Demir'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('button', { name: 'Düzenle' }));
    const duzenle = await screen.findByText('Müşteri Düzenle');
    expect(duzenle).toBeInTheDocument();
    expect(screen.getByLabelText(/Ad Soyad/)).toHaveValue('Veli Demir');
  });

  test('detay isteği hata verirse pencere açılmaz, sessiz kalınır', async () => {
    vi.mocked(musteriService.getById).mockRejectedValue(new Error('yok'));
    const user = await ekranAc();
    await user.click(ikon(satir('Ayşe Yılmaz'), 'VisibilityIcon'));
    await new Promise((c) => setTimeout(c, 100));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// "#RRGGBB" -> "rgb(r, g, b)" (tarayıcının hesaplanmış renk biçimi)
const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// ---- Mobil görünüm -----------------------------------------------------------------------------------------------
describe('Müşteriler: mobil görünüm', () => {
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

  test('tablo yerine kartlar; adres yoksa satır çıkmaz, telefon yoksa "-"; arama boş sonuçta bilgi kutusu', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Kadıköy')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Veli'nin telefonu
    vi.mocked(musteriService.search).mockResolvedValue({ data: [] } as never);
    await user.type(screen.getByPlaceholderText(ARAMA), 'zzz');
    expect(await screen.findByText('Kayıt bulunamadı')).toBeInTheDocument();
  });

  test('kartta göz düğmesi detayı açar (tıklama kartın kendisine yayılmaz)', async () => {
    const user = await ekranAc();
    const kart = screen.getByText('Ayşe Yılmaz').closest('.MuiPaper-root') as HTMLElement;
    await user.click(ikon(kart, 'VisibilityIcon'));
    expect(await screen.findByText('Motor İşlemleri')).toBeInTheDocument();
  });
});
