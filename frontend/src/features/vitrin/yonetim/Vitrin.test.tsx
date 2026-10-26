/*
 * Vitrin yönetimi için KARAKTERİZASYON testleri: ekranın bugün ne yaptığını kayda geçirir (bölmeden önce de sonra da yeşil).
 * API, oturum ve belge bölümü sahte (mock). Sürükle-bırak fireEvent ile, görsel/video okuma gerçek FileReader ile sınanır;
 * tarayıcıda resim küçültme (canvas) jsdom'da yok, bu yüzden "Görsel Ekle" yolu bu testlerde YOK.
 */
import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Vitrin from './Vitrin';
import { vitrinService } from '../vitrinApi';
import { ikinciElMotorService, sifirMotorService } from '../../motor/motorApi';
import { aksesuarStokService } from '../../aksesuar/aksesuarApi';
import { useAuth } from '../../auth/AuthContext';

vi.mock('../vitrinApi', () => ({
  vitrinService: {
    getAllAdmin: vi.fn(),
    getIletisim: vi.fn(),
    getSegmentler: vi.fn(),
    getYuklemeSiniri: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
    setPublished: vi.fn(),
    moveToPosition: vi.fn(),
    updateIletisim: vi.fn(),
    gorselUrl: vi.fn(),
    iletisimGorselUrl: vi.fn(),
  },
}));
vi.mock('../../motor/motorApi', () => ({
  ikinciElMotorService: { getAll: vi.fn() },
  sifirMotorService: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), gorselUrl: (id: number) => `/sifir-gorsel/${id}` },
}));
vi.mock('../../aksesuar/aksesuarApi', () => ({ aksesuarStokService: { getAll: vi.fn() } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../motor/SatisBelgeleri', () => ({ BelgeBolumu: ({ motorId }: { motorId: number }) => <div>BELGE-BOLUMU-{motorId}</div> }));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const U1 = {
  id: 1,
  baslik: 'NMAX Fırsat',
  marka: 'Yamaha',
  model: 'NMAX',
  yil: 2021,
  segment: 'Scooter',
  motor_cc: 155,
  km: 12000,
  fiyat: 150000,
  yayinda: true,
  ilan_no: 7,
  motor_durumu: 'ikinci_el',
  one_cikan: true,
  stok_motor_id: 5,
  kapak_gorsel_id: 11,
  siralama: 0,
};
const U2 = {
  id: 2,
  baslik: 'PCX Sıfır',
  marka: 'Honda',
  model: 'PCX',
  yil: 2023,
  segment: 'Scooter',
  fiyat: 210000,
  yayinda: true,
  motor_durumu: 'sifir',
  siralama: 1,
};
const U3 = { id: 3, baslik: 'Küçük Chopper', segment: 'Chopper', fiyat: 99000, yayinda: false, motor_durumu: 'ikinci_el', siralama: 2 };
const MOTORLAR = [U1, U2, U3];
const ILETISIM = [
  { kategori: 'motor', personel_adi: 'Satış Ahmet', telefon: '0532', personel_adi_2: 'Ayşe', telefon_2: '0533', aciklama: 'Not 1', baslik: '' },
  { kategori: 'bakim_servis', personel_adi: 'Usta Ali', telefon: '0555', baslik: 'Bakım Atölyesi', aciklama: 'Randevu alın', gorsel_var: false },
];
const STOK_MOTORLAR = [
  {
    id: 5,
    plaka: '34ABC123',
    marka: 'Yamaha',
    model: 'NMAX',
    yil: 2021,
    km: 12000,
    liste_fiyati: 150000,
    durum: 'stokta',
    vitrin_baslik: 'NMAX Temiz',
    vitrin_segment: 'Scooter',
    vitrin_cc: 155,
  },
  { id: 6, plaka: '06SATILDI', marka: 'Honda', model: 'X', durum: 'tamamlandi' },
];
const STOK_AKSESUAR = [{ id: 1, stok_adi: 'Kask', marka: 'LS2', kategori: 'Kask', beden: 'L', renk: 'Siyah', satis_fiyati: 2500 }];
const DETAY_U1 = { ...U1, aciklama: 'Temiz', video_url: '', hasar_kaydi: 'Yok', rubik_link: '', gorsel_idler: [11, 12, 13], video_dosya_id: 99 };

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
type Kullanim = ReturnType<typeof userEvent.setup>;
interface KurSecenegi {
  rol?: string;
  user?: object;
  liste?: Record<string, object[]>;
  bekleme?: boolean;
}
const kur = ({ rol = 'admin', user = {}, liste = {} }: KurSecenegi = {}) => {
  vi.mocked(useAuth).mockReturnValue({ user: { rol, ...user } } as never);
  vi.mocked(vitrinService.getAllAdmin).mockImplementation(async (p) => {
    const kategori = (p as { kategori: string }).kategori;
    const kayitlar: object[] = liste[kategori] ?? (kategori === 'motor' ? MOTORLAR : []);
    return { data: kayitlar.map((x) => ({ ...x })) } as never;
  });
  vi.mocked(vitrinService.getIletisim).mockResolvedValue({ data: ILETISIM } as never);
  vi.mocked(vitrinService.getSegmentler).mockResolvedValue({ data: [{ ad: 'Chopper' }, { ad: 'Scooter' }, { ad: 'Naked' }] } as never);
  vi.mocked(vitrinService.getYuklemeSiniri).mockResolvedValue({ data: { video_mb: 1 } } as never);
  vi.mocked(vitrinService.getById).mockResolvedValue({ data: DETAY_U1 } as never);
  vi.mocked(vitrinService.create).mockResolvedValue({ data: {} } as never);
  vi.mocked(vitrinService.update).mockResolvedValue({ data: {} } as never);
  vi.mocked(vitrinService.delete).mockResolvedValue({ data: {} } as never);
  vi.mocked(vitrinService.reorder).mockResolvedValue({ data: {} } as never);
  vi.mocked(vitrinService.setPublished).mockImplementation(async (id, yayinda) => ({ data: { yayinda } }) as never);
  vi.mocked(vitrinService.moveToPosition).mockResolvedValue({ data: { urun_ids: [2, 1], sira: 2 } } as never);
  vi.mocked(vitrinService.updateIletisim).mockResolvedValue({ data: {} } as never);
  vi.mocked(vitrinService.gorselUrl).mockImplementation((id) => `/g/${id}`);
  vi.mocked(vitrinService.iletisimGorselUrl).mockImplementation((k) => `/ig/${k}`);
  vi.mocked(ikinciElMotorService.getAll).mockResolvedValue({ data: STOK_MOTORLAR } as never);
  vi.mocked(aksesuarStokService.getAll).mockResolvedValue({ data: STOK_AKSESUAR } as never);
  global.fetch = vi.fn(async () => ({ blob: async () => new Blob(['x'], { type: 'image/jpeg' }) })) as never;
};

const ekranAc = async (secenek: KurSecenegi = {}) => {
  kur(secenek);
  const user = userEvent.setup();
  render(<Vitrin />);
  if (!secenek.bekleme) await screen.findByText('NMAX Fırsat');
  return user;
};

const kart = (baslik: string) => screen.getByText(baslik).closest('.MuiCard-root') as HTMLElement;
const sekme = (user: Kullanim, ad: string) => user.click(screen.getByRole('tab', { name: ad }));
const alan = (etiket: string) => screen.getByLabelText(etiket);
const bekleDialogKapanana = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
const yaziVar = (metin: string) => expect(screen.getByText(metin)).toBeInTheDocument();

beforeEach(() => {
  vi.mocked(sifirMotorService.getAll).mockResolvedValue({ data: [] } as never);
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Sekmeler ve roller ------------------------------------------------------------------------------------------
describe('Vitrin: sekmeler ve roller', () => {
  test('admin 6 kategori sekmesi görür; ilk açılışta motor ilanlarını ister', async () => {
    await ekranAc();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Motor Satışı',
      'Aksesuar',
      'Yedek Parça',
      'Bakım / Servis',
      'Nakliye / Yol Kurtarma',
      'Araç Sigortası',
    ]);
    expect(vitrinService.getAllAdmin).toHaveBeenCalledWith({ kategori: 'motor' });
  });

  test('personel yalnızca yetkisi olan vitrinleri görür', async () => {
    await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true } });
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Motor Satışı']);
  });

  test('yalnızca aksesuar vitrini yetkisi olan personel Motor sekmesini görmez', async () => {
    await ekranAc({ rol: 'personel', user: { aksesuar_vitrin_yetkisi: true }, bekleme: true });
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Aksesuar']);
    await waitFor(() => expect(vitrinService.getAllAdmin).toHaveBeenCalledWith({ kategori: 'aksesuar' }));
    expect(vitrinService.getAllAdmin).not.toHaveBeenCalledWith({ kategori: 'motor' });
  });

  test('personel her iki yetkiye sahipse Motor ve Aksesuar sekmeleri çıkar', async () => {
    await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true, aksesuar_vitrin_yetkisi: true } });
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Motor Satışı', 'Aksesuar']);
  });

  test('sekme değişince o kategorinin ilanları istenir; arama ve arşiv görünümü sıfırlanır', async () => {
    const user = await ekranAc({ liste: { aksesuar: [{ id: 20, baslik: 'Kask LS2', fiyat: 2500, yayinda: true, siralama: 0 }] } });
    await user.type(screen.getByLabelText('İlan ara'), 'yamaha');
    await user.click(screen.getByRole('button', { name: /Arşiv \(1\)/ }));
    await sekme(user, 'Aksesuar');
    expect(await screen.findByText('Kask LS2')).toBeInTheDocument();
    expect(vitrinService.getAllAdmin).toHaveBeenLastCalledWith({ kategori: 'aksesuar' });
    expect(screen.getByLabelText('İlan ara')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Yayında \(1\)/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('ilanlar yüklenemezse hata bildirimi çıkar', async () => {
    kur();
    vi.mocked(vitrinService.getAllAdmin).mockRejectedValue(new Error('ağ'));
    render(<Vitrin />);
    expect(await screen.findByText('Ürünler yüklenemedi')).toBeInTheDocument();
  });
});

// ---- Liste, arama, arşiv -----------------------------------------------------------------------------------------
describe('Vitrin: ilan listesi', () => {
  test('kart içeriği: ilan no, rozetler, marka/model/yıl, km ve fiyat', async () => {
    await ekranAc();
    const k = within(kart('NMAX Fırsat'));
    expect(k.getByText('İlan No: ILN-0007')).toBeInTheDocument();
    for (const t of ['İkinci El', '★ Öne Çıkan', 'Stok bağlı', 'Scooter', '155 cc', 'NMAX Fırsat', 'Yamaha NMAX 2021', '12.000 km']) {
      expect(k.getAllByText(t).length).toBeGreaterThan(0);
    }
    expect(k.getByText('150.000 ₺')).toBeInTheDocument();
    expect(within(kart('PCX Sıfır')).getByText('Sıfır')).toBeInTheDocument();
    expect(kart('NMAX Fırsat').querySelector('img')).toHaveAttribute('src', '/g/11');
    expect(within(kart('PCX Sıfır')).getByText('Fotoğraf yok')).toBeInTheDocument(); // kapak yok: yer tutucu
  });

  test('yayındaki ve arşivdeki ilan sayıları; arşiv görünümü yalnızca yayından kaldırılanları gösterir', async () => {
    const user = await ekranAc();
    expect(screen.getByRole('button', { name: /Yayında \(2\)/ })).toBeInTheDocument();
    expect(screen.queryByText('Küçük Chopper')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Arşiv \(1\)/ }));
    expect(screen.getByText('Küçük Chopper')).toBeInTheDocument();
    expect(screen.queryByText('NMAX Fırsat')).not.toBeInTheDocument();
    expect(within(kart('Küçük Chopper')).getByText('Arşivde')).toBeInTheDocument();
  });

  test('arama her kelimeyi başlık/marka/yıl/ilan no içinde arar; Türkçe harf ve aksan farkı yok', async () => {
    const user = await ekranAc();
    const kutu = screen.getByLabelText('İlan ara');
    await user.type(kutu, 'yamaha 2021');
    expect(screen.getByText('NMAX Fırsat')).toBeInTheDocument();
    expect(screen.queryByText('PCX Sıfır')).not.toBeInTheDocument();
    await user.clear(kutu);
    await user.type(kutu, 'iln-0007');
    expect(screen.getByText('NMAX Fırsat')).toBeInTheDocument();
    expect(screen.queryByText('PCX Sıfır')).not.toBeInTheDocument();
    await user.clear(kutu);
    await user.type(kutu, 'PCX');
    expect(screen.getByText('PCX Sıfır')).toBeInTheDocument();
    await user.clear(kutu);
    await user.type(kutu, 'yamaha 2023'); // marka bir ilanda, yıl başka ilanda: HER kelime aynı ilanda olmalı
    expect(screen.getByText('"yamaha 2023" ile eşleşen ilan yayında yok.')).toBeInTheDocument();
  });

  test('yayında sonuç yoksa mesaj + arşivdeki sonuç sayısı; düğme arşive geçirir; temizle düğmesi aramayı siler', async () => {
    const user = await ekranAc();
    await user.type(screen.getByLabelText('İlan ara'), 'kucuk');
    expect(screen.getByText('"kucuk" ile eşleşen ilan yayında yok.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Arşivde 1 sonuç var — göster' }));
    expect(screen.getByText('Küçük Chopper')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Aramayı temizle'));
    expect(screen.getByLabelText('İlan ara')).toHaveValue('');
  });

  test('kategoride hiç ilan yoksa yönlendirici mesaj çıkar; arşiv boşsa ayrı mesaj', async () => {
    const user = await ekranAc({ liste: { motor: [U1] } });
    await user.click(screen.getByRole('button', { name: /Arşiv \(0\)/ }));
    yaziVar('Arşiv boş. Yayından kaldırdığınız ilanlar burada toplanır.');
  });

  test('ilan hiç yoksa "Bu kategoride henüz ilan yok" mesajı', async () => {
    kur({ liste: { motor: [] } });
    render(<Vitrin />);
    expect(await screen.findByText(/Bu kategoride henüz ilan yok/)).toBeInTheDocument();
  });
});

