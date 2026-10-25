import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnayProvider, useOnay } from './Onay';

// Düğmeye basınca onay ister, sonucu ekrana yazar: sağlayıcı sözünün doğru çözüldüğünü görmek için.
const Deneme = ({ mesaj = 'Bu kaydı silmek istediğinizden emin misiniz?', secenek }) => {
  const onay = useOnay();
  const [sonuc, setSonuc] = React.useState('bekliyor');
  return (
    <>
      <button onClick={async () => setSonuc((await onay(mesaj, secenek)) ? 'silindi' : 'vazgecildi')}>Sil dene</button>
      <output>{sonuc}</output>
    </>
  );
};

describe('Onay penceresi (silme onayı)', () => {
  it('mesajı ve başlığı gösterir; "Sil" true döndürür', async () => {
    const user = userEvent.setup();
    render(
      <OnayProvider>
        <Deneme />
      </OnayProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Sil dene' }));
    const pencere = await screen.findByRole('dialog');
    expect(pencere).toHaveTextContent('Silme onayı');
    expect(pencere).toHaveTextContent('Bu kaydı silmek istediğinizden emin misiniz?');
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('silindi'));
  });

  it('"Vazgeç" false döndürür ve pencere kapanır', async () => {
    const user = userEvent.setup();
    render(
      <OnayProvider>
        <Deneme />
      </OnayProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Sil dene' }));
    await user.click(await screen.findByRole('button', { name: 'Vazgeç' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('vazgecildi'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('Escape tuşu vazgeçmek sayılır', async () => {
    const user = userEvent.setup();
    render(
      <OnayProvider>
        <Deneme />
      </OnayProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Sil dene' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('vazgecildi'));
  });

  it('başlık ve onay düğmesi etiketi özelleştirilebilir', async () => {
    const user = userEvent.setup();
    render(
      <OnayProvider>
        <Deneme secenek={{ baslik: 'Müşteriyi sil', onayEtiket: 'Evet, sil' }} />
      </OnayProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Sil dene' }));
    const pencere = await screen.findByRole('dialog');
    expect(pencere).toHaveTextContent('Müşteriyi sil');
    expect(screen.getByRole('button', { name: 'Evet, sil' })).toBeInTheDocument();
  });

  it('sağlayıcı yoksa tarayıcının window.confirm kutusuna düşer', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Deneme mesaj="Emin misin?" />);
    await user.click(screen.getByRole('button', { name: 'Sil dene' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('silindi'));
    expect(confirm).toHaveBeenCalledWith('Emin misin?');
    confirm.mockRestore();
  });
});
