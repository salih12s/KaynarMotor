/*
 * Raporlar ekranı için KARAKTERİZASYON testleri: ekranın bugün ne yaptığını kayda geçirir.
 * Amaç Raporlar.jsx'i parçalara bölerken davranışın değişmediğini kanıtlamak; bölmeden önce de sonra da yeşil olmalı.
 * API ve oturum sahte (mock): gerçek ağ/sunucu yok. Sayılar elle hesaplandı (aşağıdaki RAPOR sabitine bakın).
 */
import React from 'react';
import { screen, within, waitFor, act } from '@testing-library/react';
import { sorguluRender } from '../../shared/sorgu/sorguluRender';
import userEvent from '@testing-library/user-event';
import Raporlar from './Raporlar';
import { raporService } from './raporApi';
import { aksesuarStokService } from '../aksesuar/aksesuarApi';
import { useAuth } from '../auth/AuthContext';
import { hesaplaKomisyon, detectPlatform } from '../eticaret/komisyon';

vi.mock('./raporApi', () => ({
  raporService: {
    getAralik: vi.fn(),
    getFisKar: vi.fn(),
    getPersoneller: vi.fn(),
    getYatirimciRapor: vi.fn(),
    getYatirimciOzet: vi.fn(),
  },
}));
vi.mock('../aksesuar/aksesuarApi', () => ({ aksesuarStokService: { getAll: vi.fn() } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
// 3 motor: m1 normal, m2 komisyonlu + yatırımcılı (id 7), m3 komisyonlu + faturasız.
const M1 = {
  plaka: '34ABC123',
  marka: 'Honda',
  model: 'PCX',
  alis_fiyati: 50000,
  satis_fiyati: 60000,
  masraflar: 1000,
  kar: 9000,
  yatirimci_kar: 0,
  noter_satis: 60000,
  fatura_kesildi: true,
  satis_tarihi: '2026-10-05T12:00:00',
  odeme_sekli: 'nakit',
};
const M2 = {
  plaka: '06XYZ789',
  marka: 'Yamaha',
  model: 'NMAX',
  alis_fiyati: 40000,
  satis_fiyati: 50000,
  masraflar: 500,
  kar: 6000,
  yatirimci_kar: 1000,
  yatirimci_id: 7,
  noter_satis: 50000,
  fatura_kesildi: true,
  komisyoncu_adi: 'Ali Komisyoncu',
  komisyoncu_telefon: '0532',
  komisyoncu_tutari: 2000,
  satis_tarihi: '2026-10-06T12:00:00',
};
const M3 = {
  plaka: '35KOM001',
  marka: 'Suzuki',
  model: 'Burgman',
  alis_fiyati: 25000,
  satis_fiyati: 30000,
  masraflar: 0,
  kar: 5000,
  yatirimci_kar: 0,
  noter_satis: 30000,
  fatura_kesildi: false,
  komisyoncu_adi: 'Zeynep Aracı',
  komisyoncu_tutari: 500,
  satis_tarihi: '2026-10-07T12:00:00',
};

const IE1 = {
  fis_no: 101,
  musteri_ad_soyad: 'Ayşe Yılmaz',
  telefon: '05551112233',
  marka: 'Honda',
  model_tip: 'PCX',
  km: 12500,
  teslim_eden_teknisyen: 'Usta Mehmet',
  ariza_sikayetler: 'Fren sesi',
  gercek_toplam_ucret: 1500,
  toplam_maliyet: 900,
  kar: 600,
  tamamlama_tarihi: '2026-10-03T12:00:00',
  parcalar: JSON.stringify([{ takilan_parca: 'Fren balatası', adet: 2, birim_fiyat: 300, toplam_fiyat: 600, maliyet: 150 }]),
};
const IE2 = {
  fis_no: 102,
  musteri_ad_soyad: 'Veli Demir',
  marka: 'Yamaha',
  model_tip: 'NMAX',
  teslim_eden_teknisyen: 'Usta Ali',
  gercek_toplam_ucret: 1000,
  toplam_maliyet: 600,
  kar: 400,
  tamamlama_tarihi: '2026-10-04T12:00:00',
  parcalar: [],
};

const AKS = {
  ad_soyad: 'Mehmet Kaya',
  telefon: '05330000000',
  olusturan_kisi: 'ofis',
  odeme_sekli: 'nakit',
  toplam_satis: 2000,
  toplam_maliyet: 1600,
  kar: 400,
  durum: 'tamamlandi',
  satis_tarihi: '2026-10-02T12:00:00',
  parcalar: [{ urun_adi: 'Kask', adet: 1, satis_fiyati: 2000, maliyet: 1600 }],
};
const ETC = {
  tarih: '2026-10-02T12:00:00',
  platform_adi: 'Trendyol',
  urun_adi: 'Kask Visor',
  adet: 2,
  satis_fiyati: 1000,
  alis_fiyati: 600,
  komisyon_orani: 15,
  kdv_orani: 20,
  kargo_ucreti: 50,
};

const RAPOR = {
  motorlar: [M1, M2, M3],
  isEmirleri: [IE1, IE2],
  aksesuarlar: [AKS],
  eticaret: [],
  yedekParcalar: [
    { urun_adi: 'Zincir Dişli Seti', alis_fiyati: 1000, satis_fiyati: 1800 },
    { urun_adi: 'Balata', alis_fiyati: 1000, satis_fiyati: 1200 },
  ],
  motorGelir: 140000,
  motorMaliyet: 116500,
  motorKar: 19000,
  motorYatirimciKar: 1000,
  motorKomisyon: 2500,
  motorNoterSatisCiro: 140000,
  motorStokToplam: 250000,
  isEmriGelir: 2500,
  isEmriMaliyet: 1500,
  isEmriKar: 1000,
  aksesuarGelir: 2000,
  aksesuarMaliyet: 1600,
  aksesuarKar: 400,
  eticaretGelir: 0,
  eticaretMaliyet: 0,
  yedekParcaToplamDeger: 3000,
  yedekParcaToplamMaliyet: 2000,
  toplam: { gelir: 100000, maliyet: 70000 },
};
// Toplam Kâr = motor 19000 + iş emri 1000 + aksesuar 400 + e-ticaret 0 + yedek parça (3000-2000) = 21.400
// Toplam Gelir = 100000 + 3000; Toplam Maliyet = 70000 + 2000; Toplam İşlem = 3 + 2 + 1 + 0 + 2 = 8

const FIS_KAR = [
  {
    fis_no: 101,
    musteri_ad_soyad: 'Ayşe Yılmaz',
    durum: 'tamamlandi',
    tamamlama_tarihi: '2026-10-03T12:00:00',
    gercek_toplam_ucret: 1500,
    toplam_maliyet: 900,
    kar: 600,
  },
];
const YATIRIMCI_OZET = [{ id: 7, ad_soyad: 'Yatırımcı Veli', stok_adet: 3, stok_degeri: 90000 }];
const STOK = [{ stok_adi: 'Kask', marka: 'LS2', platform: 'Trendyol', beden: 'L', renk: 'Siyah' }];

const tl = (v: number | string) => Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
type Kullanim = ReturnType<typeof userEvent.setup>;
interface KurSecenegi {
  rol?: string;
  rapor?: object;
  fisKar?: typeof FIS_KAR;
}
const kur = ({ rol = 'admin', rapor = RAPOR, fisKar = FIS_KAR }: KurSecenegi = {}) => {
  vi.mocked(useAuth).mockReturnValue({ user: { rol } } as never);
  vi.mocked(raporService.getAralik).mockResolvedValue({ data: rapor } as never);
  vi.mocked(raporService.getFisKar).mockResolvedValue({ data: fisKar } as never);
  vi.mocked(raporService.getPersoneller).mockResolvedValue({ data: ['Usta Mehmet', 'Usta Ali'] } as never);
  vi.mocked(raporService.getYatirimciOzet).mockResolvedValue({ data: YATIRIMCI_OZET } as never);
  vi.mocked(aksesuarStokService.getAll).mockResolvedValue({ data: STOK } as never);
};

let sonEkran: ReturnType<typeof sorguluRender>; // son render sonucu (istemci ve unmount, yeniden açılış testi için)
const ekranAc = async (secenek?: KurSecenegi) => {
  kur(secenek);
  const user = userEvent.setup();
  sonEkran = sorguluRender(<Raporlar />);
  await screen.findByText('Toplam gelir'); // Genel Özet açılınca veri gelmiştir
  return user;
};

const sekme = (user: Kullanim, ad: string) => user.click(screen.getByRole('tab', { name: ad }));
// Kart: etiket yazısının hemen altındaki değer yazısı
// (tablo başlıklarında aynı yazı olabilir; kartın etiketi <p> ve altında değer yazısı vardır)
const kart = (etiket: string, kap: Pick<typeof screen, 'getAllByText'> = screen) =>
  kap.getAllByText(etiket).find((e) => e.tagName === 'P' && e.nextElementSibling)?.nextElementSibling?.textContent;
// Genel Özet tablosunda 4. hücre "Gelir payı" çubuğudur; sayı kontrollerinde atlanır
const payHaric = (hucre: (string | null)[]) => hucre.filter((_, i) => i !== 3);
const satir = (ad: string | RegExp) => screen.getByRole('row', { name: ad });
const hucreler = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent);
// "Toplam: ₺600" gibi, içinde <strong> bulunan tek satırlık yazı
const yaziSecici = (metin: string) => (_: string, el: Element | null) => el?.tagName === 'P' && el.textContent === metin;
const yazi = (metin: string) => screen.getByText(yaziSecici(metin));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); // hata testleri bilerek console.error üretir
});
afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

