// Sıfır motor saf kuralları: satış formunun modelden dolması, ikinci ele dönüş, adlandırma ve arama.
import { sifirAdi, sifirFiltrele, sifirSatisMi, sifirdenForm } from './sifirVeri';
import { bosForm, ikinciElFormu, sifirdenSatisFormu } from '../ikinciElMotor/satisVeri';
import type { SifirMotor } from '../../../shared/tipler';

// Fixture: sıfır stoktaki model
const PCX: SifirMotor = {
  id: 3,
  marka: 'Honda',
  model: 'PCX 125',
  yil: 2026,
  motor_cc: 125,
  segment: 'Scooter',
  alis_fiyati: '95000.00',
  liste_fiyati: '120000.00',
  aciklama: null,
  kapak_gorsel_id: null,
  gorsel_sayisi: 0,
  satilan_adet: 2,
};

describe('sifirdenSatisFormu', () => {
  test('model bilgisi ve fiyatlar modelden gelir; satış "tamamlandi", km boş', () => {
    const f = sifirdenSatisFormu(bosForm(), PCX);
    expect(f).toMatchObject({
      motor_durumu: 'sifir',
      sifir_motor_id: 3,
      marka: 'Honda',
      model: 'PCX 125',
      yil: 2026,
      km: '',
      alis_fiyati: '95000.00',
      satis_fiyati: '120000.00',
      durum: 'tamamlandi',
    });
  });

  test('ikinci el stoktan kalan satıcı, alım tarihi ve yatırımcı bilgisi temizlenir (sıfırda yatırımcı yok)', () => {
    const kirli = { ...bosForm(), satici_adi: 'Eski Sahip', tarih: '2026-01-01', yatirimci_id: 9, yatirimci_kar: '5000', yatirimci_adi: 'Y' };
    const f = sifirdenSatisFormu(kirli, PCX);
    expect([f.satici_adi, f.tarih, f.yatirimci_id, f.yatirimci_kar, f.yatirimci_adi]).toEqual(['', '', '', '', '']);
  });

  test('alış fiyatını göremeyen kullanıcıda (alan yok) alış boş kalır', () => {
    const { alis_fiyati: _gizli, ...alissiz } = PCX;
    expect(sifirdenSatisFormu(bosForm(), alissiz).alis_fiyati).toBe('');
  });

  test('alıcı ve ödeme bilgisi korunur (model sonradan seçilse de yazılanlar silinmez)', () => {
    const f = sifirdenSatisFormu({ ...bosForm(), alici_adi: 'Ayşe', odeme_sekli: 'havale' }, PCX);
    expect([f.alici_adi, f.odeme_sekli]).toEqual(['Ayşe', 'havale']);
  });
});

test('ikinciElFormu: sıfır modelin bilgisi ve fiyatı temizlenir (yanlış modelin fiyatı kalmasın), alıcı korunur', () => {
  const f = ikinciElFormu({ ...sifirdenSatisFormu(bosForm(), PCX), alici_adi: 'Ayşe' });
  expect(f).toMatchObject({ motor_durumu: 'ikinci_el', sifir_motor_id: '', marka: '', model: '', alis_fiyati: '', satis_fiyati: '', alici_adi: 'Ayşe' });
});

test('sifirAdi: marka model (yıl); eksik parçalar atlanır', () => {
  expect(sifirAdi(PCX)).toBe('Honda PCX 125 (2026)');
  expect(sifirAdi({ marka: 'Yamaha', model: null, yil: null })).toBe('Yamaha');
});

test('sifirFiltrele: marka/model/segment içinde Türkçe duyarsız arar ve ada göre sıralar', () => {
  const liste = [PCX, { ...PCX, id: 4, marka: 'Bajaj', model: 'Pulsar', segment: 'Naked' }];
  expect(sifirFiltrele(liste, '').map((m) => m.id)).toEqual([4, 3]);
  expect(sifirFiltrele(liste, 'scoo').map((m) => m.id)).toEqual([3]);
  expect(sifirFiltrele(liste, 'PULSAR').map((m) => m.id)).toEqual([4]);
});

test('sifirdenForm: boş alanlar "" olur; alış yoksa ""', () => {
  const { alis_fiyati: _gizli, ...alissiz } = PCX;
  expect(sifirdenForm({ ...alissiz, model: null, segment: null })).toMatchObject({ model: '', segment: '', alis_fiyati: '' });
});

test('sifirSatisMi', () => {
  expect(sifirSatisMi({ motor_durumu: 'sifir' })).toBe(true);
  expect(sifirSatisMi({ motor_durumu: 'ikinci_el' })).toBe(false);
  expect(sifirSatisMi({})).toBe(false);
});
