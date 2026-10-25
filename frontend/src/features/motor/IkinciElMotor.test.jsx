/*
 * İkinci El Motor (satış kayıtları) sayfası için KARAKTERİZASYON testleri: ekranın bugün ne yaptığını kayda geçirir.
 * Öne çıkan kurallar: muhasebeci SALT OKUNUR görür (alım/satım/noter/kişi bilgisi var, kâr ve düzenleme yok); kâr yalnızca admin;
 * stoktaki bir motor plakasından seçilerek satışa çevrilir; Excel dışa aktarma. API, oturum, belge bölümü, yazdırma ve yönlendirme sahte.
 */
import React from 'react';
import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import { sorguluRender } from '../../shared/sorgu/sorguluRender';
import userEvent from '@testing-library/user-event';
import IkinciElMotor from './IkinciElMotor';
import { ikinciElMotorService } from './motorApi';
import { musteriService } from '../musteriler/musteriApi';
import { authService } from '../auth/authApi';
import { bekleyenBelgeleriYukle } from './SatisBelgeleri';
import { useAuth } from '../auth/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { plakaBicim } from '../../shared/ui';

vi.mock('./motorApi', () => ({
  ikinciElMotorService: { getAll: vi.fn(), getStats: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('../musteriler/musteriApi', () => ({ musteriService: { search: vi.fn(), searchByPhone: vi.fn() } }));
vi.mock('../auth/authApi', () => ({ authService: { getYatirimcilar: vi.fn() } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('react-to-print', () => ({ useReactToPrint: vi.fn() }));
vi.mock('./SatisBelgeleri', () => ({
  BelgeBolumu: ({ motorId }) => <div>BELGE-BOLUMU-{motorId}</div>,
  BekleyenBelgeler: ({ dosyalar, setDosyalar }) => <button onClick={() => setDosyalar([{ name: 'ruhsat.pdf' }])}>BELGE-EKLE ({dosyalar.length})</button>,
  bekleyenBelgeleriYukle: vi.fn(),
}));
// Yönlendirme kancaları sahte (Jest 27 zamanında react-router-dom v7'nin "exports" alanı okunamadığı için eklendi; sözleşme aynı kalsın diye korundu)
let mockLocation = { pathname: '/ikinci-el-motor', state: null };
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => mockLocation }));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const S1 = {
  id: 1,
  plaka: '34SAT111',
  marka: 'Honda',
  model: 'PCX',
  yil: 2020,
  km: 10000,
  durum: 'tamamlandi',
  alis_fiyati: 50000,
  satis_fiyati: 60000,
  noter_alis: 40000,
  noter_satis: 55000,
  masraflar: 1000,
  kar: 9000,
  satici_adi: 'Ali Veli',
  satici_tc: '111',
  alici_adi: 'Ahmet Alıcı',
  alici_tc: '999',
  alici_telefon: '0555',
  alici_adres: 'Kadıköy',
  tarih: '2026-09-01T12:00:00',
  satis_tarihi: '2026-10-05T12:00:00',
  odeme_sekli: 'nakit',
  fatura_kesildi: true,
  yevmiye_no: 'Y1',
  kalan_odeme: 0,
  komisyoncu_adi: 'Kom A',
  komisyoncu_telefon: '0532',
  komisyoncu_tutari: 500,
  aciklama: 'Temiz',
};
const S2 = {
  id: 2,
  plaka: '06SAT222',
  marka: 'Yamaha',
  model: 'NMAX',
  durum: 'tamamlandi',
  alis_fiyati: 70000,
  satis_fiyati: 80000,
  noter_alis: 0,
  noter_satis: 0,
  kar: 8000,
  alici_adi: 'Zeynep Z',
  satis_tarihi: '2026-09-20T12:00:00',
  kalan_odeme: '2500',
  yatirimci_id: 9,
};
const ST1 = {
  id: 3,
  plaka: '16STK333',
  marka: 'Suzuki',
  model: 'Burgman',
  yil: 2019,
  km: 5000,
  durum: 'stokta',
  alis_fiyati: 30000,
  noter_alis: 25000,
  satici_adi: 'Veli S',
  satici_tc: '222',
  tarih: '2026-09-10T12:00:00',
  yatirimci_id: 9,
  yatirimci_kar: '',
};
const ST2 = { id: 4, plaka: '41KAP444', marka: 'BMW', model: 'R', durum: 'kapora', tarih: '2026-09-11T12:00:00' };
const PERTE = { id: 5, plaka: '01PER555', marka: 'KTM', durum: 'perte' };
const HEPSI = [S2, ST1, S1, ST2, PERTE]; // sunucu sırası karışık
const STATS = { toplam_satis_tutari: 140000, toplam_kar: 17000 };

const ADMIN = { rol: 'admin' };
const MUHASEBE = { rol: 'muhasebeci' };
const SATIS = { rol: 'personel', motor_satis_yetkisi: true };
const YETKISIZ = { rol: 'personel' };

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
let yazdir;
let sonEkran; // son render sonucu (istemci ve unmount, yeniden açılış testi için)
const kur = ({ user = ADMIN, liste = HEPSI } = {}) => {
  useAuth.mockReturnValue({ user });
  ikinciElMotorService.getAll.mockResolvedValue({ data: liste });
  ikinciElMotorService.getStats.mockResolvedValue({ data: STATS });
  ikinciElMotorService.getById.mockImplementation(async (id) => ({ data: liste.find((x) => x.id === id) }));
  ikinciElMotorService.create.mockResolvedValue({ data: { id: 99 } });
  ikinciElMotorService.update.mockResolvedValue({ data: {} });
  ikinciElMotorService.delete.mockResolvedValue({ data: {} });
  musteriService.search.mockResolvedValue({ data: [{ id: 5, ad_soyad: 'Mehmet Aksoy', telefon: '0555', adres: 'Üsküdar' }] });
  musteriService.searchByPhone.mockResolvedValue({ data: null });
  authService.getYatirimcilar.mockResolvedValue({ data: [{ id: 9, ad_soyad: 'Yatırımcı Veli' }] });
  bekleyenBelgeleriYukle.mockResolvedValue([]);
  yazdir = vi.fn();
  useReactToPrint.mockReturnValue(yazdir);
};

const ekranAc = async (secenek = {}) => {
  kur(secenek);
  const user = userEvent.setup();
  sonEkran = sorguluRender(<IkinciElMotor />);
  if (!secenek.bekleme) await screen.findByText(plakaBicim('34SAT111'));
  return user;
};

const satir = (plaka) => screen.getByRole('row', { name: new RegExp(plakaBicim(plaka)) });
const ozet = (etiket) => within(screen.getByLabelText('Özet')).getByText(etiket).previousSibling.textContent;
const ozetYok = (etiket) => within(screen.getByLabelText('Özet')).queryByText(etiket);
const hucreler = (row) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent);
const basliklar = () => screen.getAllByRole('columnheader').map((h) => h.textContent);
const ikon = (kapsam, ad) => within(kapsam).getByTestId(ad);
const alan = (etiket) => screen.getByLabelText(etiket);
const plakalar = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent.replace(/\s/g, ''));
const bekleDialogKapanana = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

beforeEach(() => {
  mockLocation = { pathname: '/ikinci-el-motor', state: null };
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Rol matrisi ve liste ----------------------------------------------------------------------------------------
describe('İkinci El Motor: roller, liste ve süzgeçler', () => {
  test('admin: tüm sütunlar (alım ve kâr dahil), satış listesi tarihe göre yeniden eskiye; stoktaki motorlar listede yok', async () => {
    await ekranAc();
    expect(basliklar()).toEqual([
      'Plaka',
      'Marka / Model',
      'Yıl',
      'KM',
      'Alım',
      'Satış',
      'Noter Alış',
      'Noter Satış',
      'Kâr',
      'Alıcı',
      'Satış Tarihi',
      'İşlemler',
    ]);
    expect(plakalar()).toEqual(['34SAT111', '06SAT222']); // 05.10 -> 20.09; stokta/kapora/perte yok
    expect(hucreler(satir('34SAT111'))).toEqual([
      '34 SAT 111',
      'HondaPCX',
      '2020',
      '10.000',
      '50.000',
      '60.000',
      '40.000',
      '55.000',
      '9.000',
      'Ahmet Alıcı',
      '05.10.2026',
      '',
    ]);
    expect(screen.getByRole('button', { name: 'Motor Satış' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Excel'e Aktar" })).toBeInTheDocument();
    expect(screen.getAllByTestId('DeleteIcon')).toHaveLength(2);
  });

  test('istatistik çipleri: adet, satış tutarı ve (yalnızca admin) kâr', async () => {
    await ekranAc();
    expect(ozet('Toplam')).toBe('2');
    expect(ozet('Satış')).toBe('₺140.000');
    expect(ozet('Kâr')).toBe('₺17.000');
  });

  test('muhasebeci SALT OKUNUR: alım, noter ve alıcı bilgisi var; kâr, ekleme, düzenleme ve silme yok', async () => {
    await ekranAc({ user: MUHASEBE });
    expect(basliklar()).toEqual(['Plaka', 'Marka / Model', 'Yıl', 'KM', 'Alım', 'Satış', 'Noter Alış', 'Noter Satış', 'Alıcı', 'Satış Tarihi', 'İşlemler']);
    expect(ozetYok('Kâr')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Motor Satış' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('EditIcon')).toHaveLength(0);
    expect(screen.queryAllByTestId('DeleteIcon')).toHaveLength(0);
    expect(screen.getAllByTestId('VisibilityIcon')).toHaveLength(2);
  });

  test('motor satış yetkilisi: alım var, kâr yok; düzenler ama silemez', async () => {
    await ekranAc({ user: SATIS });
    expect(basliklar()).toContain('Alım');
    expect(basliklar()).not.toContain('Kâr');
    expect(screen.getAllByTestId('EditIcon')).toHaveLength(2);
    expect(screen.queryAllByTestId('DeleteIcon')).toHaveLength(0);
  });

  test('yetkisiz personel: alım sütunu yok (düzenleme düğmesi mevcut davranış olarak görünür)', async () => {
    await ekranAc({ user: YETKISIZ });
    expect(basliklar()).not.toContain('Alım (₺)');
    expect(basliklar()).not.toContain('Kâr (₺)');
    expect(screen.getAllByTestId('EditIcon')).toHaveLength(2);
  });

  test('arama plaka, marka, model, alıcı ve satıcı adında çalışır; tarih aralığı satış tarihine (yoksa alım tarihine) göre', async () => {
    const user = await ekranAc();
    const kutu = screen.getByPlaceholderText('Plaka, marka, model veya satıcı adı ile ara...');
    await user.type(kutu, 'zeynep');
    expect(plakalar()).toEqual(['06SAT222']);
    await user.clear(kutu);
    await user.type(kutu, 'ali veli');
    expect(plakalar()).toEqual(['34SAT111']);
    await user.clear(kutu);
    fireEvent.change(screen.getByLabelText('Başlangıç'), { target: { value: '2026-10-01' } });
    expect(plakalar()).toEqual(['34SAT111']);
    fireEvent.change(screen.getByLabelText('Başlangıç'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Bitiş'), { target: { value: '2026-09-30' } });
    expect(plakalar()).toEqual(['06SAT222']);
  });

  test('silme: onay, iptal ve hata', async () => {
    const user = await ekranAc();
    window.confirm.mockReturnValueOnce(false);
    await user.click(ikon(satir('06SAT222'), 'DeleteIcon'));
    expect(ikinciElMotorService.delete).not.toHaveBeenCalled();
    const cagri = ikinciElMotorService.getAll.mock.calls.length;
    const istatistikCagri = ikinciElMotorService.getStats.mock.calls.length;
    await user.click(ikon(satir('06SAT222'), 'DeleteIcon'));
    await waitFor(() => expect(ikinciElMotorService.delete).toHaveBeenCalledWith(2));
    await waitFor(() => expect(ikinciElMotorService.getAll.mock.calls.length).toBe(cagri + 1));
    await waitFor(() => expect(ikinciElMotorService.getStats.mock.calls.length).toBe(istatistikCagri + 1)); // sayaçlar da tazelenir
    ikinciElMotorService.delete.mockRejectedValue({ response: { data: { message: 'Bağlı kayıt' } } });
    await user.click(ikon(satir('06SAT222'), 'DeleteIcon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Bağlı kayıt'));
  });

  test('önbellek: sayfa kapatılıp yeniden açılınca liste ve istatistik yine istenir; yatırımcılar önbellekten gelir', async () => {
    await ekranAc();
    const { istemci, unmount } = sonEkran;
    const cagri = ikinciElMotorService.getAll.mock.calls.length;
    const istatistikCagri = ikinciElMotorService.getStats.mock.calls.length;
    unmount();
    sorguluRender(<IkinciElMotor />, { istemci });
    await waitFor(() => expect(ikinciElMotorService.getAll.mock.calls.length).toBe(cagri + 1));
    await waitFor(() => expect(ikinciElMotorService.getStats.mock.calls.length).toBe(istatistikCagri + 1));
    expect(authService.getYatirimcilar).toHaveBeenCalledTimes(1);
  });

  test('liste boşsa "Kayıt yok" satırı görünür', async () => {
    await ekranAc({ liste: [ST1], bekleme: true });
    expect(await screen.findByText('Kayıt yok')).toBeInTheDocument();
  });
});

// ---- Excel -------------------------------------------------------------------------------------------------------
describe('İkinci El Motor: Excel dışa aktarma', () => {
  const aktar = async (user) => {
    let blob;
    let dosyaAdi;
    global.URL.createObjectURL = vi.fn((b) => {
      blob = b;
      return 'blob:x';
    });
    global.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      dosyaAdi = this.download;
    });
    await user.click(screen.getByRole('button', { name: "Excel'e Aktar" }));
    const metin = await new Promise((coz) => {
      const r = new FileReader();
      r.onload = () => coz(r.result);
      r.readAsText(blob);
    });
    return { metin, dosyaAdi };
  };

  test('admin: kâr sütunu dahil, süzülmüş satırlar, yukarıdan aşağı tablo', async () => {
    const user = await ekranAc();
    const { metin, dosyaAdi } = await aktar(user);
    expect(dosyaAdi).toMatch(/^Motor_Satis_\d{4}-\d{2}-\d{2}\.xls$/);
    for (const t of ['Alım (₺)', 'Kâr (₺)', '34SAT111', '06SAT222', 'Ahmet Alıcı', '05.10.2026', '9.000']) expect(metin).toContain(t);
    expect(metin).not.toContain('16STK333');
  });

  test('muhasebeci: kâr sütunu ve değerleri dosyada yok; arama süzgeci dosyaya yansır', async () => {
    const user = await ekranAc({ user: MUHASEBE });
    await user.type(screen.getByPlaceholderText('Plaka, marka, model veya satıcı adı ile ara...'), 'zeynep');
    const { metin } = await aktar(user);
    expect(metin).not.toContain('Kâr (₺)');
    expect(metin).toContain('06SAT222');
    expect(metin).not.toContain('34SAT111');
  });

  test('yetkisiz personel: alım sütunu dosyada yok; HTML özel karakterleri kaçırılır', async () => {
    const user = await ekranAc({ user: YETKISIZ, liste: [{ ...S1, alici_adi: 'A & <B>' }] });
    const { metin } = await aktar(user);
    expect(metin).not.toContain('Alım (₺)');
    expect(metin).toContain('A &amp; &lt;B&gt;');
  });
});

// ---- Detay -------------------------------------------------------------------------------------------------------
describe('İkinci El Motor: detay penceresi', () => {
  test('admin: tüm bölümler, finansal kutular ve NET KÂR; belge bölümü var', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('34SAT111'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(ikinciElMotorService.getById).toHaveBeenCalledWith(1);
    expect(within(p).getByText('Motor Detay')).toBeInTheDocument();
    expect(within(p).getByText('Durum:').nextElementSibling).toHaveTextContent('Tamamlandı');
    expect(within(p).getByText('Fatura:').nextElementSibling).toHaveTextContent('Kesildi ✓');
    expect(within(p).getByText('Alış').nextElementSibling).toHaveTextContent('₺50.000');
    expect(within(p).getByText('Toplam Maliyet').nextElementSibling).toHaveTextContent('₺51.000'); // alış + masraf
    expect(within(p).getByText('NET KÂR').nextElementSibling).toHaveTextContent('₺9.000');
    expect(within(p).getByText('Ahmet Alıcı')).toBeInTheDocument();
    expect(within(p).getByText('Kalan Ödeme:').nextElementSibling).toHaveTextContent('Tamamlandı ✓');
    expect(within(p).getByText('Kom A')).toBeInTheDocument(); // komisyoncu bölümü
    expect(within(p).getByText('Temiz')).toBeInTheDocument();
    expect(within(p).getByText('BELGE-BOLUMU-1')).toBeInTheDocument();
  });

  test('muhasebeci: finansal kutular var ama NET KÂR ve belge bölümü yok', async () => {
    const user = await ekranAc({ user: MUHASEBE });
    await user.click(ikon(satir('34SAT111'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Noter Satış').nextElementSibling).toHaveTextContent('₺55.000');
    expect(within(p).queryByText('NET KÂR')).not.toBeInTheDocument();
    expect(within(p).queryByText(/BELGE-BOLUMU/)).not.toBeInTheDocument();
  });

  test('alım yetkisi olmayan personel: finansal bölüm hiç görünmez; kalan ödeme olan satışta tutar yazar', async () => {
    const user = await ekranAc({ user: YETKISIZ });
    await user.click(ikon(satir('06SAT222'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).queryByText(/Finansal Detaylar/)).not.toBeInTheDocument();
    expect(within(p).getByText('Kalan Ödeme:').nextElementSibling).toHaveTextContent('₺2.500');
  });

  test('Yazdır düğmesi yazdırma kancasını çağırır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('34SAT111'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('button', { name: 'Yazdır' }));
    expect(yazdir).toHaveBeenCalled();
  });

  test('konumda openDetailId varsa o kayıt otomatik açılır ve durum temizlenir', async () => {
    mockLocation = { pathname: '/ikinci-el-motor', state: { openDetailId: 1 } };
    await ekranAc({ bekleme: true });
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Motor Detay')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/ikinci-el-motor', { replace: true, state: {} });
  });
});

// ---- Satış formu -------------------------------------------------------------------------------------------------
describe('İkinci El Motor: satış formu', () => {
  const yeniAc = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Motor Satış' }));
    return screen.findByRole('dialog');
  };

  test('boş satış sunucuya gider (istemci doğrulaması yok): yük biçimi, kalan ödeme 0, odeme_tamamlandi yük dışı', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    expect(within(p).getByText('Yeni Motor Satış')).toBeInTheDocument();
    await user.type(alan('Plaka *'), 'abc1');
    expect(alan('Plaka *')).toHaveValue('ABC1');
    await user.type(alan('Marka *'), 'Honda');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ikinciElMotorService.create).toHaveBeenCalled());
    const yuk = ikinciElMotorService.create.mock.calls[0][0];
    expect(yuk).toMatchObject({ plaka: 'ABC1', marka: 'Honda', durum: 'tamamlandi', odeme_sekli: 'nakit', kalan_odeme: 0, fatura_kesildi: false });
    expect(yuk).not.toHaveProperty('odeme_tamamlandi');
    await bekleDialogKapanana();
  });

  test('canlı net kâr (yalnızca admin): satış - (alış + masraf + komisyon); yatırımcı payı varsa "Benim Kârım" ayrışır', async () => {
    const user = await ekranAc();
    await yeniAc(user);
    await user.type(alan('Alış Fiyatı (₺)'), '50000');
    await user.type(alan('Satış Fiyatı (₺)'), '60000');
    await user.type(alan('Masraflar (₺)'), '1000');
    await user.type(alan('Komisyoncu Tutarı (₺)'), '500');
    expect(screen.getByText((_, el) => el.tagName === 'H6' && el.textContent === 'Net Kâr: 8.500 ₺')).toBeInTheDocument();
  });

  test('personel (kâr yetkisiz) canlı net kâr panelini görmez', async () => {
    const user = await ekranAc({ user: SATIS });
    await yeniAc(user);
    expect(screen.queryByText(/Net Kâr:/)).not.toBeInTheDocument();
  });

  test('stoktaki motor plakadan seçilir: alanlar dolar, yatırımcı uyarısı çıkar, kayıt create değil update(stokId) ile yapılır', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(within(p).getByRole('combobox', { name: /Plaka/ }), '16');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['16STK333']); // yazılana göre süzülür
    await user.click(screen.getByRole('option', { name: '16STK333' }));
    expect(alan('Marka *')).toHaveValue('Suzuki');
    expect(alan('Alış Fiyatı (₺)')).toHaveValue(30000);
    expect(alan('Alım Tarihi')).toHaveValue('2026-09-10');
    expect(alan('Satıcı Ad Soyad')).toHaveValue('Veli S');
    expect(within(p).getByText('YATIRIMCI MOTORU')).toBeInTheDocument();
    expect(within(p).getByText(/Bu motor bir yatırımcıya ait: Yatırımcı Veli/)).toBeInTheDocument();
    await user.type(alan('Satış Fiyatı (₺)'), '45000');
    await user.type(alan('Yatırımcı Kârı (₺)'), '2000');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ikinciElMotorService.update).toHaveBeenCalled());
    const [id, yuk] = ikinciElMotorService.update.mock.calls[0];
    expect(id).toBe(3);
    expect(yuk).toMatchObject({ plaka: '16STK333', durum: 'tamamlandi', satis_fiyati: '45000', yatirimci_id: 9, yatirimci_kar: '2000', eski_kayit: false });
    expect(ikinciElMotorService.create).not.toHaveBeenCalled();
  });

  // Regression: plaka TAM yazılıp öneriye tıklanınca form dolmuyordu (alan yazılan metni `value` tutuyordu; MUI seçilen öneri
  // mevcut değere eşitse onChange'i hiç çağırmaz). E2E'de de kayıtlıydı (e2e/3-motor-satisi.spec.js).
  test('plaka TAM yazılıp öneri seçilince de alanlar dolar ve kayıt update(stokId) ile yapılır', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(within(p).getByRole('combobox', { name: /Plaka/ }), '16STK333');
    await user.click(screen.getByRole('option', { name: '16STK333' }));
    expect(alan('Marka *')).toHaveValue('Suzuki');
    expect(alan('Alış Fiyatı (₺)')).toHaveValue(30000);
    await user.type(alan('Satış Fiyatı (₺)'), '45000');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ikinciElMotorService.update).toHaveBeenCalled());
    expect(ikinciElMotorService.update.mock.calls[0][0]).toBe(3);
    expect(ikinciElMotorService.create).not.toHaveBeenCalled(); // yeni kayıt değil, stok kaydı güncellenir (çift kayıt oluşmaz)
  });

  test('kalan ödeme: işaret kalkınca alan çıkar ve değer yüke girer', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.click(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' }));
    await user.type(alan('Kalan Ödeme (₺)'), '2500');
    await user.type(alan('Plaka *'), 'X');
    await user.type(alan('Marka *'), 'Y');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ikinciElMotorService.create).toHaveBeenCalled());
    expect(ikinciElMotorService.create.mock.calls[0][0].kalan_odeme).toBe('2500');
  });

  test('alıcı telefonu 10+ hane olunca kayıtlı müşteri boş alanlara dolar; komisyoncu telefonu adı doldurur', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    musteriService.searchByPhone.mockResolvedValue({ data: { ad_soyad: 'Kayıtlı Müşteri', adres: 'Beşiktaş' } });
    await user.type(within(p).getByLabelText('Telefon'), '05551112233');
    await waitFor(() => expect(alan('Ad Soyad')).toHaveValue('Kayıtlı Müşteri'));
    expect(alan('Adres')).toHaveValue('Beşiktaş');
    await user.type(alan('Komisyoncu Telefon'), '05321112233');
    await waitFor(() => expect(alan('Komisyoncu Ad Soyad')).toHaveValue('Kayıtlı Müşteri'));
  });

  test('alıcı adı yazılırken müşteri önerisi çıkar; seçilince telefon ve adres dolar', async () => {
    const user = await ekranAc();
    const p = await yeniAc(user);
    await user.type(within(p).getByRole('combobox', { name: 'Ad Soyad' }), 'meh');
    await user.click(await screen.findByText('Mehmet Aksoy'));
    expect(alan('Telefon')).toHaveValue('0555');
    expect(alan('Adres')).toHaveValue('Üsküdar');
  });

  test('bekleyen belgeler satıştan sonra yüklenir; hata olursa uyarı çıkar; sunucu hatası pencerede gösterilir', async () => {
    const user = await ekranAc();
    let p = await yeniAc(user);
    await user.click(within(p).getByRole('button', { name: /BELGE-EKLE \(0\)/ }));
    bekleyenBelgeleriYukle.mockResolvedValue(['ruhsat.pdf: büyük']);
    await user.type(alan('Plaka *'), 'X');
    await user.type(alan('Marka *'), 'Y');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(bekleyenBelgeleriYukle).toHaveBeenCalledWith(99, [{ name: 'ruhsat.pdf' }]));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('ruhsat.pdf: büyük')));
    await bekleDialogKapanana();

    ikinciElMotorService.create.mockRejectedValue({ response: { data: { message: 'Plaka çakışıyor' } } });
    p = await yeniAc(user);
    await user.type(alan('Plaka *'), 'Z');
    await user.type(alan('Marka *'), 'Y');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Plaka çakışıyor')).toBeInTheDocument();
  });

  test('düzenleme: alanlar dolu gelir, belge bölümü motora bağlı; Güncelle update(id) çağırır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('34SAT111'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Motor Düzenle')).toBeInTheDocument();
    expect(alan('Plaka *')).toHaveValue('34SAT111');
    expect(alan('Satış Tarihi')).toHaveValue('2026-10-05');
    expect(alan('Komisyoncu Tutarı (₺)')).toHaveValue(500);
    expect(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' })).toBeChecked();
    expect(within(p).getByText('BELGE-BOLUMU-1')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(ikinciElMotorService.update).toHaveBeenCalled());
    expect(ikinciElMotorService.update.mock.calls[0][0]).toBe(1);
    expect(ikinciElMotorService.update.mock.calls[0][1]).toMatchObject({ plaka: '34SAT111', satis_fiyati: 60000, kalan_odeme: 0 });
  });

  test('veritabanından "0.00" (metin) gelen kalan ödeme ödendi sayılır ve 0 (sayı) olarak gönderilir', async () => {
    const user = await ekranAc({ liste: [{ ...S1, kalan_odeme: '0.00' }, S2, ST1] });
    await user.click(ikon(satir('34SAT111'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByRole('checkbox', { name: 'Ödeme Tamamlandı' })).toBeChecked();
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(ikinciElMotorService.update).toHaveBeenCalled());
    expect(ikinciElMotorService.update.mock.calls[0][1].kalan_odeme).toBe(0);
  });

  test('yatırımcılı satışı (düzenleme) kâr yetkisiz personel açınca yatırımcı kârı alanı çıkmaz', async () => {
    const user = await ekranAc({ user: SATIS });
    await user.click(ikon(satir('06SAT222'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('YATIRIMCI MOTORU')).toBeInTheDocument();
    expect(within(p).queryByLabelText('Yatırımcı Kârı (₺)')).not.toBeInTheDocument();
  });
});

describe('İkinci El Motor: mobil görünüm', () => {
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

  test('kart listesi: alım ve kâr yetkiye göre; karta dokunmak detayı açar', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === 'Alım: ₺50.000')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === 'Kâr: ₺9.000')).toBeInTheDocument();
    await user.click(screen.getByText(plakaBicim('34SAT111')));
    expect(await screen.findByText('Motor Detay')).toBeInTheDocument();
  });

  test('muhasebeci kartında kâr ve işlem düğmeleri yok', async () => {
    await ekranAc({ user: MUHASEBE });
    expect(screen.queryByText(/Kâr:/)).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('EditIcon')).toHaveLength(0);
  });
});
