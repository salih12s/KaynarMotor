/*
 * Storefront (herkese açık mağaza) için KARAKTERİZASYON testleri: giriş ekranı, kategori seçimi, Sıfır/İkinci El seçimi, filtreler,
 * arama, hizmet sayfası, taksit hesabı, mobil menü ve detaya geçiş/geri dönüş durumu. API ve yönlendirme sahte (mock).
 * Filtre değişince liste 250 ms gecikmeyle (debounce) yüklenir: testler gerçek zamanlayıcıyla bekler.
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Storefront from './Storefront';
import { vitrinService } from '../vitrinApi';
import { hesaplaTaksit, fmtTL } from '../../taksit/TaksitHesaplama';

jest.mock('../vitrinApi', () => ({
  vitrinService: {
    getAll: jest.fn(), getIletisim: jest.fn(), getSegmentler: jest.fn(), getMarkalar: jest.fn(), gorselUrl: jest.fn(), iletisimGorselUrl: jest.fn(),
  },
}));
// react-router-dom v7'nin "exports" alanını CRA'nın Jest 27'si okuyamaz: yönlendirme kancaları sahte
let mockLocation = { pathname: '/', state: null };
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => mockLocation }), { virtual: true });

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const V1 = { id: 1, baslik: 'NMAX Fırsat', marka: 'Yamaha', model: 'NMAX', yil: 2021, kategori: 'motor', motor_durumu: 'ikinci_el', fiyat: 150000, km: 12000, segment: 'Scooter', motor_cc: 155, kapak_gorsel_id: 11 };
const V2 = { id: 2, baslik: 'PCX Sıfır', marka: 'Honda', model: 'PCX', yil: 2024, kategori: 'motor', motor_durumu: 'sifir', fiyat: 210000, segment: 'Scooter', motor_cc: 125 };
const V3 = { id: 3, baslik: 'Chopper Klasik', marka: 'Kawasaki', kategori: 'motor', motor_durumu: 'ikinci_el', fiyat: 99000, km: 30000, segment: 'Chopper', motor_cc: 250 };
const AKS = { id: 20, baslik: 'Kask LS2', kategori: 'aksesuar', fiyat: 2500 };
const ILETISIM = [
  { kategori: 'motor', personel_adi: 'Satış Ahmet', telefon: '05320000000' },
  { kategori: 'bakim_servis', baslik: 'Bakım Atölyesi', aciklama: 'Randevu alın', personel_adi: 'Usta Ali', telefon: '05550000000', gorsel_var: false },
];

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
const kur = ({ getAll } = {}) => {
  vitrinService.getAll.mockImplementation(getAll || (async (p) => {
    if (p.kategori === 'motor') return { data: [V1, V2, V3].filter((v) => !p.durum || v.motor_durumu === p.durum).filter((v) => !p.marka || v.marka === p.marka).filter((v) => !p.segment || v.segment === p.segment) };
    if (p.kategori === 'aksesuar') return { data: [AKS] };
    return { data: [] };
  }));
  vitrinService.getIletisim.mockResolvedValue({ data: ILETISIM });
  vitrinService.getSegmentler.mockResolvedValue({ data: [{ ad: 'Scooter' }, { ad: 'Chopper' }] });
  vitrinService.getMarkalar.mockImplementation(async (durum) => ({ data: (durum === 'sifir' ? [{ marka: 'Honda' }] : [{ marka: 'Kawasaki' }, { marka: 'Yamaha' }]) }));
  vitrinService.gorselUrl.mockImplementation((id) => `/g/${id}`);
  vitrinService.iletisimGorselUrl.mockImplementation((k) => `/ig/${k}`);
};

const ac = async (konum = null, secenek = {}) => {
  mockLocation = { pathname: '/', state: konum };
  kur(secenek);
  const user = userEvent.setup();
  render(<Storefront />);
  return user;
};
const kategoriKarti = (ad) => screen.getByRole('button', { name: new RegExp(ad) });
const motorListesineGir = async (user, durum = 'İkinci el motorlar') => {
  await user.click(kategoriKarti('Motor Satışı'));
  await user.click(await screen.findByRole('button', { name: new RegExp(durum) }));
  await screen.findByRole('heading', { name: durum });
};
const sonCagri = () => vitrinService.getAll.mock.calls[vitrinService.getAll.mock.calls.length - 1][0];

beforeEach(() => {
  window.scrollTo = jest.fn();
  window.matchMedia = (q) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { delete window.matchMedia; jest.restoreAllMocks(); });

// ---- Giriş ekranı ------------------------------------------------------------------------------------------------
describe('Storefront: giriş ekranı', () => {
  test('başlık, 6 kategori kartı, taksit ve servis düğmeleri; giriş ekranında ilan yüklenmez', async () => {
    await ac();
    expect(screen.getByRole('heading', { name: /İhtiyacınız olan her şey tek çatı altında/ })).toBeInTheDocument();
    for (const ad of ['Motor Satışı', 'Aksesuar', 'Yedek Parça', 'Bakım / Servis', 'Nakliye / Yol Kurtarma', 'Araç Sigortası']) {
      expect(kategoriKarti(ad)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Taksit Hesapla' })).toBeInTheDocument();
    expect(document.querySelector('video source')).toHaveAttribute('src', '/KaynarMotorYeniVideo.mp4');
    expect(vitrinService.getAll).not.toHaveBeenCalled();
  });

  test('"Servise Git" giriş sayfasına yönlendirir', async () => {
    const user = await ac();
    await user.click(screen.getByRole('button', { name: 'Servise Git' }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('taksit hesaplama: nakit fiyattan 3/6/9/12 ay tablosu; peşinat kalan tutarı düşürür; peşinat >= nakit uyarı verir', async () => {
    const user = await ac();
    await user.click(screen.getByRole('button', { name: 'Taksit Hesapla' }));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Taksit Hesaplama')).toBeInTheDocument();
    await user.type(within(p).getByLabelText('Nakit Fiyat'), '100000');
    expect(within(p).getByLabelText('Nakit Fiyat')).toHaveValue('100.000'); // para biçimi
    const sonuc = hesaplaTaksit(100000);
    expect(within(p).getAllByText(/ Ay$/).map((x) => x.textContent)).toEqual(['3 Ay', '6 Ay', '9 Ay', '12 Ay']);
    expect(within(p).getByText(fmtTL(sonuc[0].toplam))).toBeInTheDocument();
    expect(within(p).getByText('111.111 ₺')).toBeInTheDocument(); // 100000 / 0.90
    await user.type(within(p).getByLabelText('Peşinat / Peşin Ödeme'), '40000');
    expect(within(p).getByText('Kalan tutar: 60.000 ₺')).toBeInTheDocument();
    expect(within(p).getByText(fmtTL(hesaplaTaksit(100000, 40000)[3].aylik))).toBeInTheDocument();
    await user.clear(within(p).getByLabelText('Peşinat / Peşin Ödeme')); await user.type(within(p).getByLabelText('Peşinat / Peşin Ödeme'), '100000');
    expect(within(p).getByText(/Peşinat tutarı nakit fiyata eşit veya daha büyük/)).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Temizle' }));
    expect(within(p).getByLabelText('Nakit Fiyat')).toHaveValue('');
  });
});

// ---- Motor akışı -------------------------------------------------------------------------------------------------
describe('Storefront: motor akışı', () => {
  test('motor kartı önce Sıfır / İkinci El seçtirir; karolar her türün ilan sayısını gösterir', async () => {
    const user = await ac();
    await user.click(kategoriKarti('Motor Satışı'));
    expect(await screen.findByRole('heading', { name: 'Nasıl bir motor arıyorsunuz?' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Sıfır motorlar.*1 ilanı gör/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /İkinci el motorlar.*2 ilanı gör/ })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test('tür seçilince yalnızca o türün ilanları 250 ms sonra istenir ve listelenir', async () => {
    const user = await ac();
    await motorListesineGir(user);
    expect(await screen.findByRole('button', { name: /NMAX Fırsat, 150\.000 ₺/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chopper Klasik/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PCX Sıfır/ })).not.toBeInTheDocument();
    expect(sonCagri()).toEqual({ kategori: 'motor', durum: 'ikinci_el' });
    expect(screen.getByText('2 ilan')).toBeInTheDocument();
    expect(screen.getAllByText('Sorularınız için arayın').length).toBeGreaterThan(0); // masaüstü başlığı + dar ekran bölümü (CSS ile gizlenir)
    expect(screen.getAllByText('Satış Ahmet').length).toBeGreaterThan(0);
  });

  test('marka, segment ve cc süzgeçleri sunucuya parametre olarak gider; Temizle hepsini sıfırlar', async () => {
    const user = await ac();
    await motorListesineGir(user);
    await screen.findByRole('button', { name: /NMAX Fırsat/ });
    const markaGrubu = await screen.findByRole('group', { name: 'Marka' });
    await user.click(within(markaGrubu).getByRole('button', { name: 'Yamaha' }));
    await waitFor(() => expect(sonCagri()).toEqual({ kategori: 'motor', durum: 'ikinci_el', marka: 'Yamaha' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Chopper Klasik/ })).not.toBeInTheDocument());
    await user.click(within(screen.getByRole('group', { name: 'Segment' })).getByRole('button', { name: 'Scooter' }));
    await waitFor(() => expect(sonCagri()).toMatchObject({ marka: 'Yamaha', segment: 'Scooter' }));
    await user.type(screen.getByLabelText('En fazla cc'), '155');
    await waitFor(() => expect(sonCagri()).toMatchObject({ cc_max: '155' }));
    await user.type(screen.getByLabelText('En fazla km'), '20000');
    await waitFor(() => expect(sonCagri()).toMatchObject({ km_max: '20000' }));
    await user.click(screen.getByRole('button', { name: 'Temizle' }));
    await waitFor(() => expect(sonCagri()).toEqual({ kategori: 'motor', durum: 'ikinci_el' }));
  });

  test('sıfır motorlarda "En fazla km" alanı yoktur; tür değişince marka ve km süzgeçleri sıfırlanır', async () => {
    const user = await ac();
    await motorListesineGir(user, 'İkinci el motorlar');
    await screen.findByRole('button', { name: /NMAX Fırsat/ });
    await user.type(screen.getByLabelText('En fazla km'), '20000');
    await user.click(within(screen.getByRole('group', { name: 'Durum' })).getByRole('button', { name: 'Sıfır' }));
    await screen.findByRole('heading', { name: 'Sıfır motorlar' });
    await waitFor(() => expect(sonCagri()).toEqual({ kategori: 'motor', durum: 'sifir' }));
    expect(screen.queryByLabelText('En fazla km')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /PCX Sıfır/ })).toBeInTheDocument();
  });

  test('arama yüklenen liste üzerinde anında süzer (sunucuya gitmez); eşleşme yoksa mesaj ve temizle düğmesi', async () => {
    const user = await ac();
    await motorListesineGir(user);
    await screen.findByRole('button', { name: /NMAX Fırsat/ });
    const cagri = vitrinService.getAll.mock.calls.length;
    await user.type(screen.getByLabelText('İlan ara'), 'kawasaki');
    expect(screen.queryByRole('button', { name: /NMAX Fırsat/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chopper Klasik/ })).toBeInTheDocument();
    expect(screen.getByText('"kawasaki" için 1 ilan')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('İlan ara')); await user.type(screen.getByLabelText('İlan ara'), 'zzz');
    expect(screen.getByText('"zzz" ile eşleşen ilan yok')).toBeInTheDocument();
    const temizleDugmeleri = screen.getAllByRole('button', { name: 'Aramayı temizle' }); // arama kutusundaki ikon + boş sonuç düğmesi
    expect(temizleDugmeleri).toHaveLength(2);
    await user.click(temizleDugmeleri[1]);
    expect(screen.getByRole('button', { name: /NMAX Fırsat/ })).toBeInTheDocument();
    expect(vitrinService.getAll.mock.calls.length).toBe(cagri);
  });

  test('ilan yoksa / yükleme hatasında yönlendirici mesaj çıkar', async () => {
    const user = await ac(null, { getAll: async (p) => { if (p.kategori === 'motor' && !p.durum) return { data: [] }; throw new Error('ağ'); } });
    await user.click(kategoriKarti('Motor Satışı'));
    await user.click(await screen.findByRole('button', { name: /İkinci el motorlar/ }));
    expect(await screen.findByText('Şu an ikinci el motor ilanı yok')).toBeInTheDocument();
  });

  test('ilan kartına tıklamak detay sayfasına gider ve süzgeç durumunu geri dönüş için taşır', async () => {
    const user = await ac();
    await motorListesineGir(user);
    await user.click(within(await screen.findByRole('group', { name: 'Marka' })).getByRole('button', { name: 'Yamaha' }));
    await user.click(await screen.findByRole('button', { name: /NMAX Fırsat/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/ilan/1', { state: { storefront: { tab: 0, motorDurumu: 'ikinci_el', marka: 'Yamaha', segment: '', ccMax: '', kmMax: '', q: '' } } });
  });

  test('detaydan geri dönüşte giriş ekranı atlanır ve süzgeçler geri gelir', async () => {
    await ac({ storefront: { tab: 0, motorDurumu: 'ikinci_el', marka: 'Yamaha', segment: '', ccMax: '', kmMax: '', q: '' } });
    expect(await screen.findByRole('button', { name: /NMAX Fırsat/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /İhtiyacınız olan her şey/ })).not.toBeInTheDocument();
    expect(sonCagri()).toEqual({ kategori: 'motor', durum: 'ikinci_el', marka: 'Yamaha' });
    expect(within(screen.getByRole('group', { name: 'Marka' })).getByRole('button', { name: 'Yamaha' })).toHaveAttribute('aria-pressed', 'true');
  });
});

// ---- Diğer kategoriler ve gezinme --------------------------------------------------------------------------------
describe('Storefront: diğer kategoriler ve gezinme', () => {
  test('aksesuar kategorisi doğrudan ilan listesini açar (tür seçimi yok, motor filtreleri yok)', async () => {
    const user = await ac();
    await user.click(kategoriKarti('Aksesuar'));
    expect(await screen.findByRole('button', { name: /Kask LS2, 2\.500 ₺/ })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Marka' })).not.toBeInTheDocument();
    expect(sonCagri()).toEqual({ kategori: 'aksesuar' });
  });

  test('hizmet kategorisi (bakım) ilan yerine başlık, açıklama ve kişi düğmeleri gösterir', async () => {
    const user = await ac();
    await user.click(kategoriKarti('Bakım / Servis'));
    expect(await screen.findByRole('heading', { name: 'Bakım Atölyesi' })).toBeInTheDocument();
    expect(screen.getByText('Randevu alın')).toBeInTheDocument();
    expect(screen.getByText('Usta Ali')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Marka' })).not.toBeInTheDocument();
    expect(vitrinService.getAll).not.toHaveBeenCalled();
  });

  test('üst menüdeki kategoriler arasında geçilir; "Ana Sayfa" giriş ekranına döner', async () => {
    const user = await ac();
    await user.click(kategoriKarti('Aksesuar'));
    await screen.findByRole('button', { name: /Kask LS2/ });
    const ust = within(screen.getByRole('banner'));
    await user.click(ust.getByRole('button', { name: 'Motor Satışı' }));
    expect(await screen.findByRole('heading', { name: 'Nasıl bir motor arıyorsunuz?' })).toBeInTheDocument();
    await user.click(ust.getByRole('button', { name: 'Ana Sayfa' }));
    expect(await screen.findByRole('heading', { name: /İhtiyacınız olan her şey/ })).toBeInTheDocument();
  });
});

describe('Storefront: kategori değişince durum sıfırlanır', () => {
  test('seçilen tür, marka ve arama kategori değişince silinir: motora dönünce tür seçimi yeniden istenir', async () => {
    const user = await ac();
    await motorListesineGir(user);
    await user.type(await screen.findByLabelText('İlan ara'), 'kawasaki');
    const ust = within(screen.getByRole('banner'));
    await user.click(ust.getByRole('button', { name: 'Aksesuar' }));
    await screen.findByRole('button', { name: /Kask LS2/ });
    expect(screen.getByLabelText('İlan ara')).toHaveValue('');
    await user.click(ust.getByRole('button', { name: 'Motor Satışı' }));
    expect(await screen.findByRole('heading', { name: 'Nasıl bir motor arıyorsunuz?' })).toBeInTheDocument();
  });
});

describe('Storefront: mobil görünüm', () => {
  beforeEach(() => {
    window.matchMedia = (q) => ({ matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false });
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  test('hamburger menü kategorileri ve taksit hesaplamayı listeler; seçim menüyü kapatır', async () => {
    const user = await ac();
    await user.click(kategoriKarti('Aksesuar'));
    await screen.findByRole('button', { name: /Kask LS2/ });
    await user.click(screen.getByRole('button', { name: 'Menü' }));
    expect(await screen.findByText('Taksit Hesapla')).toBeInTheDocument();
    for (const ad of ['Ana Sayfa', 'Motor Satışı', 'Yedek Parça', 'Araç Sigortası']) expect(screen.getByRole('button', { name: ad })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yedek Parça' }));
    await waitFor(() => expect(sonCagri()).toEqual({ kategori: 'yedek_parca' }));
  });

  test('motor filtre paneli dar ekranda kapalıdır; "Filtrele" düğmesi açar ve seçili süzgeç sayısını gösterir', async () => {
    const user = await ac({ storefront: { tab: 0, motorDurumu: 'ikinci_el', marka: 'Yamaha', segment: 'Scooter', ccMax: '', kmMax: '', q: '' } });
    await screen.findByRole('button', { name: /NMAX Fırsat/ });
    const dugme = screen.getByRole('button', { name: 'Filtrele (2 seçili)' });
    expect(dugme).toHaveAttribute('aria-expanded', 'false');
    await user.click(dugme);
    expect(dugme).toHaveAttribute('aria-expanded', 'true');
  });
});
