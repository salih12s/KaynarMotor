/*
 * Kullanıcı Yönetimi sayfası için KARAKTERİZASYON testleri (yetki ve hesap işleri, bu yüzden kurallar tek tek sınanır):
 * liste ve rol/onay etiketleri, bekleyen hesabı onaylama/reddetme, admin hesabının silinememesi, silme onayı, yeni kullanıcı
 * (zorunlu alanlar, en az 8 karakter şifre, rol seçenekleri), şifre sıfırlama, hata gösterimi, mobil kart görünümü. API sahte (mock).
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Kullanicilar from './Kullanicilar';
import { authService } from './authApi';

vi.mock('./authApi', () => ({
  authService: { getUsers: vi.fn(), createUser: vi.fn(), approveUser: vi.fn(), rejectUser: vi.fn(), deleteUser: vi.fn(), setSifre: vi.fn() },
}));

// ---- Sabit test verisi -------------------------------------------------------------------------------------------
const ADMIN = { id: 1, kullanici_adi: 'admin', ad_soyad: 'Yönetici', rol: 'admin', onay_durumu: 'onaylandi' };
const PERSONEL = { id: 2, kullanici_adi: 'ahmet', ad_soyad: 'Ahmet Usta', rol: 'personel', onay_durumu: 'onaylandi' };
const BEKLEYEN = { id: 3, kullanici_adi: 'yeni', ad_soyad: 'Yeni Başvuru', rol: 'personel', onay_durumu: 'beklemede' };
const YATIRIMCI = { id: 4, kullanici_adi: 'veli', ad_soyad: 'Veli Yatırım', rol: 'yatirimci', onay_durumu: 'reddedildi' };
const MUHASEBE = { id: 5, kullanici_adi: 'muhasebe', ad_soyad: 'Muhasebe Hanım', rol: 'muhasebeci', onay_durumu: 'onaylandi' };
const LISTE = [ADMIN, PERSONEL, BEKLEYEN, YATIRIMCI, MUHASEBE];

// ---- Yardımcılar -------------------------------------------------------------------------------------------------
type Kullanim = ReturnType<typeof userEvent.setup>;
const ekranAc = async () => {
  const user = userEvent.setup();
  render(<Kullanicilar />);
  await screen.findByText('Ahmet Usta');
  return user;
};
const satir = (ad: string) => screen.getByRole('row', { name: new RegExp(ad) });
const ikon = (kapsam: HTMLElement, ad: string) => within(kapsam).getByTestId(ad);
const yok = (kapsam: HTMLElement, ad: string) => within(kapsam).queryByTestId(ad);
// İşlem düğmeleri erişilebilir adla bulunur (Onayla, Reddet, Şifre sıfırla, Sil)
const dugme = (kapsam: HTMLElement, ad: string) => within(kapsam).getByRole('button', { name: ad });
const dugmeYok = (kapsam: HTMLElement, ad: string) => within(kapsam).queryByRole('button', { name: ad });
const olusturAc = async (user: Kullanim) => {
  await user.click(screen.getByRole('button', { name: 'Kullanıcı / Yatırımcı Ekle' }));
  return screen.findByRole('dialog');
};

beforeEach(() => {
  vi.mocked(authService.getUsers).mockResolvedValue({ data: LISTE } as never);
  vi.mocked(authService.createUser).mockResolvedValue({ data: {} } as never);
  vi.mocked(authService.approveUser).mockResolvedValue({ data: {} } as never);
  vi.mocked(authService.rejectUser).mockResolvedValue({ data: {} } as never);
  vi.mocked(authService.deleteUser).mockResolvedValue({ data: {} } as never);
  vi.mocked(authService.setSifre).mockResolvedValue({ data: {} } as never);
});

// ---- Liste -------------------------------------------------------------------------------------------------------
describe('Kullanıcılar: liste', () => {
  test('sütunlar, ad/kullanıcı adı, rol etiketi ve onay damgası', async () => {
    await ekranAc();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Ad Soyad', 'Kullanıcı Adı', 'Rol', 'Durum', 'İşlemler']);
    const hucre = (ad: string) =>
      within(satir(ad))
        .getAllByRole('cell')
        .map((c) => c.textContent);
    expect(hucre('Yönetici').slice(0, 4)).toEqual(['Yönetici', 'admin', 'admin', 'Onaylandı']);
    expect(hucre('Ahmet Usta').slice(0, 4)).toEqual(['Ahmet Usta', 'ahmet', 'personel', 'Onaylandı']);
    expect(hucre('Yeni Başvuru').slice(0, 4)).toEqual(['Yeni Başvuru', 'yeni', 'personel', 'Onay bekliyor']);
    expect(hucre('Veli Yatırım').slice(0, 4)).toEqual(['Veli Yatırım', 'veli', 'yatırımcı', 'Reddedildi']);
    expect(hucre('Muhasebe Hanım').slice(0, 4)).toEqual(['Muhasebe Hanım', 'muhasebe', 'muhasebeci', 'Onaylandı']);
  });

  test('yetkileri Yetkilendirme sayfasından ayarlama notu görünür; şifre hiçbir yerde gösterilmez', async () => {
    await ekranAc();
    expect(screen.getByText(/Yetkilendirme/, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText(/plain_sifre|düz metin/i)).not.toBeInTheDocument();
  });

  test('liste yüklenemezse hata uyarısı çıkar ve kapatılabilir', async () => {
    vi.mocked(authService.getUsers).mockRejectedValue(new Error('ağ'));
    const user = userEvent.setup();
    render(<Kullanicilar />);
    const uyari = await screen.findByText('Kullanıcılar yüklenemedi');
    expect(uyari).toBeInTheDocument();
    await user.click(within(uyari.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Kullanıcılar yüklenemedi')).not.toBeInTheDocument());
  });
});

// ---- Onay / red --------------------------------------------------------------------------------------------------
describe('Kullanıcılar: başvuru onayı', () => {
  test('onay ve ret düğmeleri yalnızca "onay bekliyor" hesapta görünür', async () => {
    await ekranAc();
    expect(dugme(satir('Yeni Başvuru'), 'Onayla')).toBeInTheDocument();
    expect(dugme(satir('Yeni Başvuru'), 'Reddet')).toBeInTheDocument();
    for (const ad of ['Yönetici', 'Ahmet Usta', 'Veli Yatırım', 'Muhasebe Hanım']) {
      expect(dugmeYok(satir(ad), 'Onayla')).toBeNull();
      expect(dugmeYok(satir(ad), 'Reddet')).toBeNull();
    }
  });

  test('onaylama approveUser(id) çağırır ve listeyi yeniler', async () => {
    const user = await ekranAc();
    const yuklemeSayisi = vi.mocked(authService.getUsers).mock.calls.length;
    await user.click(dugme(satir('Yeni Başvuru'), 'Onayla'));
    await waitFor(() => expect(authService.approveUser).toHaveBeenCalledWith(3));
    await waitFor(() => expect(vi.mocked(authService.getUsers).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
    expect(authService.rejectUser).not.toHaveBeenCalled();
  });

  test('reddetme rejectUser(id) çağırır', async () => {
    const user = await ekranAc();
    await user.click(dugme(satir('Yeni Başvuru'), 'Reddet'));
    await waitFor(() => expect(authService.rejectUser).toHaveBeenCalledWith(3));
    expect(authService.approveUser).not.toHaveBeenCalled();
  });

  test('onaylama başarısız olursa "Onaylama hatası" uyarısı çıkar', async () => {
    vi.mocked(authService.approveUser).mockRejectedValue(new Error('x'));
    const user = await ekranAc();
    await user.click(dugme(satir('Yeni Başvuru'), 'Onayla'));
    expect(await screen.findByText('Onaylama hatası')).toBeInTheDocument();
  });
});

// ---- Silme -------------------------------------------------------------------------------------------------------
describe('Kullanıcılar: silme', () => {
  test('admin hesabında sil düğmesi yoktur; diğer rollerde vardır', async () => {
    await ekranAc();
    expect(yok(satir('Yönetici'), 'DeleteIcon')).toBeNull();
    for (const ad of ['Ahmet Usta', 'Yeni Başvuru', 'Veli Yatırım', 'Muhasebe Hanım']) expect(ikon(satir(ad), 'DeleteIcon')).toBeInTheDocument();
  });

  test('silme önce onay penceresi açar (kullanıcının adıyla); "İptal" istek göndermez; "Sil" deleteUser(id) çağırır ve listeyi yeniler', async () => {
    const user = await ekranAc();
    await user.click(ikon(satir('Ahmet Usta'), 'DeleteIcon'));
    const p = await screen.findByRole('dialog');
    expect(p).toHaveTextContent('Ahmet Usta kullanıcısını silmek istediğinizden emin misiniz?');
    await user.click(within(p).getByRole('button', { name: 'İptal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(authService.deleteUser).not.toHaveBeenCalled();
    const yuklemeSayisi = vi.mocked(authService.getUsers).mock.calls.length;
    await user.click(ikon(satir('Ahmet Usta'), 'DeleteIcon'));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(authService.deleteUser).toHaveBeenCalledWith(2));
    await waitFor(() => expect(vi.mocked(authService.getUsers).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
  });

  test('sunucu silmeyi reddederse mesaj sayfada gösterilir', async () => {
    vi.mocked(authService.deleteUser).mockRejectedValue({ response: { data: { message: 'Son admin silinemez' } } });
    const user = await ekranAc();
    await user.click(ikon(satir('Ahmet Usta'), 'DeleteIcon'));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }));
    expect(await screen.findByText('Son admin silinemez')).toBeInTheDocument();
  });
});

// ---- Yeni kullanıcı ----------------------------------------------------------------------------------------------
describe('Kullanıcılar: yeni kullanıcı / yatırımcı', () => {
  test('varsayılan rol yatırımcı; seçenekler yatırımcı, personel, muhasebeci (admin oluşturulamaz)', async () => {
    const user = await ekranAc();
    const p = await olusturAc(user);
    const rol = within(p).getByRole('combobox', { name: 'Rol' });
    expect(rol).toHaveTextContent('Yatırımcı');
    await user.click(rol);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Yatırımcı', 'Personel', 'Muhasebeci (sadece Belge Arşivi)']);
  });

  test('boş alan bırakılırsa "Tüm alanlar zorunludur" der ve sunucuya gitmez', async () => {
    const user = await ekranAc();
    const p = await olusturAc(user);
    await user.type(within(p).getByLabelText(/Ad Soyad/), 'Zeynep Kaya');
    await user.click(within(p).getByRole('button', { name: 'Oluştur' }));
    expect(await within(p).findByText('Tüm alanlar zorunludur')).toBeInTheDocument();
    expect(authService.createUser).not.toHaveBeenCalled();
  });

  test('şifre boşsa (ad ve kullanıcı adı dolu) "kısa şifre" değil "Tüm alanlar zorunludur" denir', async () => {
    const user = await ekranAc();
    const p = await olusturAc(user);
    await user.type(within(p).getByLabelText(/Ad Soyad/), 'Zeynep Kaya');
    await user.type(within(p).getByLabelText(/Kullanıcı Adı/), 'zeynep');
    await user.click(within(p).getByRole('button', { name: 'Oluştur' }));
    expect(await within(p).findByText('Tüm alanlar zorunludur')).toBeInTheDocument();
    expect(within(p).queryByText('Şifre en az 8 karakter olmalıdır')).not.toBeInTheDocument();
    expect(authService.createUser).not.toHaveBeenCalled();
  });

  test('şifre 8 karakterden kısaysa reddedilir; tam 8 karakter kabul edilir', async () => {
    const user = await ekranAc();
    const p = await olusturAc(user);
    await user.type(within(p).getByLabelText(/Ad Soyad/), 'Zeynep Kaya');
    await user.type(within(p).getByLabelText(/Kullanıcı Adı/), 'zeynep');
    await user.type(within(p).getByLabelText(/Şifre/), '1234567');
    await user.click(within(p).getByRole('button', { name: 'Oluştur' }));
    expect(await within(p).findByText('Şifre en az 8 karakter olmalıdır')).toBeInTheDocument();
    expect(authService.createUser).not.toHaveBeenCalled();
    await user.type(within(p).getByLabelText(/Şifre/), '8');
    await user.click(within(p).getByRole('button', { name: 'Oluştur' }));
    await waitFor(() => expect(authService.createUser).toHaveBeenCalledTimes(1));
  });

  test('geçerli form createUser çağırır, pencere kapanır, liste yenilenir; form sonraki açılışta boştur', async () => {
    const user = await ekranAc();
    const p = await olusturAc(user);
    await user.type(within(p).getByLabelText(/Ad Soyad/), 'Zeynep Kaya');
    await user.type(within(p).getByLabelText(/Kullanıcı Adı/), 'zeynep');
    await user.type(within(p).getByLabelText(/Şifre/), 'guvenli-sifre');
    const yuklemeSayisi = vi.mocked(authService.getUsers).mock.calls.length;
    await user.click(within(p).getByRole('button', { name: 'Oluştur' }));
    await waitFor(() =>
      expect(authService.createUser).toHaveBeenCalledWith({ kullanici_adi: 'zeynep', sifre: 'guvenli-sifre', ad_soyad: 'Zeynep Kaya', rol: 'yatirimci' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(vi.mocked(authService.getUsers).mock.calls.length).toBeGreaterThan(yuklemeSayisi));
    const p2 = await olusturAc(user);
    expect(within(p2).getByLabelText(/Ad Soyad/)).toHaveValue('');
    expect(within(p2).getByLabelText(/Şifre/)).toHaveValue('');
  });

  test('sunucu hatası pencerede gösterilir ve pencere açık kalır', async () => {
    vi.mocked(authService.createUser).mockRejectedValue({ response: { data: { message: 'Bu kullanıcı adı alınmış' } } });
    const user = await ekranAc();
    const p = await olusturAc(user);
    await user.type(within(p).getByLabelText(/Ad Soyad/), 'Zeynep Kaya');
    await user.type(within(p).getByLabelText(/Kullanıcı Adı/), 'ahmet');
    await user.type(within(p).getByLabelText(/Şifre/), 'guvenli-sifre');
    await user.click(within(p).getByRole('button', { name: 'Oluştur' }));
    expect(await within(p).findByText('Bu kullanıcı adı alınmış')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ---- Şifre sıfırlama ---------------------------------------------------------------------------------------------
describe('Kullanıcılar: şifre sıfırlama', () => {
  test('pencere kullanıcının adını söyler ve eski şifrenin görüntülenemediğini belirtir', async () => {
    const user = await ekranAc();
    await user.click(dugme(satir('Ahmet Usta'), 'Şifre sıfırla'));
    const p = await screen.findByRole('dialog');
    expect(within(p).getByText('Şifre Sıfırla')).toBeInTheDocument();
    expect(p).toHaveTextContent('Ahmet Usta için yeni şifre belirleyin. Eski şifre görüntülenemez.');
  });

  test('8 karakterden kısa şifre reddedilir; geçerli şifre setSifre(id, şifre) çağırır ve başarı mesajı gösterir', async () => {
    const user = await ekranAc();
    await user.click(dugme(satir('Ahmet Usta'), 'Şifre sıfırla'));
    const p = await screen.findByRole('dialog');
    await user.type(within(p).getByLabelText(/Yeni şifre/), 'kisa');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Şifre en az 8 karakter olmalıdır')).toBeInTheDocument();
    expect(authService.setSifre).not.toHaveBeenCalled();
    await user.clear(within(p).getByLabelText(/Yeni şifre/));
    await user.type(within(p).getByLabelText(/Yeni şifre/), 'yepyeni-sifre');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(authService.setSifre).toHaveBeenCalledWith(2, 'yepyeni-sifre'));
    expect(await screen.findByText('Ahmet Usta için şifre güncellendi. Yeni şifreyi kullanıcıya iletin.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('sunucu hatası pencerede gösterilir', async () => {
    vi.mocked(authService.setSifre).mockRejectedValue({ response: { data: { message: 'Şifre çok basit' } } });
    const user = await ekranAc();
    await user.click(dugme(satir('Ahmet Usta'), 'Şifre sıfırla'));
    const p = await screen.findByRole('dialog');
    await user.type(within(p).getByLabelText(/Yeni şifre/), 'basitbasit');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    expect(await within(p).findByText('Şifre çok basit')).toBeInTheDocument();
  });

  test('yeni bir sıfırlama açılınca önceki başarı mesajı kaybolur', async () => {
    const user = await ekranAc();
    await user.click(dugme(satir('Ahmet Usta'), 'Şifre sıfırla'));
    let p = await screen.findByRole('dialog');
    await user.type(within(p).getByLabelText(/Yeni şifre/), 'yepyeni-sifre');
    await user.click(within(p).getByRole('button', { name: 'Kaydet' }));
    await screen.findByText(/şifre güncellendi/);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(dugme(satir('Veli Yatırım'), 'Şifre sıfırla'));
    p = await screen.findByRole('dialog');
    expect(screen.queryByText(/şifre güncellendi/)).not.toBeInTheDocument();
  });
});

// ---- Mobil görünüm -----------------------------------------------------------------------------------------------
describe('Kullanıcılar: mobil görünüm', () => {
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

  test('tablo yerine kartlar; bekleyen kartta onay/ret var, admin kartında silme yok', async () => {
    await ekranAc();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const kart = (ad: string) => screen.getByText(ad).closest('.MuiPaper-root') as HTMLElement;
    expect(within(kart('Yeni Başvuru')).getAllByRole('button').length).toBeGreaterThanOrEqual(4); // onay, ret, kilit, sil
    expect(yok(kart('Yönetici'), 'DeleteIcon')).toBeNull();
    expect(within(kart('Ahmet Usta')).getByText('ahmet')).toBeInTheDocument();
  });
});
