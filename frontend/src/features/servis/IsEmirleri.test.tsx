/*
 * İş Emirleri liste sayfası için KARAKTERİZASYON testleri: ekranın bugün ne yaptığını kayda geçirir.
 * Amaç IsEmirleri.jsx'i parçalara bölerken davranışın değişmediğini kanıtlamak; bölmeden önce de sonra da yeşil olmalı.
 * API, oturum, QR kütüphanesi ve tarayıcı pencereleri (open/alert/confirm) sahte (mock). Sayılar elle hesaplandı.
 */
import React from 'react';
import type { Mock } from 'vitest';
import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import { sorguluRender } from '../../shared/sorgu/sorguluRender';
import userEvent from '@testing-library/user-event';
import IsEmirleri from './IsEmirleri';
import { isEmriService, servisGecmisiService } from './servisApi';
import { musteriService } from '../musteriler/musteriApi';
import { authService } from '../auth/authApi';
import { aksesuarStokService } from '../aksesuar/aksesuarApi';
import { yedekParcaStokService } from '../yedek-parca/yedekParcaApi';
import { useAuth, useKarGor } from '../auth/AuthContext';
import QRCode from 'qrcode';

vi.mock('./servisApi', () => ({
  isEmriService: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  servisGecmisiService: { getQrToken: vi.fn() },
}));
vi.mock('../musteriler/musteriApi', () => ({ musteriService: { search: vi.fn(), searchByPhone: vi.fn() } }));
vi.mock('../auth/authApi', () => ({ authService: { getPersonelListesi: vi.fn() } }));
vi.mock('../aksesuar/aksesuarApi', () => ({ aksesuarStokService: { search: vi.fn(), getByBarkod: vi.fn() } }));
vi.mock('../yedek-parca/yedekParcaApi', () => ({ yedekParcaStokService: { search: vi.fn(), getByBarkod: vi.fn() } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn(), useKarGor: vi.fn() }));
// Yönlendirme kancaları sahte (Jest 27 zamanında react-router-dom v7'nin "exports" alanı okunamadığı için eklendi; sözleşme aynı kalsın diye korundu)
let mockLocation: { pathname: string; state: unknown } = { pathname: '/is-emirleri', state: null };
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => mockLocation }));
vi.mock('qrcode', () => ({ __esModule: true, default: { toDataURL: vi.fn() } }));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const BUGUN = new Date().toISOString();
const A = {
  id: 1,
  fis_no: 101,
  musteri_ad_soyad: 'Ayşe Yılmaz',
  telefon: '05551112233',
  marka: 'Honda',
  model_tip: 'PCX',
  plaka: '34ABC123',
  durum: 'beklemede',
  created_at: BUGUN,
  gercek_toplam_ucret: 1500,
  toplam_maliyet: 900,
  kar: 600,
  ariza_sikayetler: 'Fren sesi',
  teslim_eden_teknisyen: 'Usta Mehmet',
};
const B = {
  id: 2,
  fis_no: 102,
  musteri_ad_soyad: 'Veli Demir',
  telefon: '05332223344',
  marka: 'Yamaha',
  model_tip: 'NMAX',
  plaka: '',
  durum: 'devam_ediyor',
  created_at: '2026-09-15T12:00:00',
  gercek_toplam_ucret: 1000,
  toplam_maliyet: 600,
  kar: 400,
  olusturan_kisi: 'ofis',
};
const C = {
  id: 3,
  fis_no: 103,
  musteri_ad_soyad: 'Zeynep Kaya',
  telefon: '',
  marka: 'Suzuki',
  model_tip: 'Burgman',
  plaka: '35ZZ001',
  durum: 'tamamlandi',
  created_at: '2026-10-01T12:00:00',
  gercek_toplam_ucret: 2500,
  toplam_maliyet: 1500,
  kar: 1000,
};
const LISTE = [A, B, C];
// Toplam 3, Bugün 1, Beklemede 1, İşlemde 1, Tamamlandı 1; gelir 5.000; kâr 2.000 (yalnızca admin)