// ---- Sıralama, yayın, silme --------------------------------------------------------------------------------------
describe('Vitrin: sıralama', () => {
  test('admin: sıra kutusuna numara yazıp Değiştir moveToPosition çağırır ve bildirir', async () => {
    const user = await ekranAc();
    const kutu1 = screen.getByLabelText('NMAX Fırsat sıra numarası');
    expect(kutu1).toHaveValue(1);
    expect(screen.getByLabelText('PCX Sıfır sıra numarası')).toHaveValue(2);
    await user.clear(kutu1);
    await user.type(kutu1, '2');
    await user.click(within(kart('NMAX Fırsat')).getByRole('button', { name: 'Değiştir' }));
    await waitFor(() => expect(vitrinService.moveToPosition).toHaveBeenCalledWith(1, 2));
    expect(await screen.findByText('İlan 2. sıraya taşındı')).toBeInTheDocument();
  });

  test('admin: aralık dışı numara uyarı verir, sunucuya gitmez; aynı sıra sessizce yok sayılır', async () => {
    const user = await ekranAc();
    const kutu1 = screen.getByLabelText('NMAX Fırsat sıra numarası');
    await user.clear(kutu1);
    await user.type(kutu1, '5');
    await user.click(within(kart('NMAX Fırsat')).getByRole('button', { name: 'Değiştir' }));
    expect(await screen.findByText('Sıra numarası 1 ile 2 arasında olmalı')).toBeInTheDocument();
    await user.clear(kutu1);
    await user.type(kutu1, '1');
    await user.click(within(kart('NMAX Fırsat')).getByRole('button', { name: 'Değiştir' }));
    expect(vitrinService.moveToPosition).not.toHaveBeenCalled();
  });

  test('yetkili personel: "n. sıra" etiketi + aşağı ok reorder çağırır; ilk kartta yukarı ok kapalı', async () => {
    const user = await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true } });
    expect(screen.getByText('1. sıra')).toBeInTheDocument();
    expect(screen.getByText('2. sıra')).toBeInTheDocument();
    const k1 = within(kart('NMAX Fırsat'));
    expect(k1.getByTitle('Bir sıra yukarı')).toBeDisabled();
    await user.click(k1.getByTitle('Bir sıra aşağı'));
    await waitFor(() => expect(vitrinService.reorder).toHaveBeenCalledWith('motor', [2, 1]));
    expect(await screen.findByText('Anasayfa vitrin sırası kaydedildi')).toBeInTheDocument();
  });

  test('sıralama kaydı hata verirse eski sıra geri gelir ve hata bildirilir', async () => {
    const user = await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true } });
    vi.mocked(vitrinService.reorder).mockRejectedValue(new Error('x'));
    await user.click(within(kart('NMAX Fırsat')).getByTitle('Bir sıra aşağı'));
    expect(await screen.findByText('Vitrin sırası kaydedilemedi')).toBeInTheDocument();
  });

  test('arama açıkken oklar kapalıdır ve ipucu yazısı değişir', async () => {
    const user = await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true } });
    await user.type(screen.getByLabelText('İlan ara'), 'pcx');
    expect(within(kart('PCX Sıfır')).getByTitle('Bir sıra yukarı')).toBeDisabled();
    expect(within(kart('PCX Sıfır')).getByTitle('Bir sıra aşağı')).toBeDisabled();
    yaziVar('1 ilan bulundu. Yukarı/aşağı okları ve sürükleme, aramayı temizleyince açılır.');
    expect(screen.getByText('2. sıra')).toBeInTheDocument(); // gerçek konum, aramadan bağımsız
  });

  test('sürükle-bırak: bir kartı diğerinin üstüne bırakmak sırayı değiştirir', async () => {
    await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true } });
    const tutacak = screen.getByText('1. sıra').closest('[draggable="true"]') as Element;
    const hedef = kart('PCX Sıfır').closest('.MuiGrid-root') as Element;
    fireEvent.dragStart(tutacak, { dataTransfer: { effectAllowed: '' } });
    fireEvent.dragOver(hedef);
    fireEvent.drop(hedef);
    await waitFor(() => expect(vitrinService.reorder).toHaveBeenCalledWith('motor', [2, 1]));
  });
});

