/*
 * Belge Arşivi (muhasebeci ve admin için salt okunur) için KARAKTERİZASYON testleri: plakaya göre gruplar, arama (plaka boşluk/tire
 * duyarsız, marka, dosya adı), satış/alış ayı süzgeci, belge açma/indirme, boş ve hata durumları. API ve belge açma sahte (mock).
 */
import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BelgeArsivi from './BelgeArsivi';
import { satisBelgeService } from './motorApi';
import { belgeAc, belgeOnizlenebilir } from './SatisBelgeleri';

vi.mock('./motorApi', () => ({ satisBelgeService: { arsiv: vi.fn() } }));
vi.mock('./SatisBelgeleri', () => ({ belgeAc: vi.fn(), belgeOnizlenebilir: vi.fn() }));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
// Honda: satılmış (alış Eylül, satış Ekim), 2 belge. Yamaha: stokta (yalnız alış Eylül), 1 belge. Plakasız motor: 1 belge.
const HONDA = {
  motor_id: 1,
  plaka: '34ABC123',
  marka: 'Honda',
  model: 'PCX',
  durum: 'tamamlandi',
  alis_tarihi: '2026-09-15',
  satis_tarihi: '2026-10-02',
  belgeler: [
    { id: 101, dosya_adi: 'ruhsat.pdf', boyut: 2048, created_at: '2026-10-02T09:00:00', mime: 'application/pdf' },
    { id: 102, dosya_adi: 'noter-satis.zip', boyut: 3 * 1024 * 1024, created_at: '2026-10-03T09:00:00', mime: 'application/zip' },
  ],
};
const YAMAHA = {
  motor_id: 2,
  plaka: '35 XYZ 001',
  marka: 'Yamaha',
  model: 'NMAX',
  durum: 'stokta',
  alis_tarihi: '2026-09-20',
  satis_tarihi: null,
  belgeler: [{ id: 201, dosya_adi: 'alis-faturasi.pdf', boyut: 100, created_at: '2026-09-21T09:00:00', mime: 'application/pdf' }],
};
const PLAKASIZ = {
  motor_id: 3,
  plaka: '',
  marka: null,
  model: null,
  durum: 'stokta',
  alis_tarihi: null,
  satis_tarihi: null,
  belgeler: [{ id: 301, dosya_adi: 'belge.pdf', boyut: 50, created_at: '2026-08-01T09:00:00', mime: 'application/pdf' }],
};
const GRUPLAR = [HONDA, YAMAHA, PLAKASIZ];

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
const ekranAc = async (gruplar: unknown[] = GRUPLAR) => {
  vi.mocked(satisBelgeService.arsiv).mockResolvedValue({ data: gruplar } as never);
  const user = userEvent.setup();
  render(<BelgeArsivi />);
  await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  return user;
};
const ARAMA = 'Plaka, marka veya dosya adı ara';
const grup = (dosyaAdi: string) => screen.getByText(dosyaAdi).closest('div[class*="MuiBox-root"]')?.parentElement as HTMLElement;
const ayYaz = (etiket: string, deger: string) => fireEvent.change(screen.getByLabelText(etiket), { target: { value: deger } });

beforeEach(() => {
  vi.mocked(belgeOnizlenebilir).mockImplementation(((b: { mime?: string }) => b.mime === 'application/pdf') as never);
  vi.mocked(belgeAc).mockResolvedValue(undefined as never);
});