const DETAY_A = {
  ...A,
  adres: 'Kadıköy',
  km: 12500,
  aciklama: 'Acil',
  odeme_detaylari: 'Nakit',
  kalan_odeme: 500,
  tahmini_toplam_ucret: 1500,
  tahmini_teslim_tarihi: '2026-10-20T12:00:00',
  teslim_alan_ad_soyad: 'Usta Ali',
  olusturan_kisi: 'ofis',
  parcalar: [{ takilan_parca: 'Fren balatası', adet: 2, birim_fiyat: 300, toplam_fiyat: 600, maliyet: 150, parca_kodu: 'AK-1' }],
};
const AKS_STOK = { id: 10, stok_kodu: 'AK-1', stok_adi: 'Fren Balata', mevcut: 5, satis_fiyati: 250, alis_fiyati: 150 };
const tarihTr = (d: string) => new Date(d).toLocaleDateString('tr-TR');
type Kullanim = ReturnType<typeof userEvent.setup>;
interface KurSecenegi {
  rol?: string;
  liste?: typeof LISTE;
  bekleme?: boolean;
}

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
let win: { document: { write: Mock; close: Mock }; focus: Mock; print: Mock }; // sahte yazdırma penceresi
const kur = ({ rol = 'admin', liste = LISTE }: KurSecenegi = {}) => {
  vi.mocked(useAuth).mockReturnValue({ user: { rol } } as never);
  vi.mocked(useKarGor).mockReturnValue(rol === ('admin' as never));
  vi.mocked(isEmriService.getAll).mockImplementation(async (p) => {
    const durum = (p as { durum?: string } | undefined)?.durum;
    return { data: durum ? liste.filter((x) => x.durum === durum) : liste } as never;
  });
  vi.mocked(isEmriService.getById).mockImplementation(async (id) => ({ data: id === 1 ? DETAY_A : liste.find((x) => x.id === id) }) as never);
  vi.mocked(isEmriService.create).mockResolvedValue({ data: {} } as never);
  vi.mocked(isEmriService.update).mockResolvedValue({ data: {} } as never);
  vi.mocked(isEmriService.delete).mockResolvedValue({ data: {} } as never);
  vi.mocked(servisGecmisiService.getQrToken).mockResolvedValue({ data: { token: 'tok123' } } as never);
  vi.mocked(QRCode.toDataURL).mockResolvedValue('data:image/png;base64,AAA' as never);
  vi.mocked(authService.getPersonelListesi).mockResolvedValue({
    data: [
      { id: 1, ad_soyad: 'Usta Mehmet' },
      { id: 2, ad_soyad: 'Usta Ali' },
    ],
  } as never);
  vi.mocked(musteriService.search).mockResolvedValue({ data: [] } as never);
  vi.mocked(musteriService.searchByPhone).mockResolvedValue({ data: null } as never);
  vi.mocked(aksesuarStokService.search).mockResolvedValue({ data: [AKS_STOK] } as never);
  vi.mocked(yedekParcaStokService.search).mockResolvedValue({ data: [] } as never);
  vi.mocked(aksesuarStokService.getByBarkod).mockRejectedValue(new Error('yok'));
  vi.mocked(yedekParcaStokService.getByBarkod).mockRejectedValue(new Error('yok'));
};

const ekranAc = async (secenek: KurSecenegi = {}) => {
  kur(secenek);
  const user = userEvent.setup();
  const sonuc = sorguluRender(<IsEmirleri />);
  if (!secenek.bekleme) await screen.findByText('Zeynep Kaya');
  return { user, ...sonuc };
};

const satir = (ad: string | RegExp) => screen.getByRole('row', { name: ad });
const hucreler = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent);
const ikon = (kapsam: HTMLElement, ad: string) => within(kapsam).getByTestId(ad);
// Üstteki özet şeridi: etiketin yanındaki büyük rakam
const ozet = (etiket: string) => within(screen.getByLabelText('Özet')).getByText(etiket).previousSibling?.textContent;
const ozetYok = (etiket: string) => within(screen.getByLabelText('Özet')).queryByText(etiket);
const alan = (etiket: string) => screen.getByLabelText(etiket);
// Typography: body -> <p>, caption -> <span>
const yazi = (metin: string) => screen.getByText((_, el) => (el?.tagName === 'P' || el?.tagName === 'SPAN') && el.textContent === metin);
const bekleDialogKapanana = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