describe('Vitrin: yayın ve silme', () => {
  test('admin: "Yayından Kaldır" durumu değiştirir ve arşive taşır; personel bu düğmeyi görmez', async () => {
    const user = await ekranAc();
    await user.click(within(kart('PCX Sıfır')).getByRole('button', { name: 'Yayından Kaldır' }));
    await waitFor(() => expect(vitrinService.setPublished).toHaveBeenCalledWith(2, false));
    expect(await screen.findByText('İlan yayından kaldırıldı, arşive taşındı')).toBeInTheDocument();
  });

  test('admin: arşivdeki ilanda "Yayına Al" yayına alır', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('button', { name: /Arşiv \(1\)/ }));
    await user.click(within(kart('Küçük Chopper')).getByRole('button', { name: 'Yayına Al' }));
    await waitFor(() => expect(vitrinService.setPublished).toHaveBeenCalledWith(3, true));
    expect(await screen.findByText('İlan arşivden çıkarıldı, yayına alındı (listenin sonuna eklendi)')).toBeInTheDocument();
  });

  test('personelde yayın düğmesi ve sıra kutusu yoktur', async () => {
    await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true } });
    expect(screen.queryByRole('button', { name: 'Yayından Kaldır' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Değiştir' })).not.toBeInTheDocument();
  });

  test('silme: onay verilirse siler ve bildirir; onaylanmazsa silmez; hatada uyarır', async () => {
    const user = await ekranAc();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(within(kart('PCX Sıfır')).getByTestId('DeleteIcon'));
    expect(vitrinService.delete).not.toHaveBeenCalled();
    await user.click(within(kart('PCX Sıfır')).getByTestId('DeleteIcon'));
    expect(window.confirm).toHaveBeenLastCalledWith('Bu ilanı silmek istediğinize emin misiniz?');
    await waitFor(() => expect(vitrinService.delete).toHaveBeenCalledWith(2));
    expect(await screen.findByText('Silindi')).toBeInTheDocument();
    vi.mocked(vitrinService.delete).mockRejectedValue(new Error('x'));
    await user.click(within(kart('PCX Sıfır')).getByTestId('DeleteIcon'));
    expect(await screen.findByText('Silinemedi')).toBeInTheDocument();
  });
});