// ---- Testler -----------------------------------------------------------------------------------------------------
describe('Raporlar: roller ve sekmeler', () => {
  test('admin 8 sekme görür, yatırımcı özetini ister', async () => {
    await ekranAc({ rol: 'admin' });
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Genel Özet',
      'Motor Satışları',
      'İş Emirleri',
      'Aksesuar Satışları',
      'E-Ticaret',
      'Yedek Parça',
      'Fiş Kâr Analizi',
      'Yatırımcılar',
    ]);
    expect(raporService.getYatirimciOzet).toHaveBeenCalledTimes(1);
  });

  test('personel Yatırımcılar sekmesini görmez ve yatırımcı özeti istenmez', async () => {
    await ekranAc({ rol: 'personel' });
    expect(screen.getAllByRole('tab')).toHaveLength(7);
    expect(screen.queryByRole('tab', { name: 'Yatırımcılar' })).not.toBeInTheDocument();
    expect(raporService.getYatirimciOzet).not.toHaveBeenCalled();
  });

  test('yatırımcı kendi raporunu görür; genel rapor uçları hiç çağrılmaz', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { rol: 'yatirimci' } } as never);
    vi.mocked(raporService.getYatirimciRapor).mockResolvedValue({
      data: {
        ozet: { stok_adet: 2, satilan_adet: 1, stok_degeri: 80000, toplam_yatirimci_kar: 1000 },
        stoktakiler: [{ plaka: '34STK001', marka: 'Yamaha', model: 'NMAX', yil: 2022, tarih: '2026-09-01T12:00:00', alis_fiyati: 40000, liste_fiyati: 50000 }],
        satilanlar: [{ plaka: '06SAT002', marka: 'Honda', model: 'PCX', satis_tarihi: '2026-10-05T12:00:00', satis_fiyati: 60000, yatirimci_kar: 1000 }],
      },
    } as never);
    const user = userEvent.setup();
    sorguluRender(<Raporlar />);

    expect(await screen.findByText('Yatırım Raporum')).toBeInTheDocument();
    await screen.findByText('Toplam Kazancım'); // veri gelene dek dönen çark görünür
    expect(kart('Toplam Kazancım')).toBe('₺1.000,00');
    expect(kart('Stok Değeri')).toBe('₺80.000,00');
    expect(screen.getByText('Stoktaki Motorlarım (1)')).toBeInTheDocument();
    expect(screen.getByText('Satılan Motorlarım (1)')).toBeInTheDocument();
    expect(screen.getByText('34STK001')).toBeInTheDocument();
    expect(screen.getByText('06SAT002')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(raporService.getAralik).not.toHaveBeenCalled();
    expect(raporService.getFisKar).not.toHaveBeenCalled();
    expect(raporService.getYatirimciRapor).toHaveBeenLastCalledWith({}); // başta tarih süzgeci yok

    await user.click(screen.getByRole('button', { name: 'Bu Ay' }));
    await waitFor(() =>
      expect(raporService.getYatirimciRapor).toHaveBeenLastCalledWith({
        baslangic: expect.stringMatching(/^\d{4}-\d{2}-01$/) as string,
        bitis: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as string,
      }),
    );
    expect(screen.getByRole('button', { name: 'Tümünü Göster' })).toBeInTheDocument();
  });
});