beforeEach(() => {
  mockLocation = { pathname: '/is-emirleri', state: null };
  win = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
  vi.spyOn(window, 'open').mockImplementation(() => win as never);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Liste ve istatistik -----------------------------------------------------------------------------------------
describe('İş Emirleri: liste', () => {
  test('istatistik çipleri sayıları ve toplamı gösterir; kâr çipi yalnızca admin için', async () => {
    await ekranAc();
    const beklenen = { Toplam: '3', Bugün: '1', Beklemede: '1', İşlemde: '1', 'Ödeme bekl.': '0', Tamamlandı: '1', İptal: '0', Ciro: '₺5.000', Kâr: '₺2.000' };
    for (const [etiket, deger] of Object.entries(beklenen)) {
      expect(ozet(etiket)).toBe(deger);
    }
  });

  test('personel: kâr çipi, Kar sütunu ve silme düğmesi görünmez', async () => {
    await ekranAc({ rol: 'personel' });
    expect(ozetYok('Kâr')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Kâr' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('DeleteIcon')).toHaveLength(0);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Fiş',
      'Plaka',
      'Müşteri ve araç',
      'Telefon',
      'Durum',
      'Personel',
      'Arıza',
      'Toplam',
      'Maliyet',
      'İşlemler',
    ]);
  });

  test('admin: Kar sütunu ve her satırda silme düğmesi var; satır içeriği', async () => {
    await ekranAc();
    expect(screen.getByRole('columnheader', { name: 'Kâr' })).toBeInTheDocument();
    expect(screen.getAllByTestId('DeleteIcon')).toHaveLength(3);
    expect(hucreler(satir(/Ayşe Yılmaz/))).toEqual([
      '101',
      '34 ABC 123',
      'Ayşe YılmazHonda PCX',
      '05551112233',
      `Beklemede${tarihTr(BUGUN)}`,
      'Usta Mehmet',
      'Fren sesi',
      '₺1.500',
      '₺900',
      '₺600',
      '',
    ]);
    // personel: teslim_eden yoksa oluşturan kişi; ikisi de yoksa tire
    expect(hucreler(satir(/Veli Demir/))[5]).toBe('ofis');
    expect(hucreler(satir(/Zeynep Kaya/))[5]).toBe('-');
    expect(hucreler(satir(/Veli Demir/))[4]).toBe('İşlemde15.09.2026');
    expect(hucreler(satir(/Zeynep Kaya/))[4]).toBe('Tamamlandı01.10.2026');
  });

  test('QR düğmesi yalnızca plakası olan satırda var', async () => {
    await ekranAc();
    expect(within(satir(/Ayşe Yılmaz/)).queryByTestId('QrCode2Icon')).toBeInTheDocument();
    expect(within(satir(/Veli Demir/)).queryByTestId('QrCode2Icon')).not.toBeInTheDocument();
  });

  test('liste boşsa "Kayıt bulunamadı" satırı görünür', async () => {
    await ekranAc({ liste: [], bekleme: true });
    expect(await screen.findByText('Kayıt bulunamadı')).toBeInTheDocument();
    expect(ozet('Toplam')).toBe('0');
  });
});

describe('İş Emirleri: süzgeçler', () => {
  test('arama müşteri adı, fiş no, telefon ve markada çalışır (büyük/küçük harf farkı yok)', async () => {
    const { user } = await ekranAc();
    const kutu = screen.getByPlaceholderText('Ara (Müşteri, Fiş No, Marka,...)');
    await user.type(kutu, 'veli');
    expect(screen.queryByText('Ayşe Yılmaz')).not.toBeInTheDocument();
    expect(screen.getByText('Veli Demir')).toBeInTheDocument();
    await user.clear(kutu);
    await user.type(kutu, '103');
    expect(screen.getAllByRole('row')).toHaveLength(2); // başlık + Zeynep
    expect(screen.getByText('Zeynep Kaya')).toBeInTheDocument();
    await user.clear(kutu);
    await user.type(kutu, '0533');
    expect(screen.getByText('Veli Demir')).toBeInTheDocument();
    expect(screen.queryByText('Zeynep Kaya')).not.toBeInTheDocument();
    await user.clear(kutu);
    await user.type(kutu, 'SUZ');
    expect(screen.getByText('Zeynep Kaya')).toBeInTheDocument();
    expect(screen.queryByText('Veli Demir')).not.toBeInTheDocument();
  });

  test('tarih aralığı oluşturma tarihine göre süzer; istatistikler süzülmemiş listeyi sayar', async () => {
    await ekranAc();
    fireEvent.change(screen.getByLabelText('Bitiş'), { target: { value: '2026-09-20' } });
    expect(screen.getByText('Veli Demir')).toBeInTheDocument();
    expect(screen.queryByText('Ayşe Yılmaz')).not.toBeInTheDocument();
    expect(screen.queryByText('Zeynep Kaya')).not.toBeInTheDocument();
    expect(ozet('Toplam')).toBe('3');
    fireEvent.change(screen.getByLabelText('Bitiş'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Başlangıç'), { target: { value: '2026-09-30' } });
    expect(screen.queryByText('Veli Demir')).not.toBeInTheDocument();
    expect(screen.getByText('Zeynep Kaya')).toBeInTheDocument();
    expect(screen.getByText('Ayşe Yılmaz')).toBeInTheDocument();
  });

  test('durum süzgeci sunucudan o duruma göre yeniden ister', async () => {
    const { user } = await ekranAc();
    expect(isEmriService.getAll).toHaveBeenLastCalledWith({});
    await user.click(screen.getByRole('combobox', { name: 'Durum' }));
    await user.click(screen.getByRole('option', { name: 'Tamamlandı' }));
    await waitFor(() => expect(isEmriService.getAll).toHaveBeenLastCalledWith({ durum: 'tamamlandi' }));
    await waitFor(() => expect(screen.queryByText('Veli Demir')).not.toBeInTheDocument());
    expect(ozet('Toplam')).toBe('1');
  });

  // ---- Önbellek (TanStack Query) ----
  const durumSec = async (user: Kullanim, ad: string) => {
    await user.click(screen.getByRole('combobox', { name: 'Durum' }));
    await user.click(screen.getByRole('option', { name: ad }));
  };

  test('önbellek: personel listesi bir kez istenir, durum süzgeci değişince yeniden istenmez', async () => {
    const { user } = await ekranAc();
    await durumSec(user, 'Tamamlandı');
    await waitFor(() => expect(isEmriService.getAll).toHaveBeenLastCalledWith({ durum: 'tamamlandi' }));
    expect(authService.getPersonelListesi).toHaveBeenCalledTimes(1);
  });

  test('önbellek: daha önce bakılan duruma 30 sn içinde dönünce liste sunucuya gitmeden gelir (sonrası tazelenir)', async () => {
    const { user } = await ekranAc();
    await durumSec(user, 'Tamamlandı');
    await waitFor(() => expect(screen.queryByText('Veli Demir')).not.toBeInTheDocument());
    const cagri = vi.mocked(isEmriService.getAll).mock.calls.length;
    await durumSec(user, 'Tümü');
    expect(await screen.findByText('Veli Demir')).toBeInTheDocument();
    expect(vi.mocked(isEmriService.getAll).mock.calls.length).toBe(cagri);
  });

  test('önbellek: sayfa kapatılıp yeniden açılınca liste yine sunucudan istenir (başka ekranda yapılan değişiklik görünsün)', async () => {
    const { istemci, unmount } = await ekranAc();
    const cagri = vi.mocked(isEmriService.getAll).mock.calls.length;
    unmount();
    sorguluRender(<IsEmirleri />, { istemci });
    await waitFor(() => expect(vi.mocked(isEmriService.getAll).mock.calls.length).toBe(cagri + 1));
  });
});

describe('İş Emirleri: silme', () => {
  test('admin onaylarsa siler ve listeyi yeniler; iptal ederse silmez', async () => {
    const { user } = await ekranAc();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(ikon(satir(/Veli Demir/), 'DeleteIcon'));
    expect(isEmriService.delete).not.toHaveBeenCalled();

    const cagri = vi.mocked(isEmriService.getAll).mock.calls.length;
    await user.click(ikon(satir(/Veli Demir/), 'DeleteIcon'));
    expect(window.confirm).toHaveBeenLastCalledWith('Bu iş emrini silmek istediğinizden emin misiniz?');
    expect(isEmriService.delete).toHaveBeenCalledWith(2);
    await waitFor(() => expect(vi.mocked(isEmriService.getAll).mock.calls.length).toBe(cagri + 1));
  });

  test('silme hatasında sunucu mesajı uyarı olarak gösterilir', async () => {
    const { user } = await ekranAc();
    vi.mocked(isEmriService.delete).mockRejectedValue({ response: { data: { message: 'Bağlı kayıt var' } } });
    await user.click(ikon(satir(/Veli Demir/), 'DeleteIcon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Bağlı kayıt var'));
  });
});

// ---- Detay penceresi ---------------------------------------------------------------------------------------------
describe('İş Emirleri: detay penceresi', () => {
  test('göz ikonu kaydı sunucudan çeker; müşteri, parça, toplam ve ödeme durumu görünür (admin)', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(isEmriService.getById).toHaveBeenCalledWith(1);
    expect(within(p).getByText('İş Emri #101')).toBeInTheDocument();
    expect(within(p).getByText('Kadıköy')).toBeInTheDocument();
    expect(within(p).getByText('Fren balatası')).toBeInTheDocument();
    expect(within(p).getByText('Acil')).toBeInTheDocument();
    expect(within(p).getByText('Nakit')).toBeInTheDocument();
    // fiyat 600, maliyet 2 x 150 = 300, kâr 300
    expect(yazi('Toplam: ₺600')).toBeInTheDocument();
    expect(yazi('Maliyet: ₺300')).toBeInTheDocument();
    expect(yazi('Kâr: ₺300')).toBeInTheDocument();
    // ödeme: toplam 1500, kalan 500 -> ödenen 1000
    expect(within(p).getByText('Kalan Ödeme')).toBeInTheDocument();
    expect(within(p).getByText('Toplam Tutar').nextElementSibling).toHaveTextContent('₺1.500');
    expect(within(p).getByText('Ödenen').nextElementSibling).toHaveTextContent('₺1.000');
    expect(within(p).getByText('Kalan Borç').nextElementSibling).toHaveTextContent('₺500');
  });

  test('personel: parça kârı ve toplam kâr kutusu görünmez', async () => {
    const { user } = await ekranAc({ rol: 'personel' });
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(yazi('Toplam: ₺600')).toBeInTheDocument();
    expect(yazi('Maliyet: ₺300')).toBeInTheDocument();
    expect(screen.queryByText('Kâr: ₺300')).not.toBeInTheDocument();
    expect(within(p).queryByRole('columnheader', { name: 'Kâr' })).not.toBeInTheDocument();
  });

  test('kalan ödeme yoksa "Ödeme Tamamlandı" yazar', async () => {
    const { user } = await ekranAc();
    vi.mocked(isEmriService.getById).mockResolvedValue({ data: { ...DETAY_A, kalan_odeme: 0 } } as never);
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Ödeme Tamamlandı')).toBeInTheDocument();
    expect(within(p).getByText('Kalan Borç').nextElementSibling).toHaveTextContent('Tamamlandı');
  });

  test('Kapat ikonu pencereyi kapatır; Düzenle detayı kapatıp düzenleme formunu açar', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'VisibilityIcon'));
    let p = await screen.findByRole('dialog');
    await user.click(ikon(p, 'CloseIcon'));
    await bekleDialogKapanana();

    await user.click(ikon(satir(/Ayşe Yılmaz/), 'VisibilityIcon'));
    p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('button', { name: 'Düzenle' }));
    expect(await screen.findByText('İş Emri Düzenle')).toBeInTheDocument();
    expect(alan('Ad Soyad *')).toHaveValue('Ayşe Yılmaz');
  });

  test('Yazdır düğmesi yeni pencerede fişi yazar ve yazdırır', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('button', { name: 'Yazdır' }));
    expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=900,height=700');
    expect(win.document.write).toHaveBeenCalledTimes(1);
    expect(vi.mocked(win.document.write).mock.calls[0][0]).toContain('Ayşe Yılmaz');
    expect(win.print).toHaveBeenCalled();
  });

  test('pop-up engellenirse yazdırma uyarı verir', async () => {
    const { user } = await ekranAc();
    vi.mocked(window.open).mockReturnValue(null);
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('button', { name: 'Yazdır' }));
    expect(window.alert).toHaveBeenCalledWith('Yazdırma penceresi açılamadı. Tarayıcı pop-up engelleyicisini kapatın.');
  });

  test('listedeki yazıcı ikonu kaydı çekip yazdırır', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'PrintIcon'));
    await waitFor(() => expect(win.print).toHaveBeenCalled());
    expect(isEmriService.getById).toHaveBeenCalledWith(1);
  });

  test('sayfa konumunda openDetailId varsa o kayıt otomatik açılır', async () => {
    mockLocation = { pathname: '/is-emirleri', state: { openDetailId: 1 } };
    await ekranAc({ bekleme: true });
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('İş Emri #101')).toBeInTheDocument();
    expect(isEmriService.getById).toHaveBeenCalledWith(1);
    expect(mockNavigate).toHaveBeenCalledWith('/is-emirleri', { replace: true, state: {} }); // durum temizlenir
  });
});

