/*
 * HataSiniri (ErrorBoundary) testleri. Regression/D8: frontend'de hiç hata sınırı yoktu; tek bir bileşendeki çalışma zamanı hatası bütün paneli
 * (menü dahil) beyaz ekrana çeviriyordu. Sınır yalnız çöken bölümü uyarıya çevirir, dışındaki içerik yerinde kalır; sayfa değişince (key) sıfırlanır.
 * Yeni sürüm yayınlanınca eski parça adı bulunamaz (React.lazy yükleme hatası): sayfa bir kez yenilenir, döngüye girmez.
 */
import React, { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HataSiniri, { parcaYuklenemediMi } from './HataSiniri';

const Patlayan = ({ mesaj = 'boom' }: { mesaj?: string }): React.ReactElement => {
  throw new Error(mesaj);
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); // React hata sınırında beklenen hatayı konsola basar
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('HataSiniri: çöken bölüm', () => {
  test('çocuk hata verirse uyarı çıkar; sınırın DIŞINDAKİ içerik (menü gibi) yerinde kalır', () => {
    render(
      <div>
        <nav>MENÜ</nav>
        <HataSiniri>
          <Patlayan />
        </HataSiniri>
      </div>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Bu ekran açılamadı');
    expect(screen.getByText('MENÜ')).toBeInTheDocument();
  });

  test('sağlam çocuk olduğu gibi çizilir, uyarı çıkmaz', () => {
    render(
      <HataSiniri>
        <div>sağlam içerik</div>
      </HataSiniri>,
    );
    expect(screen.getByText('sağlam içerik')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('uyarı hatanın iç ayrıntısını (mesaj/yığın) kullanıcıya göstermez', () => {
    render(
      <HataSiniri>
        <Patlayan mesaj="gizli iç ayrıntı: SELECT * FROM kullanicilar" />
      </HataSiniri>,
    );
    expect(screen.queryByText(/gizli iç ayrıntı|SELECT/)).not.toBeInTheDocument();
  });

  test('"Yeniden dene": hata geçiciyse içerik geri gelir', async () => {
    const user = userEvent.setup();
    let bozuk = true;
    const Gecici = () => {
      if (bozuk) throw new Error('geçici');
      return <div>düzeldi</div>;
    };
    render(
      <HataSiniri>
        <Gecici />
      </HataSiniri>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    bozuk = false;
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Yeniden dene' }));
    expect(screen.getByText('düzeldi')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('sayfa değişince (key değişince) hata temizlenir ve yeni sayfa çizilir', async () => {
    const user = userEvent.setup();
    const Kabuk = () => {
      const [sayfa, setSayfa] = useState('a');
      return (
        <div>
          <button onClick={() => setSayfa('b')}>B sayfasına git</button>
          <HataSiniri key={sayfa}>{sayfa === 'a' ? <Patlayan /> : <div>B sayfası</div>}</HataSiniri>
        </div>
      );
    };
    render(<Kabuk />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'B sayfasına git' }));
    expect(screen.getByText('B sayfası')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('HataSiniri: yeni sürüm sonrası parça yükleme hatası', () => {
  test.each([
    'Failed to fetch dynamically imported module: https://site/assets/Raporlar.abc.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Loading chunk 12 failed.',
  ])('"%s" parça yükleme hatası sayılır', (mesaj) => {
    expect(parcaYuklenemediMi(new Error(mesaj))).toBe(true);
  });

  test('sıradan hata parça yükleme hatası sayılmaz', () => {
    expect(parcaYuklenemediMi(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(parcaYuklenemediMi(null)).toBe(false);
  });

  test('parça yükleme hatasında sayfa BİR kez yenilenir; yenilemeden hemen sonra yine hata gelirse döngüye girmez', () => {
    const yenile = vi.fn();
    const goster = () =>
      render(
        <HataSiniri yenile={yenile}>
          <Patlayan mesaj="Failed to fetch dynamically imported module" />
        </HataSiniri>,
      );
    goster();
    expect(yenile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Yeni bir sürüm yayınlanmış olabilir');
    goster(); // yenileme sonrası aynı hata: ikinci kez yenilenmez
    expect(yenile).toHaveBeenCalledTimes(1);
  });

  test('sıradan hata sayfayı YENİLEMEZ', () => {
    const yenile = vi.fn();
    render(
      <HataSiniri yenile={yenile}>
        <Patlayan />
      </HataSiniri>,
    );
    expect(yenile).not.toHaveBeenCalled();
  });
});
