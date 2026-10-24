/*
 * Motor Stok sayfası için KARAKTERİZASYON testleri: ekranın bugün ne yaptığını kayda geçirir (bölmeden önce de sonra da yeşil).
 * En riskli kısım ROL MATRİSİ: admin, motor satış yetkilisi, yetkisiz personel, yatırımcı (vitrin / sahip). API, oturum, belge
 * bölümü ve yazdırma sahte (mock). Sayılar elle hesaplandı.
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MotorStok from './MotorStok';
import { ikinciElMotorService } from './motorApi';
import { musteriService } from '../musteriler/musteriApi';
import { authService } from '../auth/authApi';
import { bekleyenBelgeleriYukle } from './SatisBelgeleri';
import { useAuth } from '../auth/AuthContext';
import { useReactToPrint } from 'react-to-print';

jest.mock('./motorApi', () => ({
  ikinciElMotorService: { getAll: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));
jest.mock('../musteriler/musteriApi', () => ({ musteriService: { search: jest.fn() } }));
jest.mock('../auth/authApi', () => ({ authService: { getYatirimcilar: jest.fn() } }));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-to-print', () => ({ useReactToPrint: jest.fn() }));
jest.mock('./SatisBelgeleri', () => ({
  BelgeBolumu: ({ motorId }) => <div>BELGE-BOLUMU-{motorId}</div>,
  BekleyenBelgeler: ({ dosyalar, setDosyalar }) => <button onClick={() => setDosyalar([{ name: 'ruhsat.pdf' }])}>BELGE-EKLE ({dosyalar.length})</button>,
  bekleyenBelgeleriYukle: jest.fn(),
}));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const M1 = {
  id: 1,
  plaka: '34AAA111',
  marka: 'Honda',
  model: 'PCX',
  yil: 2020,
  km: 10000,
  durum: 'stokta',
  stok_tipi: 'sahip',
  alis_fiyati: 50000,
  noter_alis: 40000,
  liste_fiyati: 65000,
  masraflar: 1000,
  satici_adi: 'Ali Veli',
  satici_tc: '111',
  tarih: '2026-09-01T12:00:00',
  fatura_kesildi: true,
  kalan_odeme: 0,
};
const M2 = {
  id: 2,
  plaka: '06BBB222',
  marka: 'Yamaha',
  model: 'NMAX',
  durum: 'kapora',
  alis_fiyati: 70000,
  liste_fiyati: 90000,
  satici_adi: 'Ayşe',
  tarih: '2026-09-02T12:00:00',
  fatura_kesildi: false,
  kalan_odeme: '5000',
};
const M3 = {
  id: 3,
  plaka: '35CCC333',
  marka: 'Suzuki',
  model: 'Burgman',
  durum: 'stokta',
  stok_tipi: 'konsinye',
  liste_fiyati: 80000,
  tarih: '2026-09-03T12:00:00',
};
const M4 = { id: 4, plaka: '16DDD444', marka: 'Kawasaki', model: 'Z', durum: 'depo_serviste', tarih: '2026-09-04T12:00:00' };
const M5 = { id: 5, plaka: '41EEE555', marka: 'BMW', model: 'R', durum: 'devir_bekliyor', tarih: '2026-09-05T12:00:00' };
const M6 = {
  id: 6,
  plaka: '07FFF666',
  marka: 'Vespa',
  model: 'GTS',
  durum: 'tamamlandi',
  alis_fiyati: 30000,
  liste_fiyati: 45000,
  satici_adi: 'Veli',
  tarih: '2026-08-01T12:00:00',
  fatura_kesildi: true,
  kar: 5000,
  yatirimci_id: 9,
  yatirimci_kar: 1000,
  satis_fiyati: 35000,
  kalan_odeme: 0,
};
const M7 = { id: 7, plaka: '01GGG777', marka: 'Piaggio', model: 'Liberty', durum: 'perte', tarih: '2026-09-06T12:00:00' };
const HEPSI = [M6, M7, M5, M4, M3, M2, M1]; // sunucu sırası karışık; ekran durum sırasına dizer
// Sıra: stokta(sahip) -> kapora -> konsinye -> depo -> devir -> perte -> satılan

const ADMIN = { rol: 'admin' };
const SATIS = { rol: 'personel', motor_satis_yetkisi: true };
const YETKISIZ = { rol: 'personel' };
const YAT_VITRIN = { rol: 'yatirimci', liste_fiyati_gor: true };
const YAT_SAHIP = { rol: 'yatirimci' };

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
let yazdir;
const kur = ({ user = ADMIN, liste = HEPSI } = {}) => {
  useAuth.mockReturnValue({ user });
  ikinciElMotorService.getAll.mockResolvedValue({ data: liste });
  ikinciElMotorService.getById.mockImplementation(async (id) => ({
    data:
      id === 6
        ? {
            ...M6,
            odeme_detaylari: JSON.stringify([
              { tip: 'Nakit', tutar: 20000 },
              { tip: 'Kart', tutar: 10000 },
            ]),
            kalan_odeme: 5000,
            aciklama: 'Not',
          }
        : liste.find((x) => x.id === id),
  }));
  ikinciElMotorService.create.mockResolvedValue({ data: { id: 99 } });
  ikinciElMotorService.update.mockResolvedValue({ data: {} });
  ikinciElMotorService.delete.mockResolvedValue({ data: {} });
  musteriService.search.mockResolvedValue({ data: [{ id: 5, ad_soyad: 'Mehmet Aksoy', telefon: '0555', adres: 'Üsküdar' }] });
  authService.getYatirimcilar.mockResolvedValue({ data: [{ id: 9, ad_soyad: 'Yatırımcı Veli' }] });
  bekleyenBelgeleriYukle.mockResolvedValue([]);
  yazdir = jest.fn();
  useReactToPrint.mockReturnValue(yazdir);
};

const ekranAc = async (secenek = {}) => {
  kur(secenek);
  const user = userEvent.setup();
  render(<MotorStok />);
  if (!secenek.bekleme) await screen.findByText(secenek.bekle || '34AAA111');
  return user;
};

const satir = (plaka) => screen.getByRole('row', { name: new RegExp(plaka) });
const hucreler = (row) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent);
const basliklar = () => screen.getAllByRole('columnheader').map((h) => h.textContent);
const ikon = (kapsam, ad) => within(kapsam).getByTestId(ad);
const alan = (etiket) => screen.getByLabelText(etiket);
const bekleDialogKapanana = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
const plakalar = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);

beforeEach(() => {
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  jest.spyOn(window, 'confirm').mockImplementation(() => true);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

// ---- Rol matrisi -------------------------------------------------------------------------------------------------
describe('Motor Stok: rollere göre sütunlar ve düğmeler', () => {
  test('admin: tüm sütunlar, Motor Ekle, her satırda düzenle/sil/hızlı satış', async () => {
    await ekranAc();
    expect(basliklar()).toEqual(['Plaka', 'Marka', 'Model', 'Yıl', 'KM', 'İlan Fiyatı', 'Alım', 'Alış Bedeli', 'İsim Soyisim', 'Alım Tarihi', 'İşlemler']);
    expect(hucreler(satir('34AAA111'))).toEqual(['34AAA111', 'Honda', 'PCX', '2020', '10.000', '65.000', '50.000', '40.000', 'Ali Veli', '01.09.2026', '']);
    expect(screen.getByRole('button', { name: 'Motor Ekle' })).toBeInTheDocument();
    expect(screen.getAllByTestId('DeleteIcon')).toHaveLength(7);
    expect(screen.getAllByTestId('ShoppingCartIcon')).toHaveLength(5); // satılan ve perte hariç
  });

  test('motor satış yetkilisi: alım ve müşteri sütunları var, ilan fiyatı yok; düzenleyebilir ama silemez', async () => {
    await ekranAc({ user: SATIS });
    expect(basliklar()).toEqual(['Plaka', 'Marka', 'Model', 'Yıl', 'KM', 'Alım', 'Alış Bedeli', 'İsim Soyisim', 'Alım Tarihi', 'İşlemler']);
    expect(screen.getByRole('button', { name: 'Motor Ekle' })).toBeInTheDocument();
    expect(screen.queryAllByTestId('DeleteIcon')).toHaveLength(0);
    expect(screen.getAllByTestId('EditIcon')).toHaveLength(7);
  });

  test('yetkisiz personel: yalnızca temel sütunlar, düzenleme/ekleme yok, sadece göz ikonu', async () => {
    await ekranAc({ user: YETKISIZ });
    expect(basliklar()).toEqual(['Plaka', 'Marka', 'Model', 'Yıl', 'KM', 'Alım Tarihi', 'İşlemler']);
    expect(screen.queryByRole('button', { name: 'Motor Ekle' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('EditIcon')).toHaveLength(0);
    expect(screen.getAllByTestId('VisibilityIcon')).toHaveLength(7);
  });

  test('yatırımcı (vitrin): yalnızca ilan fiyatı görür; satılanlar gizli; ikincil sayaçlar ve işlem düğmeleri yok', async () => {
    await ekranAc({ user: YAT_VITRIN });
    expect(basliklar()).toEqual(['Plaka', 'Marka', 'Model', 'Yıl', 'KM', 'İlan Fiyatı', 'Alım Tarihi', 'Detay']);
    expect(plakalar()).not.toContain('07FFF666'); // satılan Vespa gizli
    expect(screen.getByText('Toplam: 6')).toBeInTheDocument(); // 7 - 1 satılan
    expect(screen.queryByText(/^Fatura ✓/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Motor Ekle' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('EditIcon')).toHaveLength(0);
    expect(authService.getYatirimcilar).not.toHaveBeenCalled();
  });

  test('yatırımcı (sahip): Kârım sütunu; satılan motor yalnızca "Satılan" filtresinde, kârıyla görünür', async () => {
    const user = await ekranAc({ user: YAT_SAHIP });
    expect(basliklar()).toEqual([
      'Plaka',
      'Marka',
      'Model',
      'Yıl',
      'KM',
      'İlan Fiyatı',
      'Alım',
      'Alış Bedeli',
      'İsim Soyisim',
      'Alım Tarihi',
      'Kârım',
      'Detay',
    ]);
    expect(plakalar()).not.toContain('07FFF666');
    await user.click(screen.getByText('Satılan: 1'));
    expect(plakalar()).toEqual(['07FFF666']);
    expect(hucreler(satir('07FFF666')).slice(-2)[0]).toBe('1.000'); // Kârım = yatırımcı payı
  });

  test('yalnızca admin yatırımcı listesini sunucudan ister', async () => {
    await ekranAc();
    expect(authService.getYatirimcilar).toHaveBeenCalledTimes(1);
  });
});

// ---- Liste, sayaçlar, süzgeçler ----------------------------------------------------------------------------------
describe('Motor Stok: sayaçlar ve süzgeçler', () => {
  test('durum sayaçları ve ikincil (fatura/devir/ödeme) sayaçlar', async () => {
    await ekranAc();
    for (const t of [
      'Toplam: 7',
      'Stokta: 1',
      'Konsinye: 1',
      'Kapora: 1',
      'Depo/Serviste: 1',
      'Devir Bekliyor: 1',
      'Perte: 1',
      'Satılan: 1',
      'Fatura ✓ 2',
      'Fatura ✗ 5',
      'Devir ✓ 1',
      'Devir ✗ 1',
      'Ödeme ✓ 6',
      'Ödeme ✗ 1',
    ]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  test('liste durum sırasına göre dizilir: stokta, kapora, konsinye, depo, devir, perte, satılan', async () => {
    await ekranAc();
    expect(plakalar()).toEqual(['34AAA111', '06BBB222', '35CCC333', '16DDD444', '41EEE555', '01GGG777', '07FFF666']);
  });

  test('durum çipi listeyi süzer; aynı çipe yeniden basmak süzgeci kaldırır; konsinye ayrı sayılır', async () => {
    const user = await ekranAc();
    await user.click(screen.getByText('Stokta: 1'));
    expect(plakalar()).toEqual(['34AAA111']); // konsinye stok "Stokta" çipinde yok
    await user.click(screen.getByText('Stokta: 1'));
    expect(plakalar()).toHaveLength(7);
    await user.click(screen.getByText('Konsinye: 1'));
    expect(plakalar()).toEqual(['35CCC333']);
  });

  test('ikincil çipler: fatura ve kalan ödeme süzgeçleri', async () => {
    const user = await ekranAc();
    await user.click(screen.getByText('Ödeme ✗ 1'));
    expect(plakalar()).toEqual(['06BBB222']);
    await user.click(screen.getByText('Ödeme ✗ 1'));
    await user.click(screen.getByText('Fatura ✓ 2'));
    expect(plakalar()).toEqual(['34AAA111', '07FFF666']);
  });

  test('arama plaka, marka, model, satıcı ve alıcı adında çalışır', async () => {
    const user = await ekranAc();
    const kutu = screen.getByPlaceholderText('Plaka, marka, model veya satıcı adı ile ara...');
    await user.type(kutu, 'nmax');
    expect(plakalar()).toEqual(['06BBB222']);
    await user.clear(kutu);
    await user.type(kutu, 'ali veli');
    expect(plakalar()).toEqual(['34AAA111']);
    await user.clear(kutu);
    await user.type(kutu, 'zzz');
    expect(screen.getByText('Kayıt yok')).toBeInTheDocument();
  });

  test('silme: onaylanırsa siler ve listeyi yeniler; onaylanmazsa silmez; hatada uyarır', async () => {
    const user = await ekranAc();
    window.confirm.mockReturnValueOnce(false);
    await user.click(ikon(satir('06BBB222'), 'DeleteIcon'));
    expect(ikinciElMotorService.delete).not.toHaveBeenCalled();
    const cagri = ikinciElMotorService.getAll.mock.calls.length;
    await user.click(ikon(satir('06BBB222'), 'DeleteIcon'));
    await waitFor(() => expect(ikinciElMotorService.delete).toHaveBeenCalledWith(2));
    await waitFor(() => expect(ikinciElMotorService.getAll.mock.calls.length).toBe(cagri + 1));
    ikinciElMotorService.delete.mockRejectedValue({ response: { data: { message: 'Bağlı satış var' } } });
    await user.click(ikon(satir('06BBB222'), 'DeleteIcon'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Bağlı satış var'));
  });
});

// ---- Detay penceresi ---------------------------------------------------------------------------------------------
describe('Motor Stok: detay penceresi', () => {
  test('admin: fiyat kutuları, yatırımcı/işletme kârı, ödeme dağılımı, açıklama ve belge bölümü', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('07FFF666'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(ikinciElMotorService.getById).toHaveBeenCalledWith(6);
    expect(within(p).getByText('Motor Stok Detay')).toBeInTheDocument();
    expect(within(p).getByText('Alım').nextElementSibling).toHaveTextContent('₺30.000');
    expect(within(p).getByText('Yatırımcı Kârı').nextElementSibling).toHaveTextContent('₺1.000');
    expect(within(p).getByText('İşletme Kârı').nextElementSibling).toHaveTextContent('₺4.000'); // kâr 5000 - yatırımcı 1000
    expect(within(p).getByText('Toplam Satış:').nextElementSibling).toHaveTextContent('₺35.000');
    expect(within(p).getByText('Nakit:').nextElementSibling).toHaveTextContent('₺20.000');
    expect(within(p).getByText('Toplam Ödeme').nextElementSibling).toHaveTextContent('₺30.000');
    expect(within(p).getByText('Kalan').nextElementSibling).toHaveTextContent('₺5.000');
    expect(within(p).getByText('Not')).toBeInTheDocument();
    expect(within(p).getByText('BELGE-BOLUMU-6')).toBeInTheDocument();
  });

  test('yetkisiz personel: fiyat bölümü, satıcı bilgisi ve belge bölümü görünmez', async () => {
    const user = await ekranAc({ user: YETKISIZ });
    await user.click(ikon(satir('34AAA111'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Plaka:')).toBeInTheDocument();
    expect(within(p).queryByText(/Fiyat Bilgileri/)).not.toBeInTheDocument();
    expect(within(p).queryByText(/Satıcı Bilgileri/)).not.toBeInTheDocument();
    expect(within(p).queryByText(/BELGE-BOLUMU/)).not.toBeInTheDocument();
    expect(within(p).queryByText('İlan Fiyatı:')).not.toBeInTheDocument();
  });

  test('yatırımcı (sahip): satılan motorda "Kazancım" kutusu görünür', async () => {
    const user = await ekranAc({ user: YAT_SAHIP });
    await user.click(screen.getByText('Satılan: 1'));
    await user.click(ikon(satir('07FFF666'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Kazancım').nextElementSibling).toHaveTextContent('₺1.000');
    expect(within(p).queryByText('Yatırımcı Kârı')).not.toBeInTheDocument(); // admin kutusu değil
  });

  test('Yazdır düğmesi yazdırma kancasını çağırır; kapatma ikonu pencereyi kapatır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('34AAA111'), 'VisibilityIcon'));
    const p = await screen.findByRole('dialog');
    await user.click(within(p).getByRole('button', { name: 'Yazdır' }));
    expect(yazdir).toHaveBeenCalled();
    await user.click(ikon(p, 'CloseIcon'));
    await bekleDialogKapanana();
  });
});

// ---- Motor ekle / düzenle ----------------------------------------------------------------------------------------
describe('Motor Stok: ekleme ve düzenleme formu', () => {
  const eklemeAc = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Motor Ekle' }));
    return screen.findByRole('dialog');
  };

  test('boş form kaydedilirse sunucuya gider (istemci doğrulaması yok); yük biçimi ve yatırımcı alanları', async () => {
    const user = await ekranAc();
    const p = await eklemeAc(user);
    expect(within(p).getByText('Yeni Motor Ekle')).toBeInTheDocument();
    await user.type(alan('Plaka *'), 'abc123');
    expect(alan('Plaka *')).toHaveValue('ABC123'); // büyük harfe çevrilir
    await user.type(alan('Marka *'), 'Honda');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ikinciElMotorService.create).toHaveBeenCalled());
    const yuk = ikinciElMotorService.create.mock.calls[0][0];
    expect(yuk).toMatchObject({
      plaka: 'ABC123',
      marka: 'Honda',
      durum: 'stokta',
      stok_tipi: 'sahip',
      fatura_kesildi: false,
      yatirimci: false,
      yatirimci_id: null,
      yatirimci_kar_orani: 0,
    });
    await bekleDialogKapanana();
  });

  test('"Bu motor bir yatırımcıya ait" işaretlenince yatırımcı seçilir ve id yüke girer (yalnızca admin görür)', async () => {
    const user = await ekranAc();
    const p = await eklemeAc(user);
    await user.click(within(p).getByRole('checkbox', { name: 'Bu motor bir yatırımcıya ait' }));
    await user.click(within(p).getByRole('combobox', { name: /Yatırımcı Seç/ }));
    await user.click(screen.getByRole('option', { name: 'Yatırımcı Veli' }));
    await user.type(alan('Plaka *'), 'X1');
    await user.type(alan('Marka *'), 'Y');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ikinciElMotorService.create).toHaveBeenCalled());
    expect(ikinciElMotorService.create.mock.calls[0][0]).toMatchObject({ yatirimci: true, yatirimci_id: 9 });
  });

  test('personel formunda yatırımcı bölümü yoktur; satıcı bilgisi yetkisizse uyarı çıkar', async () => {
    const user = await ekranAc({ user: { rol: 'personel', motor_satis_yetkisi: true } });
    let p = await eklemeAc(user);
    expect(within(p).queryByText('Yatırımcı')).not.toBeInTheDocument();
    expect(within(p).queryByText(/Satıcı\/müşteri bilgilerini görme yetkiniz yok/)).not.toBeInTheDocument();
    expect(within(p).getByText(/Vitrin \/ Site Bilgileri/)).toBeInTheDocument();
  });

  test("yeni motorda seçilen belgeler kayıttan sonra yeni motor id'siyle yüklenir; hata olursa uyarı çıkar", async () => {
    const user = await ekranAc();
    const p = await eklemeAc(user);
    await user.click(within(p).getByRole('button', { name: /BELGE-EKLE \(0\)/ }));
    expect(within(p).getByRole('button', { name: /BELGE-EKLE \(1\)/ })).toBeInTheDocument();
    bekleyenBelgeleriYukle.mockResolvedValue(['ruhsat.pdf: çok büyük']);
    await user.type(alan('Plaka *'), 'X1');
    await user.type(alan('Marka *'), 'Y');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(bekleyenBelgeleriYukle).toHaveBeenCalledWith(99, [{ name: 'ruhsat.pdf' }]));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('ruhsat.pdf: çok büyük')));
  });

  test('sunucu hatası pencerede gösterilir ve pencere açık kalır', async () => {
    const user = await ekranAc();
    ikinciElMotorService.create.mockRejectedValue({ response: { data: { message: 'Plaka zaten kayıtlı' } } });
    const p = await eklemeAc(user);
    await user.type(alan('Plaka *'), 'X1');
    await user.type(alan('Marka *'), 'Y');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Plaka zaten kayıtlı')).toBeInTheDocument();
  });

  test('düzenle ikonu formu doldurur (belge bölümü motora bağlı, Stok Tipi seçeneği görünür); Güncelle update çağırır', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('34AAA111'), 'EditIcon'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Motor Düzenle')).toBeInTheDocument();
    expect(alan('Plaka *')).toHaveValue('34AAA111');
    expect(alan('Alım Tarihi')).toHaveValue('2026-09-01');
    expect(alan('Alım (₺)')).toHaveValue(50000);
    expect(within(p).getByRole('combobox', { name: 'Stok Tipi' })).toBeInTheDocument();
    expect(within(p).getByText('BELGE-BOLUMU-1')).toBeInTheDocument();
    await user.click(within(p).getByRole('button', { name: 'Güncelle' }));
    await waitFor(() => expect(ikinciElMotorService.update).toHaveBeenCalled());
    expect(ikinciElMotorService.update.mock.calls[0][0]).toBe(1);
    expect(ikinciElMotorService.update.mock.calls[0][1]).toMatchObject({ plaka: '34AAA111', alis_fiyati: 50000, yatirimci_id: null });
  });

  test('satıcı alanında müşteri araması öneri listeler; seçilen ad forma yazılır', async () => {
    const user = await ekranAc();
    const p = await eklemeAc(user);
    await user.type(within(p).getByRole('combobox', { name: 'İsim Soyisim' }), 'meh');
    await user.click(await screen.findByText('Mehmet Aksoy'));
    expect(within(p).getByRole('combobox', { name: 'İsim Soyisim' })).toHaveValue('Mehmet Aksoy');
    expect(musteriService.search).toHaveBeenCalledWith('meh');
  });
});

// ---- Hızlı satış -------------------------------------------------------------------------------------------------
describe('Motor Stok: hızlı satış', () => {
  const hizliAc = async (user, plaka = '34AAA111') => {
    await user.click(ikon(satir(plaka), 'ShoppingCartIcon'));
    return screen.findByRole('dialog');
  };

  test('pencere motoru başlıkta gösterir, masrafı stoktan getirir; satılan/perte motorda hızlı satış düğmesi yok', async () => {
    const user = await ekranAc();
    expect(within(satir('07FFF666')).queryByTestId('ShoppingCartIcon')).not.toBeInTheDocument();
    expect(within(satir('01GGG777')).queryByTestId('ShoppingCartIcon')).not.toBeInTheDocument();
    const p = await hizliAc(user);
    expect(within(p).getByText(/Hızlı Satış - 34AAA111 Honda PCX/)).toBeInTheDocument();
    expect(alan('Masraflar (₺)')).toHaveValue(1000);
    expect(within(p).getByText('BELGE-BOLUMU-1')).toBeInTheDocument();
  });

  test('kâr önizlemesi (yalnızca admin): satış - alış - masraf - komisyon', async () => {
    const user = await ekranAc();
    const p = await hizliAc(user);
    await user.type(alan('Satış Fiyatı (₺)'), '60000');
    expect(within(p).getByText('Toplam Kâr:').nextElementSibling).toHaveTextContent('₺9.000'); // 60000-50000-1000
  });

  test('yetkili personel kâr önizlemesini görmez', async () => {
    const user = await ekranAc({ user: SATIS });
    const p = await hizliAc(user);
    expect(within(p).queryByText('Kâr Önizleme')).not.toBeInTheDocument();
  });

  test('parçalı ödeme: toplam, girilen ve kalan hesaplanır; fazla ödeme uyarı verir', async () => {
    const user = await ekranAc();
    const p = await hizliAc(user);
    await user.type(alan('Satış Fiyatı (₺)'), '60000');
    await user.click(within(p).getByRole('button', { name: 'Ödeme Ekle' }));
    await user.type(alan('Tutar (₺)'), '40000');
    expect(within(p).getByText('Toplam Satış:').nextElementSibling).toHaveTextContent('₺60.000');
    expect(within(p).getByText('Girilen Ödeme:').nextElementSibling).toHaveTextContent('₺40.000');
    expect(within(p).getByText('Kalan:').nextElementSibling).toHaveTextContent('₺20.000');
    await user.clear(alan('Tutar (₺)'));
    await user.type(alan('Tutar (₺)'), '70000');
    expect(within(p).getByText('Fazla Ödeme:').nextElementSibling).toHaveTextContent('₺10.000');
    expect(within(p).getByText('Girilen ödeme toplamı satış tutarını aşıyor.')).toBeInTheDocument();
    await user.click(ikon(p, 'CloseIcon')); // satırı sil
    expect(within(p).queryByText('Girilen Ödeme:')).not.toBeInTheDocument();
  });

  test('Satışı Tamamla: motor + form birleşir, durum "tamamlandi", kalan ödeme ve ödeme kalemleri JSON olarak gider', async () => {
    const user = await ekranAc();
    const p = await hizliAc(user);
    await user.type(alan('Satış Fiyatı (₺)'), '60000');
    await user.type(alan('Yevmiye No'), 'Y-5');
    await user.click(within(p).getByRole('button', { name: 'Ödeme Ekle' }));
    await user.type(alan('Tutar (₺)'), '40000');
    await user.click(within(p).getByRole('button', { name: 'Satışı Tamamla' }));
    await waitFor(() => expect(ikinciElMotorService.update).toHaveBeenCalled());
    const [id, yuk] = ikinciElMotorService.update.mock.calls[0];
    expect(id).toBe(1);
    expect(yuk).toMatchObject({
      plaka: '34AAA111',
      alis_fiyati: 50000,
      satis_fiyati: '60000',
      yevmiye_no: 'Y-5',
      masraflar: 1000,
      durum: 'tamamlandi',
      kalan_odeme: 20000,
    });
    expect(JSON.parse(yuk.odeme_detaylari)).toEqual([{ tip: 'Nakit', tutar: '40000' }]);
    await bekleDialogKapanana();
  });

  test('ödeme kalemi girilmezse kalan ödeme 0 ve ödeme listesi boş gider; sunucu hatası uyarı olur', async () => {
    const user = await ekranAc();
    const p = await hizliAc(user);
    ikinciElMotorService.update.mockRejectedValueOnce({ response: { data: { message: 'Yetkisiz' } } });
    await user.click(within(p).getByRole('button', { name: 'Satışı Tamamla' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Yetkisiz'));
    await user.click(within(p).getByRole('button', { name: 'Satışı Tamamla' }));
    await waitFor(() => expect(ikinciElMotorService.update).toHaveBeenCalledTimes(2));
    expect(ikinciElMotorService.update.mock.calls[1][1]).toMatchObject({ kalan_odeme: 0, odeme_detaylari: '[]' });
  });

  test('yatırımcılı motorda (admin) yatırımcı kârı alanı çıkar ve işletme kârı önizlemesi hesaplanır', async () => {
    const yatMotor = { ...M1, yatirimci_id: 9, yatirimci_kar: '' };
    const user = await ekranAc({ liste: [yatMotor, M6] });
    const p = await hizliAc(user);
    expect(within(p).getByText(/Bu motor bir yatırımcıya ait/)).toBeInTheDocument();
    await user.type(alan('Satış Fiyatı (₺)'), '60000');
    await user.type(alan('Yatırımcı Kârı (₺)'), '3000');
    expect(within(p).getByText('Yatırımcı Kârı:').nextElementSibling).toHaveTextContent('₺3.000');
    expect(within(p).getByText('İşletme Kârı (Sizin):').nextElementSibling).toHaveTextContent('₺6.000'); // 9000 - 3000
  });
});

describe('Motor Stok: mobil görünüm', () => {
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

  test('kart listesi; fiyatlar yetkiye göre; karta dokunmak detayı açar', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === 'Alım: ₺50.000')).toBeInTheDocument();
    await user.click(screen.getByText('34AAA111'));
    expect(await screen.findByText('Motor Stok Detay')).toBeInTheDocument();
  });

  test('yetkisiz personel kartında fiyat satırı yok', async () => {
    await ekranAc({ user: YETKISIZ });
    expect(screen.queryByText(/Alım:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/İlan:/)).not.toBeInTheDocument();
  });
});