describe('İş Emirleri: servis QR etiketi', () => {
  test('QR ikonu token ister, QR üretir ve etiketi yeni pencerede yazdırır', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'QrCode2Icon'));
    await waitFor(() => expect(win.document.write).toHaveBeenCalled());
    expect(servisGecmisiService.getQrToken).toHaveBeenCalledWith('34ABC123');
    expect(QRCode.toDataURL).toHaveBeenCalledWith(`${window.location.origin}/s/tok123`, { margin: 1, width: 400, errorCorrectionLevel: 'M' });
    const html = vi.mocked(win.document.write).mock.calls[0][0] as string;
    expect(html).toContain('KAYNAR MOTOR');
    expect(html).toContain('34ABC123');
    expect(html).toContain('data:image/png;base64,AAA');
    expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=420,height=340');
  });

  test('token alınamazsa sunucu mesajı uyarı olur', async () => {
    const { user } = await ekranAc();
    vi.mocked(servisGecmisiService.getQrToken).mockRejectedValue({ response: { data: { message: 'Yetkiniz yok' } } });
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'QrCode2Icon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Yetkiniz yok'));
    expect(win.document.write).not.toHaveBeenCalled();
  });
});

// ---- Form penceresi ----------------------------------------------------------------------------------------------
const BOS_YUK = {
  musteri_ad_soyad: 'Test Müşteri',
  telefon: '',
  adres: '',
  km: '',
  marka: '',
  model_tip: '',
  plaka: '',
  tahmini_teslim_tarihi: '',
  tahmini_toplam_ucret: '',
  ariza_sikayetler: '',
  aciklama: '',
  odeme_detaylari: '',
  durum: 'beklemede',
  teslim_alan_ad_soyad: '',
  teslim_eden_teknisyen: '',
  teslim_tarihi: '',
  kalan_odeme: 0,
  parcalar: [],
};
const yeniAc = async (user: Kullanim) => {
  await user.click(screen.getByRole('button', { name: 'Yeni İş Emri' }));
  return screen.findByRole('dialog');
};

