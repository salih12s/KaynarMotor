import {
  ilkForm,
  bosForm,
  satistanForm,
  filtrele,
  yeniParca,
  parcaEkle,
  stoktanEkleVeyaArtir,
  parcaGuncelle,
  parcaStokSec,
  parcaSil,
  stokDegeri,
  hesapla,
  type FormParca,
} from './aksesuarVeri';
import { kayit, kayitlar } from '../../../shared/test/kayit';
import type { AksesuarSatis } from '../../../shared/tipler';

describe('form dönüşümleri', () => {
  test('ilkForm tarihsiz, bosForm bugünün tarihiyle; ikisinde de "ödeme tamamlandı" işaretli', () => {
    expect(ilkForm().satis_tarihi).toBe('');
    expect(bosForm().satis_tarihi).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ilkForm().odeme_tamamlandi).toBe(true);
    expect(bosForm().odeme_tamamlandi).toBe(true);
  });

  test('satistanForm: boşlar "", tarih yyyy-aa-gg, kalan ödeme yoksa tamamlandı', () => {
    const f = satistanForm(kayit<AksesuarSatis>({ ad_soyad: 'Ali', satis_tarihi: '2026-10-05T09:00:00.000Z', kalan_odeme: '0.00', indirim: '0.00' }));
    expect(f).toMatchObject({ ad_soyad: 'Ali', telefon: '', durum: 'beklemede', satis_tarihi: '2026-10-05', odeme_tamamlandi: true, indirim: '' });
  });

  test('satistanForm: kalan ödeme varsa tamamlandı işareti kalkar; indirim sayıya çevrilir', () => {
    const f = satistanForm(kayit<AksesuarSatis>({ kalan_odeme: '250.00', indirim: '40.50', durum: 'tamamlandi' }));
    expect(f.odeme_tamamlandi).toBe(false);
    expect(f.kalan_odeme).toBe('250.00');
    expect(f.indirim).toBe(40.5);
    expect(f.durum).toBe('tamamlandi');
  });
});

describe('filtrele', () => {
  const satislar = kayitlar<AksesuarSatis>([
    { id: 1, ad_soyad: 'Ayşe Demir', telefon: '0532', satis_tarihi: '2026-10-05T10:00:00Z' },
    { id: 2, ad_soyad: 'Mehmet', telefon: '0555', created_at: '2026-10-10T10:00:00Z' },
    { id: 3, ad_soyad: null, telefon: null, satis_tarihi: '2026-10-20' },
  ]);
  const ids = (r: AksesuarSatis[]) => r.map((s) => s.id);

  test('süzgeç yoksa hepsi', () => expect(ids(filtrele(satislar, { aksSearch: '', aksStart: '', aksEnd: '' }))).toEqual([1, 2, 3]));
  test('arama ad (büyük/küçük harf duyarsız) ve telefonda', () => {
    expect(ids(filtrele(satislar, { aksSearch: 'ayşe', aksStart: '', aksEnd: '' }))).toEqual([1]);
    expect(ids(filtrele(satislar, { aksSearch: '0555', aksStart: '', aksEnd: '' }))).toEqual([2]);
  });
  test('tarih satış tarihine, yoksa oluşturma tarihine göre; uçlar dahil', () => {
    expect(ids(filtrele(satislar, { aksSearch: '', aksStart: '2026-10-10', aksEnd: '2026-10-10' }))).toEqual([2]);
    expect(ids(filtrele(satislar, { aksSearch: '', aksStart: '2026-10-06', aksEnd: '' }))).toEqual([2, 3]);
    expect(ids(filtrele(satislar, { aksSearch: '', aksStart: '', aksEnd: '2026-10-05' }))).toEqual([1]);
  });
});

