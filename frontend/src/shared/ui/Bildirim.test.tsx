import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BildirimProvider, bildir } from './Bildirim';

describe('Bildirim (alert yerine uygulamanın kendi mesajı)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('sağlayıcı varken mesajı ekranda gösterir, tarayıcı kutusunu açmaz', () => {
    render(<BildirimProvider>içerik</BildirimProvider>);
    act(() => bildir('Silinemez: satışta kullanılıyor'));
    expect(screen.getByRole('alert')).toHaveTextContent('Silinemez: satışta kullanılıyor');
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('yeni mesaj eskisinin yerini alır (üst üste yığılmaz)', () => {
    render(<BildirimProvider>içerik</BildirimProvider>);
    act(() => bildir('Birinci'));
    act(() => bildir('İkinci', 'uyari'));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('İkinci');
  });

  it('kapat düğmesi mesajı kaldırır', async () => {
    const user = userEvent.setup();
    render(<BildirimProvider>içerik</BildirimProvider>);
    act(() => bildir('Geçici mesaj'));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('çok satırlı mesajda satır sonları korunur (belge yükleme hataları liste olarak okunur)', () => {
    render(<BildirimProvider>içerik</BildirimProvider>);
    act(() => bildir('Yüklenemeyen belgeler:\nruhsat.pdf\nehliyet.pdf'));
    const kutu = screen.getByRole('alert');
    expect(kutu).toHaveTextContent('ruhsat.pdf');
    expect(getComputedStyle(kutu).whiteSpace).toBe('pre-line');
  });

  it('sağlayıcı yokken tarayıcı alert() kutusuna düşer (mevcut ekran testleri bozulmaz)', () => {
    bildir('Sağlayıcısız mesaj');
    expect(window.alert).toHaveBeenCalledWith('Sağlayıcısız mesaj');
  });

  it('sağlayıcı kaldırılınca yeniden alert() kutusuna düşer', () => {
    const { unmount } = render(<BildirimProvider>içerik</BildirimProvider>);
    unmount();
    bildir('Kaldırıldıktan sonra');
    expect(window.alert).toHaveBeenCalledWith('Kaldırıldıktan sonra');
  });
});