describe('İş Emirleri: yeni iş emri formu', () => {
  test('ad soyad boşsa "Ad Soyad zorunlu" der ve kaydetmez', async () => {
    const { user } = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni İş Emri')).toBeInTheDocument();
    expect(within(p).getByText('Henüz parça eklenmedi')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Ad Soyad zorunlu')).toBeInTheDocument();
    expect(isEmriService.create).not.toHaveBeenCalled();
  });

  test('yalnızca ad soyadla kaydedilir: yük biçimi, pencere kapanır, liste yenilenir', async () => {
    const { user } = await ekranAc();
    const cagri = vi.mocked(isEmriService.getAll).mock.calls.length;
    const p = await yeniAc(user);
    await user.type(alan('Ad Soyad *'), 'Test Müşteri');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(isEmriService.create).toHaveBeenCalledWith(BOS_YUK));
    expect(vi.mocked(isEmriService.create).mock.calls[0][0]).not.toHaveProperty('odeme_tamamlandi');
    await bekleDialogKapanana();
    await waitFor(() => expect(vi.mocked(isEmriService.getAll).mock.calls.length).toBe(cagri + 1));
  });

  test('plaka büyük harfe çevrilir; araç ve arıza alanları yüke girer', async () => {
    const { user } = await ekranAc();
    const p = await yeniAc(user);
    await user.type(alan('Ad Soyad *'), 'Test Müşteri');
    await user.type(alan('Plaka'), '34abc12');
    await user.type(alan('Marka'), 'Honda');
    await user.type(alan('Arıza / Şikayetler'), 'Ses');
    expect(alan('Plaka')).toHaveValue('34ABC12');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(isEmriService.create).toHaveBeenCalled());
    expect(vi.mocked(isEmriService.create).mock.calls[0][0]).toMatchObject({ plaka: '34ABC12', marka: 'Honda', ariza_sikayetler: 'Ses' });
  });

  test('sunucu hatasında mesaj pencerede gösterilir, pencere açık kalır', async () => {
    const { user } = await ekranAc();
    vi.mocked(isEmriService.create).mockRejectedValue({ response: { data: { message: 'Fiş no çakıştı' } } });
    const p = await yeniAc(user);
    await user.type(alan('Ad Soyad *'), 'Test Müşteri');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Fiş no çakıştı')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('İptal formu kapatır; yeniden açılınca alanlar boştur', async () => {
    const { user } = await ekranAc();
    let p = await yeniAc(user);
    await user.type(alan('Ad Soyad *'), 'Yarım kalan');
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await bekleDialogKapanana();
    p = await yeniAc(user);
    expect(alan('Ad Soyad *')).toHaveValue('');
    expect(isEmriService.create).not.toHaveBeenCalled();
  });

  test('"Ödeme Tamamlandı" kaldırılınca kalan ödeme alanı çıkar ve yüke girer; Teslim bölümü yalnızca düzenlemede', async () => {
    const { user } = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).queryByText(/Teslim Bilgileri/)).not.toBeInTheDocument();
    expect(within(p).queryByLabelText('Kalan Ödeme (₺)')).not.toBeInTheDocument();
    await user.click(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' }));
    expect(within(p).getByText('Bu kayıt Veresiye sayfasında listelenecektir.')).toBeInTheDocument();
    await user.type(alan('Kalan Ödeme (₺)'), '250');
    await user.type(alan('Ad Soyad *'), 'Test Müşteri');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(isEmriService.create).toHaveBeenCalled());
    expect((vi.mocked(isEmriService.create).mock.calls[0][0] as Record<string, unknown>).kalan_odeme).toBe('250');
  });

  test('ödeme tamamlandıya geri dönülürse kalan ödeme sıfırlanır', async () => {
    const { user } = await ekranAc();
    const p = await yeniAc(user);
    const kutu = within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' });
    await user.click(kutu);
    await user.type(alan('Kalan Ödeme (₺)'), '250');
    await user.click(kutu);
    await user.type(alan('Ad Soyad *'), 'Test Müşteri');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(isEmriService.create).toHaveBeenCalled());
    expect((vi.mocked(isEmriService.create).mock.calls[0][0] as Record<string, unknown>).kalan_odeme).toBe(0);
  });
});