// ---- Liste -------------------------------------------------------------------------------------------------------
describe('Belge Arşivi: liste', () => {
  test('yüklenirken ilerleme göstergesi çıkar, sonra araç ve dosya sayısı yazılır', async () => {
    vi.mocked(satisBelgeService.arsiv).mockReturnValue(new Promise(() => {}) as never); // hiç dönmeyen istek
    render(<BelgeArsivi />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('"3 araç • 4 dosya" özeti; her grupta plaka, marka model, tarihler ve durum damgası', async () => {
    await ekranAc();
    expect(screen.getByText('3 araç • 4 dosya')).toBeInTheDocument();
    expect(screen.getByText('Honda PCX')).toBeInTheDocument();
    expect(screen.getByText('Alış 15.09.2026 • Satış 02.10.2026')).toBeInTheDocument();
    expect(screen.getByText('Alış 20.09.2026')).toBeInTheDocument(); // satış yoksa yalnız alış
    expect(screen.getByText('Satıldı')).toBeInTheDocument();
    expect(screen.getAllByText('Stokta')).toHaveLength(2);
  });

  test('plakası olmayan motor "PLAKASIZ" başlığıyla listelenir', async () => {
    await ekranAc();
    expect(screen.getByText('PLAKASIZ')).toBeInTheDocument();
  });

  test('belge satırında dosya adı, boyut (KB/MB) ve eklenme tarihi görünür', async () => {
    await ekranAc();
    expect(screen.getByText('2 KB • 02.10.2026')).toBeInTheDocument();
    expect(screen.getByText('3.0 MB • 03.10.2026')).toBeInTheDocument();
    expect(screen.getByText('1 KB • 21.09.2026')).toBeInTheDocument(); // 100 bayt en az 1 KB gösterilir
  });

  test('hiç belge yoksa "Henüz belge eklenmemiş." yazar', async () => {
    await ekranAc([]);
    expect(screen.getByText('Henüz belge eklenmemiş.')).toBeInTheDocument();
  });

  test('liste yüklenemezse hata uyarısı ve boş liste mesajı çıkar', async () => {
    vi.mocked(satisBelgeService.arsiv).mockRejectedValue(new Error('ağ'));
    render(<BelgeArsivi />);
    expect(await screen.findByText('Belgeler yüklenemedi')).toBeInTheDocument();
    expect(screen.getByText('Henüz belge eklenmemiş.')).toBeInTheDocument();
  });
});

// ---- Arama -------------------------------------------------------------------------------------------------------
describe('Belge Arşivi: arama', () => {
  test('plaka boşluk, tire ve harf büyüklüğü fark etmeden bulunur', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), '35-xyz 001');
    expect(screen.getByText('Yamaha NMAX')).toBeInTheDocument();
    expect(screen.queryByText('Honda PCX')).not.toBeInTheDocument();
    expect(screen.getByText('1 araç • 1 dosya')).toBeInTheDocument();
  });

  test('marka ve dosya adıyla da aranır; dosya adı eşleşirse araç tüm belgeleriyle gelir', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), 'honda');
    expect(screen.getByText('1 araç • 2 dosya')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(ARAMA));
    await user.type(screen.getByPlaceholderText(ARAMA), 'noter satis'); // "noter-satis.zip"
    expect(screen.getByText('Honda PCX')).toBeInTheDocument();
    expect(screen.getByText('ruhsat.pdf')).toBeInTheDocument(); // aynı aracın öbür belgesi de görünür
    expect(screen.queryByText('Yamaha NMAX')).not.toBeInTheDocument();
  });

  test('eşleşme yoksa "Aramaya veya seçilen aya uyan belge yok." çıkar (boş arşivden farklı mesaj)', async () => {
    const user = await ekranAc();
    await user.type(screen.getByPlaceholderText(ARAMA), 'zzzz');
    expect(screen.getByText('Aramaya veya seçilen aya uyan belge yok.')).toBeInTheDocument();
    expect(screen.queryByText('Henüz belge eklenmemiş.')).not.toBeInTheDocument();
  });
});