describe('Raporlar: tarih aralığı ve yükleme', () => {
  test('açılışta bu ayın ilk-son gününü ister; "Geçen Yıl" ön ayarı aralığı değiştirir', async () => {
    const user = await ekranAc();
    const simdi = new Date();
    const gg = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ilk = gg(new Date(simdi.getFullYear(), simdi.getMonth(), 1));
    const son = gg(new Date(simdi.getFullYear(), simdi.getMonth() + 1, 0));
    expect(raporService.getAralik).toHaveBeenCalledWith(ilk, son);
    expect(raporService.getFisKar).toHaveBeenCalledWith(ilk, son);

    await user.click(screen.getByRole('button', { name: 'Geçen Yıl' }));
    const y = simdi.getFullYear() - 1;
    await waitFor(() => expect(raporService.getAralik).toHaveBeenLastCalledWith(`${y}-01-01`, `${y}-12-31`));
    expect(screen.getByLabelText('Başlangıç')).toHaveValue(`${y}-01-01`);
    expect(screen.getByLabelText('Bitiş')).toHaveValue(`${y}-12-31`);
  });

  test('rapor isteği hata verirse hata mesajı görünür, kartlar görünmez', async () => {
    kur();
    vi.mocked(raporService.getAralik).mockRejectedValue(new Error('ağ'));
    sorguluRender(<Raporlar />);
    expect(await screen.findByText('Rapor yüklenirken hata oluştu')).toBeInTheDocument();
    expect(screen.queryByText('Toplam gelir')).not.toBeInTheDocument();
  });

  test('eski isteğin geç gelen yanıtı yenisinin üzerine yazmaz (her aralık ayrı önbellek anahtarı; eskiden sonIstek)', async () => {
    kur();
    let eskiyiBitir: (yanit: unknown) => void = () => {};
    const eski = new Promise((coz) => {
      eskiyiBitir = coz;
    });
    const yeni = { ...RAPOR, toplam: { gelir: 5000, maliyet: 1000 }, yedekParcaToplamDeger: 0, yedekParcaToplamMaliyet: 0 };
    vi.mocked(raporService.getAralik)
      .mockImplementationOnce(() => eski as never) // açılıştaki istek: yavaş
      .mockImplementationOnce(() => Promise.resolve({ data: yeni }) as never); // "Geçen Yıl" tıklaması: hızlı
    const user = userEvent.setup();
    sorguluRender(<Raporlar />);
    await user.click(screen.getByRole('button', { name: 'Geçen Yıl' }));
    expect(await screen.findByText('Toplam gelir')).toBeInTheDocument();
    expect(kart('Toplam gelir')).toBe('₺5.000,00');

    await act(async () => {
      eskiyiBitir({ data: RAPOR });
    }); // eski yanıt şimdi geliyor
    expect(kart('Toplam gelir')).toBe('₺5.000,00');
    expect(screen.queryByText('Rapor yüklenirken hata oluştu')).not.toBeInTheDocument(); // yok sayılır, hata sayılmaz
  });

  // ---- Önbellek (TanStack Query) ----
  test('önbellek: tarih aralığı değişince personel ve stok listeleri yeniden istenmez (tarihe bağlı değiller)', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('button', { name: 'Geçen Yıl' }));
    const y = new Date().getFullYear() - 1;
    await waitFor(() => expect(raporService.getAralik).toHaveBeenLastCalledWith(`${y}-01-01`, `${y}-12-31`));
    expect(raporService.getPersoneller).toHaveBeenCalledTimes(1);
    expect(aksesuarStokService.getAll).toHaveBeenCalledTimes(1);
  });

  test('önbellek: 30 sn içinde önceki aralığa dönünce rapor sunucuya gitmeden gelir', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('button', { name: 'Geçen Yıl' }));
    await waitFor(() => expect(raporService.getAralik).toHaveBeenCalledTimes(2));
    await screen.findByText('Toplam gelir');
    await user.click(screen.getByRole('button', { name: 'Bu Ay' }));
    expect(await screen.findByText('Toplam gelir')).toBeInTheDocument();
    expect(raporService.getAralik).toHaveBeenCalledTimes(2);
    expect(raporService.getFisKar).toHaveBeenCalledTimes(2);
  });

  test('önbellek: sayfa kapatılıp yeniden açılınca rapor yine sunucudan istenir (yeni satışlar görünsün); personel listesi istenmez', async () => {
    await ekranAc();
    const { istemci, unmount } = sonEkran;
    unmount();
    sorguluRender(<Raporlar />, { istemci });
    await waitFor(() => expect(raporService.getAralik).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(raporService.getFisKar).toHaveBeenCalledTimes(2));
    expect(raporService.getPersoneller).toHaveBeenCalledTimes(1);
  });
});