describe('İş Emirleri: formda parça ekleme', () => {
  test('stok araması seçeneği listeler; seçilince alanlar dolar, eklenince tabloya ve yüke girer', async () => {
    const { user } = await ekranAc();
    const p = await yeniAc(user);
    await user.type(within(p).getByRole('combobox', { name: /Takılan Parça/ }), 'fre');
    const secenek = await screen.findByText('Fren Balata');
    expect(aksesuarStokService.search).toHaveBeenLastCalledWith('fre');
    expect(yedekParcaStokService.search).toHaveBeenLastCalledWith('fre');
    expect(screen.getByText('Aksesuar Stok')).toBeInTheDocument(); // grup başlığı
    expect(screen.getByText('Kod: AK-1 • Stok: 5 • Satış: ₺250')).toBeInTheDocument();
    await user.click(secenek);
    expect(yazi('Stok kodu: AK-1')).toBeInTheDocument();
    expect(alan('Satış Fiyatı (₺)')).toHaveValue(250);
    expect(alan('Maliyet Fiyatı (₺)')).toHaveValue(150);

    await user.click(within(p).getByRole('button', { name: 'Parça Ekle' }));
    expect(within(p).getByText('1 parça')).toBeInTheDocument();
    expect(hucreler(within(p).getByRole('row', { name: /Fren Balata/ }))).toEqual(['Fren Balata', '1', '₺250', '₺150', '₺100', '']);

    await user.type(alan('Ad Soyad *'), 'Test Müşteri');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(isEmriService.create).toHaveBeenCalled());
    expect((vi.mocked(isEmriService.create).mock.calls[0][0] as Record<string, unknown>).parcalar).toEqual([
      { parca_kodu: 'AK-1', takilan_parca: 'Fren Balata', adet: 1, birim_fiyat: 250, maliyet: 150 },
    ]);
  });

  test('elle girilen işçilik: adet x fiyat satırı hesaplanır; parça silinebilir; adsız parça eklenmez', async () => {
    const { user } = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: 'Parça Ekle' }));
    expect(within(p).getByText('Henüz parça eklenmedi')).toBeInTheDocument(); // adsız parça eklenmedi

    await user.type(within(p).getByRole('combobox', { name: /Takılan Parça/ }), 'İşçilik');
    await user.clear(alan('Adet'));
    await user.type(alan('Adet'), '2');
    await user.clear(alan('Satış Fiyatı (₺)'));
    await user.type(alan('Satış Fiyatı (₺)'), '300');
    await user.click(within(p).getByRole('button', { name: 'Parça Ekle' }));
    expect(hucreler(within(p).getByRole('row', { name: /İşçilik/ }))).toEqual(['İşçilik', '2', '₺600', '₺0', '₺600', '']);
    expect(alan('Adet')).toHaveValue(1); // ekleme sonrası giriş alanları sıfırlanır

    await user.click(ikon(within(p).getByRole('row', { name: /İşçilik/ }), 'CloseIcon'));
    expect(within(p).getByText('Henüz parça eklenmedi')).toBeInTheDocument();
  });

  test('barkod + Enter: 9 ile başlayan kod önce yedek parça stokunda aranır', async () => {
    const { user } = await ekranAc();
    vi.mocked(yedekParcaStokService.getByBarkod).mockResolvedValue({
      data: { stok_kodu: '9123456', stok_adi: 'Zincir', satis_fiyati: 400, alis_fiyati: 250 },
    } as never);
    const p = await yeniAc(user);
    await user.type(within(p).getByRole('combobox', { name: /Takılan Parça/ }), '9123456{Enter}');
    await waitFor(() => expect(yazi('Stok kodu: 9123456')).toBeInTheDocument());
    expect(yedekParcaStokService.getByBarkod).toHaveBeenCalledWith('9123456');
    expect(aksesuarStokService.getByBarkod).not.toHaveBeenCalled();
  });

  test('barkod + Enter: başka kodlarda önce aksesuar stoku, bulunamazsa yedek parça denenir', async () => {
    const { user } = await ekranAc();
    vi.mocked(yedekParcaStokService.getByBarkod).mockResolvedValue({
      data: { stok_kodu: '8001', stok_adi: 'Bujisi', satis_fiyati: 90, alis_fiyati: 50 },
    } as never);
    const p = await yeniAc(user);
    await user.type(within(p).getByRole('combobox', { name: /Takılan Parça/ }), '8001{Enter}');
    await waitFor(() => expect(yazi('Stok kodu: 8001')).toBeInTheDocument());
    expect(aksesuarStokService.getByBarkod).toHaveBeenCalledWith('8001');
    expect(yedekParcaStokService.getByBarkod).toHaveBeenCalledWith('8001');
  });
});