// ---- Ay süzgeci --------------------------------------------------------------------------------------------------
describe('Belge Arşivi: ay süzgeci', () => {
  test('varsayılan satış tarihine göre: Ekim seçilince yalnız o ay satılan gelir; satışı olmayan motor elenir', async () => {
    await ekranAc();
    ayYaz('Satış ayı', '2026-10');
    expect(screen.getByText('Honda PCX')).toBeInTheDocument();
    expect(screen.queryByText('Yamaha NMAX')).not.toBeInTheDocument();
    expect(screen.queryByText('PLAKASIZ')).not.toBeInTheDocument();
    expect(screen.getByText('1 araç • 2 dosya')).toBeInTheDocument();
  });

  test('"Alış tarihi" seçilince aynı ay alış tarihine göre bakılır (Eylül: Honda ve Yamaha)', async () => {
    const user = await ekranAc();
    await user.click(screen.getByRole('button', { name: 'Alış tarihi' }));
    ayYaz('Alış ayı', '2026-09');
    expect(screen.getByText('Honda PCX')).toBeInTheDocument();
    expect(screen.getByText('Yamaha NMAX')).toBeInTheDocument();
    expect(screen.queryByText('PLAKASIZ')).not.toBeInTheDocument();
    expect(screen.getByText('2 araç • 3 dosya')).toBeInTheDocument();
  });

  test('"Temizle" süzgeci kaldırır ve tüm liste döner; ay boşken düğme görünmez', async () => {
    const user = await ekranAc();
    expect(screen.queryByRole('button', { name: 'Temizle' })).not.toBeInTheDocument();
    ayYaz('Satış ayı', '2026-10');
    await user.click(screen.getByRole('button', { name: 'Temizle' }));
    expect(screen.getByText('3 araç • 4 dosya')).toBeInTheDocument();
  });

  test('ay ve arama birlikte uygulanır', async () => {
    const user = await ekranAc();
    ayYaz('Satış ayı', '2026-10');
    await user.type(screen.getByPlaceholderText(ARAMA), 'yamaha');
    expect(screen.getByText('Aramaya veya seçilen aya uyan belge yok.')).toBeInTheDocument();
  });
});

// ---- Belge açma / indirme ----------------------------------------------------------------------------------------
describe('Belge Arşivi: belge açma ve indirme', () => {
  test('önizlenebilen belgede "Görüntüle" ve "İndir" var; önizlenemeyende yalnız "İndir"', async () => {
    await ekranAc();
    const pdf = grup('ruhsat.pdf');
    expect(within(pdf).getByRole('button', { name: 'Görüntüle' })).toBeInTheDocument();
    expect(within(pdf).getByRole('button', { name: 'İndir' })).toBeInTheDocument();
    const zip = grup('noter-satis.zip');
    expect(within(zip).queryByRole('button', { name: 'Görüntüle' })).not.toBeInTheDocument();
    expect(within(zip).getByRole('button', { name: 'İndir' })).toBeInTheDocument();
  });

  test('"Görüntüle" belgeAc(belge, true), "İndir" belgeAc(belge, false) çağırır', async () => {
    const user = await ekranAc();
    await user.click(within(grup('ruhsat.pdf')).getByRole('button', { name: 'Görüntüle' }));
    await waitFor(() => expect(belgeAc).toHaveBeenLastCalledWith(expect.objectContaining({ id: 101 }), true));
    await user.click(within(grup('noter-satis.zip')).getByRole('button', { name: 'İndir' }));
    await waitFor(() => expect(belgeAc).toHaveBeenLastCalledWith(expect.objectContaining({ id: 102 }), false));
  });

  test('belge açılamazsa "Belge açılamadı" uyarısı çıkar ve kapatılabilir; düğmeler geri gelir', async () => {
    vi.mocked(belgeAc).mockRejectedValueOnce(new Error('indirilemedi'));
    const user = await ekranAc();
    await user.click(within(grup('ruhsat.pdf')).getByRole('button', { name: 'Görüntüle' }));
    const uyari = await screen.findByText('Belge açılamadı');
    expect(within(grup('ruhsat.pdf')).getByRole('button', { name: 'Görüntüle' })).toBeInTheDocument(); // ilerleme göstergesi kalkmış
    await user.click(within(uyari.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Belge açılamadı')).not.toBeInTheDocument());
  });

  test('açma sürerken o belgenin düğmeleri yerine ilerleme göstergesi çıkar', async () => {
    let bitir: () => void = () => {};
    vi.mocked(belgeAc).mockImplementationOnce(() => new Promise<void>((coz) => (bitir = coz)) as never);
    const user = await ekranAc();
    await user.click(within(grup('ruhsat.pdf')).getByRole('button', { name: 'Görüntüle' }));
    expect(within(grup('ruhsat.pdf')).getByRole('progressbar')).toBeInTheDocument();
    expect(within(grup('ruhsat.pdf')).queryByRole('button', { name: 'Görüntüle' })).not.toBeInTheDocument();
    bitir();
    await waitFor(() => expect(within(grup('ruhsat.pdf')).getByRole('button', { name: 'Görüntüle' })).toBeInTheDocument());
  });
});