// ---- İlan formu --------------------------------------------------------------------------------------------------
describe('Vitrin: yeni ilan formu', () => {
  const yeniAc = async (user: Kullanim) => {
    await user.click(screen.getByRole('button', { name: 'İlan Ekle' }));
    return screen.findByRole('dialog');
  };

  test('doğrulamalar: başlık, motor için segment, geçersiz Rubik linki', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni İlan: Motor Satışı')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Başlık zorunlu')).toBeInTheDocument();
    await user.type(alan('Başlık *'), 'Deneme');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Motor ilanı için segment seçin')).toBeInTheDocument();
    await user.type(alan('Segment *'), 'Naked');
    await user.type(alan('Rubik Ödeme Linki (opsiyonel)'), 'abc');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Geçerli bir Rubik ödeme linki girin (https:// ile başlamalı)')).toBeInTheDocument();
    expect(vitrinService.create).not.toHaveBeenCalled();
  });

  test('kaydet: yük (kategori, sıra = en büyük + 1, boş görseller) gider; pencere kapanır, liste yenilenir', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(alan('Başlık *'), 'Deneme İlan');
    await user.type(alan('Segment *'), 'Naked');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.create).toHaveBeenCalled());
    expect(vi.mocked(vitrinService.create).mock.calls[0][0]).toEqual({
      baslik: 'Deneme İlan',
      aciklama: '',
      fiyat: '',
      video_url: '',
      marka: '',
      model: '',
      yil: '',
      segment: 'Naked',
      motor_cc: '',
      km: '',
      hasar_kaydi: '',
      motor_durumu: 'ikinci_el',
      yayinda: true,
      siralama: 3,
      one_cikan: false,
      stok_motor_id: null,
      sifir_motor_id: null,
      rubik_link: '',
      kategori: 'motor',
      gorseller: [],
    });
    expect(await screen.findByText('Kaydedildi')).toBeInTheDocument();
    await bekleDialogKapanana();
  });

  test('kaydedilemezse hata bildirimi çıkar ve pencere açık kalır', async () => {
    const user = await ekranAc();
    vi.mocked(vitrinService.create).mockRejectedValue(new Error('x'));
    const p = await yeniAc(user);
    await user.type(alan('Başlık *'), 'X');
    await user.type(alan('Segment *'), 'Naked');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Kaydedilemedi')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('stoktan motor seçmek alanları doldurur, bağlı rozetini gösterir; satılmış motor listede yoktur', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText(/Belge eklemek için yukarıdan/)).toBeInTheDocument();
    await user.click(within(p).getByRole('combobox', { name: /Stoktan Motor Seç/ }));
    const secenekler = screen.getAllByRole('option').map((o) => o.textContent);
    expect(secenekler).toEqual(['34ABC123 • Yamaha NMAX 2021']); // 06SATILDI (tamamlandi) yok
    await user.click(screen.getByRole('option', { name: '34ABC123 • Yamaha NMAX 2021' }));
    expect(alan('Başlık *')).toHaveValue('NMAX Temiz');
    expect(alan('Marka')).toHaveValue('Yamaha');
    expect(alan('Model')).toHaveValue('NMAX');
    expect(alan('Yıl')).toHaveValue(2021);
    expect(alan('KM')).toHaveValue(12000);
    expect(alan('Fiyat (₺)')).toHaveValue(150000);
    expect(alan('Motor (cc)')).toHaveValue(155);
    expect(within(p).getByText('Stoktan bağlandı — temel bilgiler stoktan geliyor')).toBeInTheDocument();
    expect(within(p).getByText('BELGE-BOLUMU-5')).toBeInTheDocument();
    await user.click(within(p).getByTestId('CancelIcon')); // rozetin silme ikonu bağı kaldırır
    expect(within(p).queryByText('BELGE-BOLUMU-5')).not.toBeInTheDocument();
  });

  test('Sıfır / İkinci El seçimi yüke girer', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Sıfır' }));
    yaziVar('Sitede müşteri "Sıfır" seçtiğinde bu ilan listelenir.');
    await user.type(alan('Başlık *'), 'Y');
    await user.type(alan('Segment *'), 'Naked');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.create).toHaveBeenCalled());
    expect((vi.mocked(vitrinService.create).mock.calls[0][0] as Record<string, unknown>).motor_durumu).toBe('sifir');
  });

  test('sıfır ilan: sıfır stoktan model seçmek bilgileri, fiyatı ve FOTOĞRAFLARI doldurur; yüke model bağlantısı girer', async () => {
    const MODEL = {
      id: 31,
      marka: 'Honda',
      model: 'PCX 125',
      yil: 2026,
      motor_cc: 125,
      segment: 'Scooter',
      liste_fiyati: '120000.00',
      aciklama: 'Kırmızı ve beyaz renk',
      kapak_gorsel_id: 70,
      gorsel_sayisi: 2,
      satilan_adet: 0,
    };
    vi.mocked(sifirMotorService.getAll).mockResolvedValue({ data: [MODEL] } as never);
    vi.mocked(sifirMotorService.getById).mockResolvedValue({ data: { ...MODEL, gorsel_idler: [70, 71] } } as never);
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Sıfır' }));
    await user.click(within(p).getByLabelText('Sıfır Stoktan Seç'));
    await user.click(await screen.findByRole('option', { name: /Honda PCX 125 \(2026\)/ }));
    await waitFor(() => expect(within(p).getAllByAltText(/^gorsel-/)).toHaveLength(2));
    expect(vi.mocked(global.fetch).mock.calls.map((c) => c[0])).toEqual(['/sifir-gorsel/70', '/sifir-gorsel/71']);
    expect(alan('Başlık *')).toHaveValue('Honda PCX 125 2026');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.create).toHaveBeenCalled());
    const yuk = vi.mocked(vitrinService.create).mock.calls[0][0] as Record<string, unknown>;
    expect(yuk).toMatchObject({ motor_durumu: 'sifir', sifir_motor_id: 31, stok_motor_id: null, marka: 'Honda', fiyat: '120000.00', segment: 'Scooter' });
    expect(yuk.gorseller).toHaveLength(2);
  });

  test('ikinci ele geçince sıfır stok bağlantısı yükten düşer', async () => {
    vi.mocked(sifirMotorService.getAll).mockResolvedValue({
      data: [{ id: 31, marka: 'Honda', model: 'PCX', yil: 2026, liste_fiyati: 1, gorsel_sayisi: 0 }],
    } as never);
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Sıfır' }));
    await user.click(within(p).getByLabelText('Sıfır Stoktan Seç'));
    await user.click(await screen.findByRole('option', { name: /Honda PCX/ }));
    await user.click(within(p).getByRole('button', { name: 'İkinci El' }));
    await user.type(alan('Segment *'), 'Naked');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.create).toHaveBeenCalled());
    expect((vi.mocked(vitrinService.create).mock.calls[0][0] as Record<string, unknown>).sifir_motor_id).toBeNull();
  });

  test('aksesuar sekmesi: stoktan seçmek başlık, marka, fiyat ve açıklamayı doldurur; segment zorunlu değildir', async () => {
    const user = await ekranAc();
    await sekme(user, 'Aksesuar');
    await user.click(await screen.findByRole('button', { name: 'İlan Ekle' }));
    const p = await screen.findByRole('dialog');
    expect(within(p).queryByLabelText('Segment *')).not.toBeInTheDocument();
    await user.click(within(p).getByRole('combobox', { name: /Stoktan Aksesuar Seç/ }));
    await user.click(screen.getByRole('option', { name: 'Kask • LS2 — ₺2.500' }));
    expect(alan('Başlık *')).toHaveValue('Kask');
    expect(alan('Marka')).toHaveValue('LS2');
    expect(alan('Fiyat (₺)')).toHaveValue(2500);
    expect(alan('Açıklama')).toHaveValue('Marka: LS2\nKategori: Kask\nBeden: L\nRenk: Siyah');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.create).toHaveBeenCalled());
    expect(vi.mocked(vitrinService.create).mock.calls[0][0]).toMatchObject({ kategori: 'aksesuar', baslik: 'Kask', fiyat: 2500 });
  });

  test('yetkisiz personel "Sitede yayınla" anahtarını değiştiremez', async () => {
    const user = await ekranAc({ rol: 'personel', user: { motor_vitrin_yetkisi: true } });
    const p = await yeniAc(user);
    expect(within(p).getByRole('switch', { name: 'Sitede yayınla (yalnızca yönetici değiştirebilir)' })).toBeDisabled();
    expect(within(p).getByRole('switch', { name: 'Öne çıkar' })).toBeEnabled();
  });

  test('İptal / kapat ikonu formu kapatır', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await bekleDialogKapanana();
  });
});