describe('İş Emirleri: formda müşteri eşleştirme', () => {
  test('10+ haneli telefon yazılınca kayıtlı müşterinin adı ve adresi boş alanlara dolar', async () => {
    const { user } = await ekranAc();
    vi.mocked(musteriService.searchByPhone).mockResolvedValue({ data: { ad_soyad: 'Ayşe Yılmaz', adres: 'Kadıköy' } } as never);
    await yeniAc(user);
    await user.type(alan('Telefon'), '05551112233');
    await waitFor(() => expect(alan('Ad Soyad *')).toHaveValue('Ayşe Yılmaz'));
    expect(alan('Adres')).toHaveValue('Kadıköy');
    expect(musteriService.searchByPhone).toHaveBeenCalledWith('05551112233');
  });

  test('dolu ad soyad ezilmez', async () => {
    const { user } = await ekranAc();
    vi.mocked(musteriService.searchByPhone).mockResolvedValue({ data: { ad_soyad: 'Başka Kişi', adres: 'Kadıköy' } } as never);
    await yeniAc(user);
    await user.type(alan('Ad Soyad *'), 'Elle Yazılan');
    await user.type(alan('Telefon'), '05551112233');
    await waitFor(() => expect(alan('Adres')).toHaveValue('Kadıköy'));
    expect(alan('Ad Soyad *')).toHaveValue('Elle Yazılan');
  });

  test('telefon yazarken öneri listesi çıkar; öneriye tıklamak müşteriyi forma doldurur', async () => {
    const { user } = await ekranAc();
    vi.mocked(musteriService.search).mockResolvedValue({ data: [{ id: 5, telefon: '05559998877', ad_soyad: 'Mehmet Aksoy', adres: 'Üsküdar' }] } as never);
    await yeniAc(user);
    await user.type(alan('Telefon'), '05');
    const oneri = await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === '05559998877 - Mehmet Aksoy');
    await user.click(oneri);
    expect(alan('Ad Soyad *')).toHaveValue('Mehmet Aksoy');
    expect(alan('Adres')).toHaveValue('Üsküdar');
    expect(screen.queryByText('05559998877 - Mehmet Aksoy', { exact: false })).not.toBeInTheDocument();
  });
});