describe('ürün satırları', () => {
  test('yeniParca / parcaEkle: eski dizi değişmez', () => {
    const eski: FormParca[] = [];
    const yeni = parcaEkle(eski);
    expect(eski).toEqual([]);
    expect(yeni).toEqual([{ stok_id: null, urun_adi: '', adet: 1, maliyet: 0, satis_fiyati: 0 }]);
    expect(yeniParca()).not.toBe(yeniParca());
  });

  test('stoktanEkleVeyaArtir: yoksa ekler (fiyatlar stoktan), varsa adedi artırır', () => {
    const stok = { id: 7, stok_adi: 'Kask', alis_fiyati: '100.00', satis_fiyati: '150.50' };
    const bir = stoktanEkleVeyaArtir([], stok);
    expect(bir).toEqual([{ stok_id: 7, urun_adi: 'Kask', adet: 1, maliyet: 100, satis_fiyati: 150.5 }]);
    const iki = stoktanEkleVeyaArtir(bir, stok);
    expect(iki[0].adet).toBe(2);
    expect(bir[0].adet).toBe(1);
  });

  test('stoktanEkleVeyaArtir: kimliksiz (eski) satır ada göre eşleşir; kimlikli satır yalnız kimlikle', () => {
    const adla = kayitlar<FormParca>([{ stok_id: null, urun_adi: 'Kask', adet: 1 }]);
    expect(stoktanEkleVeyaArtir(adla, { id: 7, stok_adi: 'Kask' })[0].adet).toBe(2);
    const kimlikli = kayitlar<FormParca>([{ stok_id: 3, urun_adi: 'Kask', adet: 1 }]);
    expect(stoktanEkleVeyaArtir(kimlikli, { id: 7, stok_adi: 'Kask' })).toHaveLength(2);
  });

  test('parcaGuncelle yalnız ilgili satırı değiştirir ve yeni nesne üretir', () => {
    const prev = kayitlar<FormParca>([{ adet: 1 }, { adet: 1 }]);
    const yeni = parcaGuncelle(prev, 1, 'adet', 5);
    expect(yeni[1].adet).toBe(5);
    expect(yeni[0]).toBe(prev[0]);
    expect(prev[1].adet).toBe(1);
  });

  test('parcaStokSec: stok seçilince kimlik+fiyatlar gelir; temizlenince kimlik ve ad boşalır, fiyat kalır', () => {
    const prev: FormParca[] = [{ stok_id: null, urun_adi: '', adet: 2, maliyet: 0, satis_fiyati: 0 }];
    const secildi = parcaStokSec(prev, 0, { id: 4, stok_adi: 'Eldiven', alis_fiyati: '30', satis_fiyati: '60' });
    expect(secildi[0]).toEqual({ stok_id: 4, urun_adi: 'Eldiven', adet: 2, maliyet: 30, satis_fiyati: 60 });
    const temiz = parcaStokSec(secildi, 0, null);
    expect(temiz[0]).toEqual({ stok_id: null, urun_adi: '', adet: 2, maliyet: 30, satis_fiyati: 60 });
  });

  test('parcaSil ve stokDegeri (kimlik önce, yoksa ad)', () => {
    expect(parcaSil(kayitlar<FormParca>([{ a: 1 }, { a: 2 }, { a: 3 }]), 1)).toEqual([{ a: 1 }, { a: 3 }]);
    const opts = [
      { id: 1, stok_adi: 'A' },
      { id: 2, stok_adi: 'A' },
    ];
    expect(stokDegeri(opts, kayit<FormParca>({ stok_id: 2, urun_adi: 'A' }))).toBe(opts[1]);
    expect(stokDegeri(opts, kayit<FormParca>({ stok_id: null, urun_adi: 'A' }))).toBe(opts[0]);
    expect(stokDegeri(opts, kayit<FormParca>({ stok_id: null, urun_adi: 'Yok' }))).toBeNull();
  });
});

describe('hesapla', () => {
  const parcalar = kayitlar<FormParca>([
    { adet: 2, satis_fiyati: 100, maliyet: 60 },
    { adet: 1, satis_fiyati: '50', maliyet: '20' },
  ]);

  test('toplam, maliyet, net ve kâr', () => {
    expect(hesapla(parcalar, '')).toEqual({ toplamSatis: 250, toplamMaliyet: 140, indirim: 0, netToplam: 250, kar: 110 });
  });
  test('indirim toplamdan düşer, kârı azaltır', () => {
    expect(hesapla(parcalar, '50')).toMatchObject({ indirim: 50, netToplam: 200, kar: 60 });
  });
  test('indirim ürün toplamını aşamaz', () => {
    expect(hesapla(parcalar, 999)).toMatchObject({ indirim: 250, netToplam: 0, kar: -140 });
  });
  test('sayı olmayan girdiler 0 sayılır; boş liste 0', () => {
    expect(hesapla(kayitlar<FormParca>([{ adet: 'x', satis_fiyati: 10, maliyet: 1 }]), 'abc')).toEqual({
      toplamSatis: 0,
      toplamMaliyet: 0,
      indirim: 0,
      netToplam: 0,
      kar: 0,
    });
    expect(hesapla([], '')).toEqual({ toplamSatis: 0, toplamMaliyet: 0, indirim: 0, netToplam: 0, kar: 0 });
  });
});