describe('Vitrin: ilan düzenleme, görseller ve video', () => {
  const duzenleAc = async (user: Kullanim) => {
    await user.click(within(kart('NMAX Fırsat')).getByTestId('EditIcon'));
    const p = await screen.findByRole('dialog');
    await waitFor(() => expect(within(p).getAllByAltText(/^gorsel-/)).toHaveLength(3));
    return p;
  };

  test('düzenle ilanı sunucudan çeker; alanlar ve 3 görsel (fetch ile) dolu gelir', async () => {
    const user = await ekranAc();
    const p = await duzenleAc(user);
    expect(vitrinService.getById).toHaveBeenCalledWith(1);
    expect(within(p).getByText('İlanı Düzenle: Motor Satışı')).toBeInTheDocument();
    expect(alan('Başlık *')).toHaveValue('NMAX Fırsat');
    expect(alan('Hasar Kaydı')).toHaveValue('Yok');
    expect(vi.mocked(global.fetch).mock.calls.map((c) => c[0])).toEqual(['/g/11', '/g/12', '/g/13']);
    expect(within(p).getByText('BELGE-BOLUMU-5')).toBeInTheDocument(); // stok bağlı
    expect(within(p).getByText('Vitrin')).toBeInTheDocument(); // ilk görsel
  });

  test('görsel işlemleri: kapak yap, sağa kaydır, sil ve sürükle-bırak; kaydedince sıra yüke girer', async () => {
    const user = await ekranAc();
    const p = await duzenleAc(user);
    const imgs = () => within(p).getAllByAltText(/^gorsel-/);
    const kaynak0 = imgs().map((i) => i.getAttribute('src'));
    expect(new Set(kaynak0).size).toBe(1); // üçü de aynı sahte blob; sırayı konumlarına göre izleyemeyiz: ⭐ ile sayıyı sınarız
    await user.click(within(p).getAllByTitle('Vitrin fotoğrafı yap')[0]); // 2. görseli kapak yap
    expect(within(p).getAllByTitle('Vitrin fotoğrafı yap')).toHaveLength(2);
    await user.click(within(p).getAllByTitle('Sağa kaydır')[0]);
    const kapat = within(p)
      .getAllByTestId('CloseIcon')
      .filter((x) => x.closest('[draggable="true"]'));
    expect(kapat).toHaveLength(3);
    await user.click(kapat[2]); // sonuncuyu sil
    expect(imgs()).toHaveLength(2);
    const kutular = imgs().map((i) => i.closest('[draggable="true"]') as Element);
    fireEvent.dragStart(kutular[0], { dataTransfer: { effectAllowed: '' } });
    fireEvent.drop(kutular[1]);
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.update).toHaveBeenCalled());
    const [id, yuk] = vi.mocked(vitrinService.update).mock.calls[0] as [number, Record<string, string[]>];
    expect(id).toBe(1);
    expect(yuk.gorseller).toHaveLength(2);
    expect(yuk.gorseller.every((g: string) => g.startsWith('data:image/jpeg'))).toBe(true);
    expect(yuk).toMatchObject({ kategori: 'motor', baslik: 'NMAX Fırsat', stok_motor_id: 5, one_cikan: true });
    expect(yuk).not.toHaveProperty('video'); // yeni video seçilmedi
    expect(yuk).not.toHaveProperty('video_sil');
  });

  test('mevcut video: "Yüklü video mevcut"; Kaldır + Kaydet video_sil gönderir', async () => {
    const user = await ekranAc();
    const p = await duzenleAc(user);
    expect(within(p).getByText('Yüklü video mevcut')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaldır' }));
    expect(within(p).getByRole('button', { name: 'Video Yükle' })).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.update).toHaveBeenCalled());
    expect((vi.mocked(vitrinService.update).mock.calls[0][1] as Record<string, unknown>).video_sil).toBe(true);
  });

  test('yeni video: dosya adı görünür, yüke video (data URL) girer; sunucu sınırını aşan dosya reddedilir', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('button', { name: 'İlan Ekle' }));
    const p = await screen.findByRole('dialog');
    const girdi = () => p.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
    fireEvent.change(girdi(), { target: { files: [new File([new ArrayBuffer(2 * 1024 * 1024)], 'buyuk.mp4', { type: 'video/mp4' })] } });
    expect(await screen.findByText('Video çok büyük (en fazla ~1 MB). Lütfen sıkıştırın.')).toBeInTheDocument();
    expect(within(p).getByRole('button', { name: 'Video Yükle' })).toBeInTheDocument();

    fireEvent.change(girdi(), { target: { files: [new File(['abc'], 'tanitim.mp4', { type: 'video/mp4' })] } });
    expect(await within(p).findByText('tanitim.mp4')).toBeInTheDocument();
    await user.type(alan('Başlık *'), 'Videolu');
    await user.type(alan('Segment *'), 'Naked');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(vitrinService.create).toHaveBeenCalled());
    expect((vi.mocked(vitrinService.create).mock.calls[0][0] as Record<string, string>).video).toMatch(/^data:video\/mp4;base64,/);
  });

  test('ilan yüklenemezse hata bildirilir', async () => {
    const user = await ekranAc();
    vi.mocked(vitrinService.getById).mockRejectedValue(new Error('x'));
    await user.click(within(kart('NMAX Fırsat')).getByTestId('EditIcon'));
    expect(await screen.findByText('Ürün yüklenemedi')).toBeInTheDocument();
  });
});

