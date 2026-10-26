/*
 * Veresiye (açık borçlar) sayfası için KARAKTERİZASYON testleri: özet kartları, liste, kaynak süzgeci, arama (Türkçe harf duyarlı),
 * dört kaynağın detay penceresi (ödenen = toplam - kalan), kaynak sayfasına gitme, boş/yükleniyor durumları, mobil kartlar.
 * Para gösterilen bir ekran olduğu için tutarlar elle hesaplanmış sabitlerle sınanır. API ve yönlendirme sahte (mock).
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Veresiye from './Veresiye';
import { veresiyeService } from './raporApi';

vi.mock('./raporApi', () => ({ veresiyeService: { getAll: vi.fn() } }));
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

// ---- Sabit test verisi (sayılar elle hesaplandı) -----------------------------------------------------------------
const MOTOR = {
  kaynak: 'Motor Satış',
  kaynak_key: 'motor',
  id: 1,
  musteri_adi: 'Ayşe Yılmaz',
  telefon: '05551112233',
  kalan_odeme: 20000,
  toplam_tutar: 50000,
  tarih: '2026-10-02T12:00:00',
  aciklama: 'Honda PCX 34ABC123',
  detay: {
    plaka: '34ABC123',
    marka: 'Honda',
    model: 'PCX',
    yil: 2020,
    km: 12000,
    odeme_sekli: 'nakit',
    alici_tc: '11122233344',
    alici_adres: 'Kadıköy',
    notlar: 'Peşinat alındı',
  },
};
const SERVIS = {
  kaynak: 'Servis',
  kaynak_key: 'servis',
  id: 2,
  musteri_adi: 'Veli Demir',
  telefon: '',
  kalan_odeme: 500,
  toplam_tutar: 1500,
  tarih: '2026-10-05T12:00:00',
  aciklama: '',
  detay: {
    fis_no: 101,
    marka: 'Yamaha',
    model_tip: 'NMAX',
    km: 5000,
    durum: 'tamamlandi',
    ariza_sikayetler: 'Fren sesi',
    parcalar: [
      { takilan_parca: 'Fren balatası', adet: 2, birim_fiyat: 300, toplam_fiyat: 600 },
      { takilan_parca: 'Yağ', adet: 3, birim_fiyat: 100 }, // toplam_fiyat yok: adet x birim = 300
    ],
  },
};
const AKSESUAR = {
  kaynak: 'Aksesuar',
  kaynak_key: 'aksesuar',
  id: 3,
  musteri_adi: 'Zeynep Kaya',
  telefon: '05320000000',
  kalan_odeme: 250,
  toplam_tutar: 1000,
  tarih: '2026-10-06T12:00:00',
  aciklama: 'Kask',
  detay: { odeme_sekli: 'kart', durum: 'beklemede', parcalar: [{ urun_adi: 'Kask LS2', adet: 1, satis_fiyati: 1000 }] },
};
const YEDEK = {
  kaynak: 'Yedek Parça',
  kaynak_key: 'yedek_parca',
  id: 4,
  musteri_adi: 'AYŞE DEMİR',
  telefon: '05330000000',
  kalan_odeme: 100,
  toplam_tutar: 900,
  tarih: '2026-10-07T12:00:00',
  aciklama: 'Zincir seti',
  detay: { urun_adi: 'Zincir seti', alis_fiyati: 600, satis_fiyati: 900 },
};
const YANIT = {
  borclar: [MOTOR, SERVIS, AKSESUAR, YEDEK],
  ozet: { motor: 20000, servis: 500, aksesuar: 250, yedek_parca: 100, toplam: 20850, kayit_sayisi: 4 },
};

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
const ekranAc = async (yanit: unknown = YANIT) => {
  vi.mocked(veresiyeService.getAll).mockResolvedValue({ data: yanit } as never);
  const user = userEvent.setup();
  render(<Veresiye />);
  await waitFor(() => expect(screen.queryByText('Yükleniyor...')).not.toBeInTheDocument());
  return user;
};
const satir = (ad: string) => screen.getByRole('row', { name: new RegExp(ad) });
const ARAMA = 'Müşteri, telefon veya açıklama ara...';
const kaynakSec = async (user: ReturnType<typeof userEvent.setup>, secenek: string) => {
  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: secenek }));
};
const kart = (etiket: string) => screen.getByText(etiket, { selector: 'p' }).closest('.MuiPaper-root') as HTMLElement;

// ---- Özet ve liste -----------------------------------------------------------------------------------------------
describe('Veresiye: özet ve liste', () => {
  test('beş özet kartı: toplam borç ve dört kaynağın kalan borcu', async () => {
    await ekranAc();
    expect(within(kart('Toplam Borç')).getByText('₺20.850')).toBeInTheDocument();
    expect(within(kart('Motor Satış')).getByText('₺20.000')).toBeInTheDocument();
    expect(within(kart('Servis')).getByText('₺500')).toBeInTheDocument();
    expect(within(kart('Aksesuar')).getByText('₺250')).toBeInTheDocument();
    expect(within(kart('Yedek Parça')).getByText('₺100')).toBeInTheDocument();
  });

  test('tablo sütunları ve satır değerleri; boş telefon/açıklama "-", sayaç kayıt sayısını gösterir', async () => {
    await ekranAc();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Kaynak',
      'Müşteri',
      'Telefon',
      'Açıklama',
      'Tarih',
      'Toplam',
      'Kalan Borç',
      'İşlemler',
    ]);
    const hucre = (ad: string) =>
      within(satir(ad))
        .getAllByRole('cell')
        .map((c) => c.textContent);
    expect(hucre('Ayşe Yılmaz').slice(0, 7)).toEqual(['Motor Satış', 'Ayşe Yılmaz', '05551112233', 'Honda PCX 34ABC123', '02.10.2026', '₺50.000', '₺20.000']);
    expect(hucre('Veli Demir').slice(0, 7)).toEqual(['Servis', 'Veli Demir', '-', '-', '05.10.2026', '₺1.500', '₺500']);
    expect(screen.getByText('4 kayıt')).toBeInTheDocument();
  });

  test('yüklenirken "Yükleniyor..." çıkar; borç yoksa "Açık borç bulunmuyor"', async () => {
    vi.mocked(veresiyeService.getAll).mockReturnValue(new Promise(() => {}) as never);
    const { unmount } = render(<Veresiye />);
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
    unmount();
    await ekranAc({ borclar: [], ozet: { motor: 0, servis: 0, aksesuar: 0, yedek_parca: 0, toplam: 0, kayit_sayisi: 0 } });
    expect(screen.getByText('Açık borç bulunmuyor')).toBeInTheDocument();
    expect(screen.getByText('0 kayıt')).toBeInTheDocument();
  });

  test('istek hata verirse sessizce boş duruma düşer (çökmez)', async () => {
    vi.mocked(veresiyeService.getAll).mockRejectedValue(new Error('ağ'));
    render(<Veresiye />);
    expect(await screen.findByText('Açık borç bulunmuyor')).toBeInTheDocument();
  });
});

// ---- Süzgeç ve arama ---------------------------------------------------------------------------------------------
describe('Veresiye: süzgeç ve arama', () => {
  test('kaynak süzgeci yalnız o kaynağın borçlarını bırakır ve sayacı günceller; özet kartları değişmez', async () => {
    const user = await ekranAc();
    await kaynakSec(user, 'Servis');
    expect(screen.queryByText('Ayşe Yılmaz')).not.toBeInTheDocument();
    expect(screen.getByText('Veli Demir')).toBeInTheDocument();
    expect(screen.getByText('1 kayıt')).toBeInTheDocument();
    expect(within(kart('Toplam Borç')).getByText('₺20.850')).toBeInTheDocument();
    await kaynakSec(user, 'Tümü');
    expect(screen.getByText('4 kayıt')).toBeInTheDocument();
  });

  test('arama müşteri adı, telefon ve açıklamada çalışır', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), '0532');
    expect(screen.getByText('Zeynep Kaya')).toBeInTheDocument();
    expect(screen.getByText('1 kayıt')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(ARAMA));
    await user.type(screen.getByPlaceholderText(ARAMA), 'zincir');
    expect(screen.getByText('AYŞE DEMİR')).toBeInTheDocument();
    expect(screen.getByText('1 kayıt')).toBeInTheDocument();
  });

  // Regression: eskiden düz toLowerCase kullanılıyordu ("YILMAZ" araması "Yılmaz"ı, "ayşe" araması "AYŞE"yi bulamıyordu)
  test('Türkçe harf: "ayşe" hem "Ayşe Yılmaz"ı hem büyük harfli "AYŞE DEMİR"i bulur', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), 'ayşe');
    expect(screen.getByText('Ayşe Yılmaz')).toBeInTheDocument();
    expect(screen.getByText('AYŞE DEMİR')).toBeInTheDocument();
    expect(screen.getByText('2 kayıt')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(ARAMA));
    await user.type(screen.getByPlaceholderText(ARAMA), 'YILMAZ');
    expect(screen.getByText('Ayşe Yılmaz')).toBeInTheDocument();
  });

  test('kaynak süzgeci ve arama birlikte uygulanır; eşleşme yoksa "Açık borç bulunmuyor" çıkar', async () => {
    const user = await ekranAc();
    await kaynakSec(user, 'Motor Satış');
    await user.type(screen.getByPlaceholderText(ARAMA), 'zeynep');
    expect(screen.getByText('Açık borç bulunmuyor')).toBeInTheDocument();
  });
});

// ---- Kaynak sayfasına gitme --------------------------------------------------------------------------------------
describe('Veresiye: kaynak sayfasına gitme', () => {
  beforeEach(() => mockNavigate.mockReset());

  test.each([
    ['Ayşe Yılmaz', 'Motor Satış', '/ikinci-el-motor'],
    ['Veli Demir', 'Servis', '/'],
    ['Zeynep Kaya', 'Aksesuar', '/aksesuarlar'],
    ['AYŞE DEMİR', 'Yedek Parça', '/yedek-parcalar'],
  ])('%s satırındaki "%s sayfasına git" düğmesi %s adresine götürür', async (ad, etiket, yol) => {
    const user = await ekranAc();
    await user.click(within(satir(ad)).getByRole('button', { name: `${etiket} sayfasına git` }));
    expect(mockNavigate).toHaveBeenCalledWith(yol);
  });
});

// ---- Detay penceresi ---------------------------------------------------------------------------------------------
describe('Veresiye: detay penceresi', () => {
  const detayAc = async (user: ReturnType<typeof userEvent.setup>, ad: string) => {
    await user.click(within(satir(ad)).getByRole('button', { name: 'Detaylar' }));
    return screen.findByRole('dialog');
  };

  test('motor: ödeme durumu (ödenen = toplam - kalan) ve motor bilgileri', async () => {
    const user = await ekranAc();
    const p = await detayAc(user, 'Ayşe Yılmaz');
    expect(within(p).getByText('Motor Satış Detayı')).toBeInTheDocument();
    const odeme = within(p).getByText('Ödeme Durumu').closest('.MuiPaper-root') as HTMLElement;
    expect(within(odeme).getByText('₺50.000')).toBeInTheDocument(); // toplam
    expect(within(odeme).getByText('₺30.000')).toBeInTheDocument(); // ödenen 50.000 - 20.000
    expect(within(odeme).getByText('₺20.000')).toBeInTheDocument(); // kalan borç
    expect(within(p).getByText('Motor Bilgileri')).toBeInTheDocument();
    for (const metin of ['34ABC123', 'Honda PCX', '2020', '12000', 'nakit', '11122233344', 'Kadıköy', 'Peşinat alındı'])
      expect(within(p).getByText(metin)).toBeInTheDocument();
  });

  test('servis: fiş no, araç, arıza ve takılan parçalar; satır toplamı yoksa adet x birim hesaplanır', async () => {
    const user = await ekranAc();
    const p = await detayAc(user, 'Veli Demir');
    expect(within(p).getByText('Servis Detayı')).toBeInTheDocument();
    expect(within(p).getByText('#101')).toBeInTheDocument();
    expect(within(p).getByText('Yamaha NMAX')).toBeInTheDocument();
    expect(within(p).getByText('Fren sesi')).toBeInTheDocument();
    const balata = within(p).getByRole('row', { name: /Fren balatası/ });
    expect(
      within(balata)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Fren balatası', '2', '₺300', '₺600']);
    const yag = within(p).getByRole('row', { name: /Yağ/ });
    expect(
      within(yag)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Yağ', '3', '₺100', '₺300']);
  });

  test('aksesuar: ödeme şekli, durum ve ürün tablosu', async () => {
    const user = await ekranAc();
    const p = await detayAc(user, 'Zeynep Kaya');
    expect(within(p).getByText('Aksesuar Detayı')).toBeInTheDocument();
    expect(within(p).getByText('kart')).toBeInTheDocument();
    expect(
      within(within(p).getByRole('row', { name: /Kask LS2/ }))
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Kask LS2', '1', '₺1.000']);
  });

  test('yedek parça: ürün, alış ve satış fiyatı; ödenen 900 - 100 = 800', async () => {
    const user = await ekranAc();
    const p = await detayAc(user, 'AYŞE DEMİR');
    expect(within(p).getByText('Yedek Parça Detayı')).toBeInTheDocument();
    expect(within(p).getByText('₺800')).toBeInTheDocument();
    expect(within(p).getByText('₺600')).toBeInTheDocument(); // alış
    expect(within(p).getAllByText('₺900').length).toBeGreaterThanOrEqual(2); // toplam tutar ve satış fiyatı
    expect(within(p).getByText('Zincir seti')).toBeInTheDocument();
  });

  test('"... Sayfasına Git" pencereyi kapatıp kaynak sayfasına yönlendirir; "Kapat" yalnız kapatır', async () => {
    mockNavigate.mockReset();
    const user = await ekranAc();
    let p = await detayAc(user, 'Zeynep Kaya');
    await user.click(within(p).getByRole('button', { name: 'Kapat' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
    p = await detayAc(user, 'Zeynep Kaya');
    await user.click(within(p).getByRole('button', { name: 'Aksesuar Sayfasına Git' }));
    expect(mockNavigate).toHaveBeenCalledWith('/aksesuarlar');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

// ---- Mobil görünüm -----------------------------------------------------------------------------------------------
describe('Veresiye: mobil görünüm', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
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

  test('tablo yerine kartlar; kartta toplam ve kalan borç, telefon yoksa satır çıkmaz; detay ve git düğmeleri çalışır', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const veli = screen.getByText('Veli Demir').closest('.MuiPaper-root') as HTMLElement;
    expect(within(veli).getByText('Toplam: ₺1.500')).toBeInTheDocument();
    expect(within(veli).getByText('₺500')).toBeInTheDocument();
    expect(within(veli).queryByText('-')).not.toBeInTheDocument();
    await user.click(within(veli).getByRole('button', { name: 'Servis sayfasına git' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
    await user.click(within(veli).getByRole('button', { name: 'Detaylar' }));
    expect(await screen.findByText('Servis Detayı')).toBeInTheDocument();
  });
});