describe('Raporlar: Genel Özet', () => {
  test('toplam kartları düzeltilmiş (yedek parça dahil) toplamları gösterir', async () => {
    await ekranAc();
    expect(kart('Toplam gelir')).toBe('₺103.000,00');
    expect(kart('Toplam maliyet')).toBe('₺72.000,00');
    expect(kart('Toplam kâr')).toBe('₺21.400,00');
    expect(kart('Toplam işlem')).toBe('8');
    expect(kart('Motor stok değeri')).toBe('₺250.000,00');
  });

  test('kategori tablosu: sayı, gelir, kâr ve kâr oranı; TOPLAM satırı', async () => {
    await ekranAc();
    expect(payHaric(hucreler(satir(/^Motor Satışları/)))).toEqual(['Motor Satışları', '3', '140.000,00 ₺', '116.500,00 ₺', '19.000,00 ₺', '%13.6']);
    expect(payHaric(hucreler(satir(/^İş Emirleri \(Servis\)/)))).toEqual(['İş Emirleri (Servis)', '2', '2.500,00 ₺', '1.500,00 ₺', '1.000,00 ₺', '%40.0']);
    expect(payHaric(hucreler(satir(/^Yedek Parça \(Envanter\)/)))).toEqual(['Yedek Parça (Envanter)', '2', '3.000,00 ₺', '2.000,00 ₺', '1.000,00 ₺', '%33.3']);
    expect(payHaric(hucreler(satir(/^TOPLAM/)))).toEqual(['TOPLAM', '8', '103.000,00 ₺', '72.000,00 ₺', '21.400,00 ₺', '%20.8']);
  });

  test('kategori satırına tıklamak o sekmeye geçirir', async () => {
    const user = await ekranAc();
    await user.click(satir(/^Aksesuar Satışları/));
    expect(await screen.findByText('Aksesuar Gelir')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Aksesuar Satışları' })).toHaveAttribute('aria-selected', 'true');
  });

  test('e-ticaret kârı sunucudan değil, hesaplaKomisyon ile canlı hesaplanır ve toplam kâra girer', async () => {
    await ekranAc({ rapor: { ...RAPOR, eticaret: [ETC], eticaretGelir: 2000, eticaretMaliyet: 1200 } });
    const net = hesaplaKomisyon(
      ETC.satis_fiyati,
      ETC.alis_fiyati,
      ETC.komisyon_orani,
      ETC.kdv_orani,
      ETC.kargo_ucreti,
      ETC.adet,
      detectPlatform(ETC.platform_adi),
    ).netKar;
    expect(kart('Toplam kâr')).toBe(`₺${tl(21400 + net)}`);
    expect(payHaric(hucreler(satir(/^E-Ticaret/)))[4]).toBe(`${tl(net)} ₺`);
  });
});

describe('Raporlar: Motor Satışları', () => {
  test('Satışlar alt sekmesi: kartlar sunucu toplamlarını, tablo her motoru gösterir', async () => {
    const user = await ekranAc();
    await sekme(user, 'Motor Satışları');
    expect(await screen.findByText('Motor Kârı (Payınız)')).toBeInTheDocument();
    expect(kart('Toplam Satış')).toBe('3');
    expect(kart('Motor Gelir')).toBe('₺140.000,00');
    expect(kart('Motor Kârı (Payınız)')).toBe('₺19.000,00');
    expect(kart('Yatırımcı Payı')).toBe('₺1.000,00');
    expect(kart('Komisyoncu Payı')).toBe('₺2.500,00');
    expect(kart('Faturalı')).toBe('2');
    expect(screen.getByRole('tab', { name: 'Satışlar (3)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Komisyonlu Satışlar (2)' })).toBeInTheDocument();
    // M2: Payınız = kâr 6000 - yatırımcı payı 1000 = 5.000
    expect(hucreler(satir(/06 XYZ 789/)).slice(1)).toEqual([
      '06.10.2026',
      '06 XYZ 789',
      'Yamaha NMAX',
      '40.000,00 ₺',
      '50.000,00 ₺',
      '500,00 ₺',
      '5.000,00 ₺',
      'nakit',
      'Kesildi',
    ]);
    expect(hucreler(satir(/35 KOM 001/))[8]).toBe('nakit');
    expect(hucreler(satir(/35 KOM 001/))[9]).toBe('Kesilmedi');
  });

  test('Komisyonlu alt sekme yalnızca komisyonlu motorları toplar; komisyoncu süzgeci daraltır', async () => {
    const user = await ekranAc();
    await sekme(user, 'Motor Satışları');
    await user.click(await screen.findByRole('tab', { name: 'Komisyonlu Satışlar (2)' }));

    expect(kart('Komisyonlu Satış')).toBe('2');
    expect(kart('Motor Gelir')).toBe('₺80.000,00');
    expect(kart('Motor Maliyet')).toBe('₺65.500,00');
    expect(kart('Motor Kâr')).toBe('₺10.000,00');
    expect(kart('Toplam Komisyon')).toBe('₺2.500,00');
    expect(kart('Faturalı')).toBe('1');
    expect(screen.queryByText('34ABC123')).not.toBeInTheDocument(); // komisyonsuz motor listede yok

    await user.click(screen.getByRole('combobox', { name: /Komisyoncu Filtresi/ }));
    await user.click(screen.getByRole('option', { name: 'Zeynep Aracı (1)' }));
    expect(kart('Komisyonlu Satış')).toBe('1');
    expect(kart('Motor Gelir')).toBe('₺30.000,00');
    expect(kart('Toplam Komisyon')).toBe('₺500,00');
    expect(screen.queryByText('06XYZ789')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filtreyi Temizle' }));
    expect(kart('Komisyonlu Satış')).toBe('2');
  });

  test('satır ikonu motor detay penceresini açar; Kapat kapatır', async () => {
    const user = await ekranAc();
    await sekme(user, 'Motor Satışları');
    await user.click(within(await screen.findByRole('row', { name: /06 XYZ 789/ })).getByRole('button'));

    const pencere = await screen.findByRole('dialog');
    expect(within(pencere).getByText('Motor Satış Detayı - 06 XYZ 789')).toBeInTheDocument();
    expect(within(pencere).getByText('Ali Komisyoncu', { exact: false })).toBeInTheDocument();
    // yatırımcı payı varsa "Toplam Kâr" ve "Yatırımcı Payı" satırları da görünür; net kâr = 6000 - 1000
    expect(within(pencere).getByText('Yatırımcı Payı')).toBeInTheDocument();
    expect(within(pencere).getByText('Net Kâr (Payınız)').nextElementSibling).toHaveTextContent('5.000,00 ₺');

    await user.click(within(pencere).getByRole('button', { name: 'Kapat' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('motor satışı yoksa bilgi mesajı görünür', async () => {
    const user = await ekranAc({ rapor: { ...RAPOR, motorlar: [] } });
    await sekme(user, 'Motor Satışları');
    expect(await screen.findByText('Seçilen tarih aralığında motor satışı bulunamadı.')).toBeInTheDocument();
  });
});

describe('Raporlar: İş Emirleri', () => {
  test('kartlar ve tablo; personel süzgeci kartları ve satırları daraltır', async () => {
    const user = await ekranAc();
    await sekme(user, 'İş Emirleri');
    expect(await screen.findByText('Toplam İş Emri')).toBeInTheDocument();
    expect(kart('Toplam İş Emri')).toBe('2');
    expect(kart('Servis Gelir')).toBe('₺2.500,00');
    expect(kart('Servis Kâr')).toBe('₺1.000,00');
    expect(hucreler(satir(/#101/)).slice(1)).toEqual([
      '03.10.2026',
      '#101',
      'Ayşe Yılmaz',
      '05551112233',
      'Honda PCX',
      '12.500 km',
      'Usta Mehmet',
      'Fren sesi',
      '1.500,00 ₺',
      '900,00 ₺',
      '600,00 ₺',
    ]);

    await user.click(screen.getByRole('combobox', { name: 'Personel' }));
    await user.click(screen.getByRole('option', { name: 'Usta Ali' }));
    expect(kart('Toplam İş Emri')).toBe('1');
    expect(kart('Servis Gelir')).toBe('₺1.000,00');
    expect(kart('Servis Kâr')).toBe('₺400,00');
    expect(screen.queryByText('Ayşe Yılmaz')).not.toBeInTheDocument();
    expect(screen.getByText('Veli Demir')).toBeInTheDocument();
  });

  test('Personel süzgeci yalnızca İş Emirleri sekmesinde görünür', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('combobox', { name: 'Personel' })).not.toBeInTheDocument();
    await sekme(user, 'İş Emirleri');
    expect(screen.getByRole('combobox', { name: 'Personel' })).toBeInTheDocument();
  });

  test('detay penceresi parça listesini JSON metninden okur ve toplamları hesaplar', async () => {
    const user = await ekranAc();
    await sekme(user, 'İş Emirleri');
    await user.click(within(await screen.findByRole('row', { name: /#101/ })).getByRole('button'));

    const pencere = await screen.findByRole('dialog');
    expect(within(pencere).getByText('İş Emri #101 - Ayşe Yılmaz')).toBeInTheDocument();
    expect(within(pencere).getByText('Fren balatası')).toBeInTheDocument();
    expect(within(pencere).getByText('Fren sesi')).toBeInTheDocument(); // arıza kutusu
    // fiyat 600, maliyet 2 adet x 150 = 300, kâr 300
    expect(kart('Toplam')).toBe('₺600');
    expect(kart('Maliyet')).toBe('₺300');
    expect(kart('Kâr')).toBe('₺300');
  });
});

describe('Raporlar: Aksesuar, E-Ticaret, Yedek Parça', () => {
  test('aksesuar: kartlar, tablo, detay penceresinde stoktan marka/renk zenginleştirmesi', async () => {
    const user = await ekranAc();
    await sekme(user, 'Aksesuar Satışları');
    expect(await screen.findByText('Aksesuar Gelir')).toBeInTheDocument();
    expect(kart('Toplam Satış')).toBe('1');
    expect(kart('Aksesuar Gelir')).toBe('₺2.000,00');
    expect(kart('Aksesuar Kâr')).toBe('₺400,00');
    const row = satir(/Mehmet Kaya/);
    expect(hucreler(row).slice(1)).toEqual(['02.10.2026', 'Mehmet Kaya', '05330000000', 'ofis', 'nakit', '2.000,00 ₺', '1.600,00 ₺', '400,00 ₺', 'Tamamlandı']);

    await user.click(within(row).getByRole('button'));
    const pencere = await screen.findByRole('dialog');
    expect(within(pencere).getByText('Aksesuar Satış Detayı - Mehmet Kaya')).toBeInTheDocument();
    const urunSatiri = within(pencere).getByRole('row', { name: /^Kask/ });
    expect(hucreler(urunSatiri)).toEqual(['Kask', 'LS2', 'Trendyol', 'L', 'Siyah', '1', '₺1.600', '₺2.000', '₺400']);
    expect(kart('Satış')).toBe('₺2.000');
  });

  test('e-ticaret: tablo ve detay penceresi hesaplaKomisyon sonuçlarını kullanır', async () => {
    const user = await ekranAc({ rapor: { ...RAPOR, eticaret: [ETC], eticaretGelir: 2000, eticaretMaliyet: 1200 } });
    const h = hesaplaKomisyon(ETC.satis_fiyati, ETC.alis_fiyati, ETC.komisyon_orani, ETC.kdv_orani, ETC.kargo_ucreti, ETC.adet, 'trendyol');
    await sekme(user, 'E-Ticaret');
    expect(await screen.findByText('E-Ticaret Kâr')).toBeInTheDocument();
    expect(kart('E-Ticaret Kâr')).toBe(`₺${tl(h.netKar)}`);
    const row = satir(/Kask Visor/);
    expect(hucreler(row).slice(1)).toEqual([
      '02.10.2026',
      'Trendyol',
      'Kask Visor',
      '2',
      '600,00 ₺',
      '1.000,00 ₺',
      '50,00 ₺',
      `${tl(h.komisyonTutari)} ₺ (%15)`,
      `${tl(h.toplamKomisyon)} ₺`,
      `${tl(h.netKar)} ₺`,
    ]);

    await user.click(within(row).getByRole('button'));
    const pencere = await screen.findByRole('dialog');
    expect(within(pencere).getByText('E-Ticaret Satış Detayı - Kask Visor')).toBeInTheDocument();
    // sayfadaki "Toplam Satış" kartıyla karışmasın diye yalnızca pencerenin içinde aranır
    expect(kart('Toplam Satış', within(pencere))).toBe('₺2.000,00'); // 1000 x 2 adet
    expect(kart('Toplam Maliyet', within(pencere))).toBe('₺1.200,00'); // 600 x 2 adet
    expect(kart('Toplam Kesinti', within(pencere))).toBe(`₺${tl(h.toplamKomisyon)}`);
  });

  test('yedek parça: kartlar ve ürün başına kâr/oran', async () => {
    const user = await ekranAc();
    await sekme(user, 'Yedek Parça');
    expect(await screen.findByText('Potansiyel Kâr')).toBeInTheDocument();
    expect(kart('Toplam Ürün')).toBe('2');
    expect(kart('Toplam Satış Değeri')).toBe('₺3.000,00');
    expect(kart('Toplam Maliyet')).toBe('₺2.000,00');
    expect(kart('Potansiyel Kâr')).toBe('₺1.000,00');
    expect(hucreler(satir(/Zincir Dişli Seti/))).toEqual(['Zincir Dişli Seti', '1.000,00 ₺', '1.800,00 ₺', '800,00 ₺', '%44.4']);
  });
});

describe('Raporlar: Fiş Kâr Analizi ve Yatırımcılar', () => {
  test('fiş kâr: kartlar, satır ve kâr oranı', async () => {
    const user = await ekranAc();
    await sekme(user, 'Fiş Kâr Analizi');
    expect(await screen.findByText('Toplam Fiş')).toBeInTheDocument();
    expect(kart('Toplam Fiş')).toBe('1');
    expect(kart('Toplam Gelir')).toBe('₺1.500,00');
    expect(kart('Toplam Kâr')).toBe('₺600,00');
    expect(hucreler(satir(/#101/))).toEqual(['03.10.2026', '#101', 'Ayşe Yılmaz', 'Tamamlandı', '1.500,00 ₺', '900,00 ₺', '600,00 ₺', '%40.0']);
  });

  test('fiş yoksa bilgi mesajı görünür', async () => {
    const user = await ekranAc({ fisKar: [] });
    await sekme(user, 'Fiş Kâr Analizi');
    expect(await screen.findByText('Seçilen tarih aralığında tamamlanmış fiş bulunamadı.')).toBeInTheDocument();
  });

  test('admin: yatırımcı satırı, sunucudaki stok bilgisini motor satışlarından hesaplanan satış/kârla birleştirir', async () => {
    const user = await ekranAc();
    await sekme(user, 'Yatırımcılar');
    expect(await screen.findByText('Yatırımcı Sayısı')).toBeInTheDocument();
    expect(kart('Yatırımcı Sayısı')).toBe('1');
    expect(kart('Toplam Stok')).toBe('3');
    expect(kart('Toplam Satılan')).toBe('1');
    expect(kart('Toplam Yatırımcı Kârı')).toBe('₺1.000,00');
    // stok 3 ve değer 90.000 (özetten); satılan 1, satış 50.000, yatırımcı 1.000, işletme 5.000 (motorlardan)
    expect(hucreler(satir(/Yatırımcı Veli/))).toEqual(['Yatırımcı Veli', '3', '1', '90.000,00 ₺', '50.000,00 ₺', '1.000,00 ₺', '5.000,00 ₺']);
  });
});

describe('Raporlar: mobil görünüm', () => {
  beforeEach(() => {
    window.matchMedia = (query) => ({
      matches: true,
      media: query,
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

  test('dar ekranda tablo yerine kart listesi çizilir (Genel Özet ve Motor Satışları)', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('TOPLAM')).toBeInTheDocument();
    expect(screen.getByText('3 işlem')).toBeInTheDocument(); // motor kategorisi kartı

    await sekme(user, 'Motor Satışları');
    expect(await screen.findByText('34ABC123')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(yazi('Alış: 50.000,00 ₺')).toBeInTheDocument();
  });
});

// ---- Sıfır motor satışları ---------------------------------------------------------------------------------------
// Sıfır satışlar motor satışına (adet, gelir, toplam kâr) GİRER; kârları ayrıca gösterilir ve toplam iki kez sayılmaz.
describe('Raporlar: sıfır motor satışları', () => {
  const SF = {
    plaka: null,
    marka: 'Honda',
    model: 'PCX 125',
    motor_durumu: 'sifir',
    alis_fiyati: 95000,
    satis_fiyati: 120000,
    masraflar: 0,
    kar: 25000,
    yatirimci_kar: 0,
    fatura_kesildi: true,
    satis_tarihi: '2026-10-08T12:00:00',
  };
  const RAPOR_SIFIR = {
    ...RAPOR,
    motorlar: [M1, M2, M3, SF],
    motorGelir: 260000,
    motorMaliyet: 211500,
    motorKar: 44000,
    motorSifirAdet: 1,
    motorSifirGelir: 120000,
    motorSifirMaliyet: 95000,
    motorSifirKar: 25000,
  };

  test('Genel Özet: Motor Satışları sıfırı içerir; altında "İçinden sıfır motor" satırı toplama ikinci kez girmez', async () => {
    await ekranAc({ rapor: RAPOR_SIFIR });
    expect(payHaric(hucreler(satir(/^Motor Satışları/)))).toEqual(['Motor Satışları', '4', '260.000,00 ₺', '211.500,00 ₺', '44.000,00 ₺', '%16.9']);
    expect(payHaric(hucreler(satir(/^İçinden sıfır motor/)))).toEqual(['İçinden sıfır motor', '1', '120.000,00 ₺', '95.000,00 ₺', '25.000,00 ₺', '%20.8']);
    expect(hucreler(satir(/^TOPLAM/))[1]).toBe('9'); // 4 motor + 2 iş emri + 1 aksesuar + 2 yedek parça (sıfır ayrıca sayılmaz)
  });

  test('sıfır satışı yoksa alt satır çıkmaz', async () => {
    await ekranAc();
    expect(screen.queryByRole('row', { name: /^İçinden sıfır motor/ })).not.toBeInTheDocument();
  });

  test('Motor Satışları: ikinci el ve sıfır kârı ayrı kartlarda; Sıfır Satışlar alt sekmesi yalnızca sıfırları listeler', async () => {
    const user = await ekranAc({ rapor: RAPOR_SIFIR });
    await sekme(user, 'Motor Satışları');
    expect(kart('Toplam Satış')).toBe('4');
    expect(kart('Motor Kârı (Payınız)')).toBe('₺44.000,00');
    expect(kart('İkinci El Kârı')).toBe('₺19.000,00');
    expect(kart('Sıfır Kârı')).toBe('₺25.000,00');
    await user.click(screen.getByRole('tab', { name: 'Sıfır Satışlar (1)' }));
    expect(kart('Sıfır Satış')).toBe('1');
    expect(kart('Sıfır Gelir')).toBe('₺120.000,00');
    expect(kart('Sıfır Kârı')).toBe('₺25.000,00');
    const satirlar = screen.getAllByRole('row').slice(1);
    expect(satirlar).toHaveLength(1);
    expect(within(satirlar[0]).getByText('Sıfır')).toBeInTheDocument();
  });
});