// ---- İletişim ve hizmet sayfaları --------------------------------------------------------------------------------
describe('Vitrin: iletişim ve hizmet sayfası', () => {
  test('motor sekmesi: iletişim kartı iki kişiyi gösterir; "Personel / Telefon" formu dolu açılır ve kaydeder', async () => {
    const user = await ekranAc();
    await waitFor(() => expect(screen.getByText(/Satış Ahmet/)).toBeInTheDocument());
    expect(screen.getByText(/Satış Ahmet/).textContent).toContain('0532');
    expect(screen.getByText(/Satış Ahmet/).textContent).toContain('Ayşe');
    await user.click(screen.getByRole('button', { name: 'Personel / Telefon' }));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Motor Satışı: İletişim')).toBeInTheDocument();
    expect(within(p).getByLabelText('Personel Adı')).toHaveValue('Satış Ahmet');
    expect(within(p).getByLabelText('Not (opsiyonel)')).toHaveValue('Not 1');
    expect(within(p).queryByLabelText('Başlık')).not.toBeInTheDocument(); // başlık yalnız hizmet sayfalarında
    await user.clear(within(p).getByLabelText('Telefon'));
    await user.type(within(p).getByLabelText('Telefon'), '0540');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(vitrinService.updateIletisim).toHaveBeenCalledWith('motor', {
        personel_adi: 'Satış Ahmet',
        telefon: '0540',
        personel_adi_2: 'Ayşe',
        telefon_2: '0533',
        aciklama: 'Not 1',
        baslik: '',
      }),
    );
    expect(await screen.findByText('Kaydedildi')).toBeInTheDocument();
  });

  test('hizmet sekmesi: ilan listesi yerine ayar paneli; görsel yoksa uyarı; düzenleme formunda başlık ve görsel alanı var', async () => {
    const user = await ekranAc();
    await sekme(user, 'Bakım / Servis');
    expect(await screen.findByText('Bakım Atölyesi')).toBeInTheDocument();
    yaziVar('Henüz görsel eklenmedi');
    expect(screen.getByText('Randevu alın')).toBeInTheDocument();
    expect(screen.getByText(/Usta Ali/).textContent).toContain('0555');
    expect(screen.queryByRole('button', { name: 'İlan Ekle' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hizmet Sayfasını Düzenle' }));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Bakım / Servis: Hizmet Sayfası')).toBeInTheDocument();
    expect(within(p).getByLabelText('Başlık')).toHaveValue('Bakım Atölyesi');
    expect(within(p).getByRole('button', { name: 'Görsel Yükle' })).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(vitrinService.updateIletisim).toHaveBeenCalledWith(
        'bakim_servis',
        expect.objectContaining({ baslik: 'Bakım Atölyesi', personel_adi: 'Usta Ali' }),
      ),
    );
  });
});