describe('İş Emirleri: düzenleme', () => {
  test('düzenle ikonu kaydı yükler; alanlar, parçalar, kalan ödeme ve teslim bölümü dolu gelir', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(isEmriService.getById).toHaveBeenCalledWith(1);
    expect(within(p).getByText('İş Emri Düzenle')).toBeInTheDocument();
    expect(alan('Ad Soyad *')).toHaveValue('Ayşe Yılmaz');
    expect(alan('Telefon')).toHaveValue('05551112233');
    expect(alan('Plaka')).toHaveValue('34ABC123');
    expect(alan('Tahmini Teslim')).toHaveValue('2026-10-20');
    expect(within(p).getByText('1 parça')).toBeInTheDocument();
    expect(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' })).not.toBeChecked(); // kalan 500 var
    expect(alan('Kalan Ödeme (₺)')).toHaveValue(500);
    expect(within(p).getByText(/Teslim Bilgileri/)).toBeInTheDocument();
    expect(within(p).getByRole('button', { name: 'Güncelle' })).toBeInTheDocument();
  });

  test('Güncelle update çağırır (yük: odeme_tamamlandi yok, parçalar dahil) ve pencereyi kapatır', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    await user.type(alan('Marka'), ' X');
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(isEmriService.update).toHaveBeenCalled());
    const [id, yuk] = vi.mocked(isEmriService.update).mock.calls[0];
    expect(id).toBe(1);
    expect(yuk).not.toHaveProperty('odeme_tamamlandi');
    expect(yuk).toMatchObject({ marka: 'Honda X', kalan_odeme: 500, musteri_ad_soyad: 'Ayşe Yılmaz' });
    expect((yuk as Record<string, unknown>).parcalar).toEqual(DETAY_A.parcalar);
    expect(isEmriService.create).not.toHaveBeenCalled();
    await bekleDialogKapanana();
  });

  test('veritabanından "0.00" (metin) gelen kalan ödeme, ödendi sayılır ve 0 (sayı) olarak gönderilir', async () => {
    const { user } = await ekranAc();
    vi.mocked(isEmriService.getById).mockResolvedValue({ data: { ...DETAY_A, kalan_odeme: '0.00' } } as never);
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' })).toBeChecked();
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(isEmriService.update).toHaveBeenCalled());
    expect((vi.mocked(isEmriService.update).mock.calls[0][1] as Record<string, unknown>).kalan_odeme).toBe(0);
  });

  test('teslim bölümünde personel listesi sunucudan gelir', async () => {
    const { user } = await ekranAc();
    await user.click(ikon(satir(/Ayşe Yılmaz/), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('combobox', { name: 'Teslim Alan' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Seçiniz', 'Usta Mehmet', 'Usta Ali']);
  });
});

describe('İş Emirleri: mobil görünüm', () => {
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

  test('tablo yerine kart listesi; kartta kâr yalnızca admin için; karta dokunmak detayı açar', async () => {
    const { user } = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(yazi('Kâr: ₺600')).toBeInTheDocument();
    await user.click(screen.getByText('Ayşe Yılmaz'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('İş Emri #101')).toBeInTheDocument();
  });

  test('personel kartında kâr yok; liste boşsa bilgi mesajı', async () => {
    await ekranAc({ rol: 'personel' });
    expect(screen.queryByText(/Kâr:/)).not.toBeInTheDocument();
  });

  test('boş liste: "Kayıt bulunamadı" bilgi kutusu', async () => {
    await ekranAc({ liste: [], bekleme: true });
    expect(await screen.findByText('Kayıt bulunamadı')).toBeInTheDocument();
  });
});
