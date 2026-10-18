/*
 * Rapor hesapları (saf fonksiyonlar: veritabanı/HTTP yok). Gelir, maliyet ve kâr toplamları burada hesaplanır; sorgular
 * repository'de. DECIMAL kolonlar sürücüden metin gelir: parseFloat ile toplanır, boş/NULL 0 sayılır.
 */

type Satir = Record<string, any>;

const f = (v: unknown): number => parseFloat((v || 0) as string);
const toplam = (satirlar: Satir[], hesap: (r: Satir) => number): number => satirlar.reduce((t, r) => t + hesap(r), 0);
const alanToplami = (satirlar: Satir[], alan: string): number => toplam(satirlar, (r) => f(r[alan]));
const adetli = (r: Satir, alan: string): number => f(r[alan]) * parseInt(r.adet || 1);

/** Motor satışlarının toplamları. Admin (işletme) payı = toplam kâr − yatırımcı kârı. */
const motorToplamlari = (motorlar: Satir[]) => {
  const kar_toplam = alanToplami(motorlar, 'kar');
  const yatirimci_kar = alanToplami(motorlar, 'yatirimci_kar');
  return {
    gelir: alanToplami(motorlar, 'satis_fiyati'),
    maliyet: toplam(motorlar, (r) => f(r.alis_fiyati) + f(r.masraflar)),
    kar_toplam,
    yatirimci_kar,
    komisyon: alanToplami(motorlar, 'komisyoncu_tutari'),
    kar: kar_toplam - yatirimci_kar,
  };
};

export interface GunlukGirdi { isEmirleri: Satir[]; aksesuarlar: Satir[]; motorlar: Satir[]; eticaret: Satir[] }

export const gunlukHesapla = (hedefTarih: string, g: GunlukGirdi) => {
  const isEmriGelir = alanToplami(g.isEmirleri, 'gercek_toplam_ucret');
  const isEmriMaliyet = alanToplami(g.isEmirleri, 'toplam_maliyet');
  const isEmriKar = alanToplami(g.isEmirleri, 'kar');

  const aksesuarGelir = alanToplami(g.aksesuarlar, 'toplam_satis');
  const aksesuarMaliyet = alanToplami(g.aksesuarlar, 'toplam_maliyet');
  const aksesuarKar = alanToplami(g.aksesuarlar, 'kar');

  const m = motorToplamlari(g.motorlar);

  const eticaretGelir = toplam(g.eticaret, (r) => adetli(r, 'satis_fiyati'));
  const eticaretKar = alanToplami(g.eticaret, 'kar');

  return {
    tarih: hedefTarih,
    is_emirleri: { kayitlar: g.isEmirleri, gelir: isEmriGelir, maliyet: isEmriMaliyet, kar: isEmriKar },
    aksesuarlar: { kayitlar: g.aksesuarlar, gelir: aksesuarGelir, maliyet: aksesuarMaliyet, kar: aksesuarKar },
    motorlar: { kayitlar: g.motorlar, gelir: m.gelir, maliyet: m.maliyet, kar: m.kar, kar_toplam: m.kar_toplam, yatirimci_kar: m.yatirimci_kar, komisyon: m.komisyon },
    eticaret: { kayitlar: g.eticaret, gelir: eticaretGelir, kar: eticaretKar },
    toplam: {
      gelir: isEmriGelir + aksesuarGelir + m.gelir + eticaretGelir,
      kar: isEmriKar + aksesuarKar + m.kar + eticaretKar,
    },
  };
};

export interface AralikGirdi extends GunlukGirdi { yedekParcalar: Satir[]; motorStokToplam: number }

export const aralikHesapla = (baslangic: string, bitis: string, g: AralikGirdi) => {
  const isEmriKar = alanToplami(g.isEmirleri, 'kar');
  const aksesuarKar = alanToplami(g.aksesuarlar, 'kar');
  const m = motorToplamlari(g.motorlar);
  const eticaretKar = alanToplami(g.eticaret, 'kar');

  const isEmriGelir = alanToplami(g.isEmirleri, 'gercek_toplam_ucret');
  const isEmriMaliyet = alanToplami(g.isEmirleri, 'toplam_maliyet');
  const aksesuarGelir = alanToplami(g.aksesuarlar, 'toplam_satis');
  const aksesuarMaliyet = alanToplami(g.aksesuarlar, 'toplam_maliyet');
  const motorNoterSatisCiro = alanToplami(g.motorlar, 'noter_satis');
  const eticaretGelir = toplam(g.eticaret, (r) => adetli(r, 'satis_fiyati'));
  const eticaretMaliyet = toplam(g.eticaret, (r) => adetli(r, 'alis_fiyati'));

  return {
    baslangic, bitis,
    motorlar: g.motorlar,
    motorGelir: m.gelir, motorMaliyet: m.maliyet, motorKar: m.kar, motorKarToplam: m.kar_toplam,
    motorYatirimciKar: m.yatirimci_kar, motorKomisyon: m.komisyon, motorNoterSatisCiro,
    isEmirleri: g.isEmirleri,
    isEmriGelir, isEmriMaliyet, isEmriKar,
    aksesuarlar: g.aksesuarlar,
    aksesuarGelir, aksesuarMaliyet, aksesuarKar,
    eticaret: g.eticaret,
    eticaretGelir, eticaretMaliyet, eticaretKar,
    yedekParcalar: g.yedekParcalar,
    yedekParcaToplamDeger: alanToplami(g.yedekParcalar, 'satis_fiyati'),
    yedekParcaToplamMaliyet: alanToplami(g.yedekParcalar, 'alis_fiyati'),
    motorStokToplam: g.motorStokToplam,
    toplam: {
      gelir: isEmriGelir + aksesuarGelir + m.gelir + eticaretGelir,
      maliyet: isEmriMaliyet + aksesuarMaliyet + m.maliyet + eticaretMaliyet,
      kar: isEmriKar + aksesuarKar + m.kar + eticaretKar,
    },
  };
};

/** Genel rapor: dört kaynağın (SQL ile toplanmış) gelir/kâr değerlerinden toplam. */
export const genelHesapla = (g: { isEmirleri: Satir; aksesuarlar: Satir; motorlar: Satir; eticaret: Satir; yedekParcalar: Satir }) => ({
  is_emirleri: g.isEmirleri,
  aksesuarlar: g.aksesuarlar,
  motorlar: g.motorlar,
  eticaret: g.eticaret,
  yedek_parcalar: g.yedekParcalar,
  toplam: {
    gelir: f(g.isEmirleri.gelir) + f(g.aksesuarlar.gelir) + f(g.motorlar.gelir) + f(g.eticaret.gelir),
    kar: f(g.isEmirleri.kar) + f(g.aksesuarlar.kar) + f(g.motorlar.kar) + f(g.eticaret.kar),
  },
});

/** Yatırımcının kendi raporu: stoktakiler + satılanlar ve özet toplamlar. */
export const yatirimciRaporuHesapla = (stoktakiler: Satir[], satilanlar: Satir[]) => ({
  stoktakiler,
  satilanlar,
  ozet: {
    stok_adet: stoktakiler.length,
    satilan_adet: satilanlar.length,
    toplam_yatirimci_kar: alanToplami(satilanlar, 'yatirimci_kar'),
    toplam_satis: alanToplami(satilanlar, 'satis_fiyati'),
    toplam_alis: alanToplami(satilanlar, 'alis_fiyati'),
    stok_degeri: alanToplami(stoktakiler, 'alis_fiyati'),
  },
});
