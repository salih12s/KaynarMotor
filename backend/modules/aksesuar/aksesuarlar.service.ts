/*
 * Aksesuar satışı iş kuralları: toplam/indirim/kâr, stok eşleştirme ve düşüm/iade, müşteri otomatik kaydı.
 * HTTP bilmez (express yok). Denetim günlüğü HTTP katmanında, controller'da yazılır.
 */
import { BulunamadiHatasi, adetCoz } from '../../core/dogrula';
import { bosuSifir } from '../../core/sayi';
import type { BaglamDb, Kullanici, Veritabani } from '../../core/tipler';
import { parcalariEkle } from '../../shared/altKayitlar';
import { stokAyarla } from '../../shared/stok';
import { upsertMusteri } from '../musteriler/musteriler.service';
import type { ParcaGovdesi, SatisGovdesi } from './aksesuarlar.schemas';
import * as repo from './aksesuarlar.repository';

/**
 * Aksesuar satış satırı mümkünse stok kaydına ID ile bağlanır (aksesuar_parcalar.stok_id): stok yeniden adlandırılsa ya da
 * aynı adlı birden fazla kayıt olsa da iade doğru stoğa gider. ID'si olmayan eski satırlar ve serbest metin için ada göre
 * eşleşme sürer (aynı adlı birden fazla kayıt varsa deterministik olarak en düşük id).
 */
const stokIdCoz = async (db: Veritabani, stokId: unknown, urunAdi: unknown): Promise<number | null> => {
  const id = Number(stokId);
  if (Number.isInteger(id) && id > 0 && (await repo.stokIdVarMi(db, id))) return id;
  const ad = String(urunAdi || '').trim();
  if (!ad) return null;
  return repo.stokIdAdaGore(db, ad);
};

/** yon: 1 stoktan düş, -1 geri ekle. Stok eksiye düşebilir (shared/stok). */
const aksesuarStokAyarla = async (db: Veritabani, hedef: { stokId: unknown; urunAdi: unknown }, adet: unknown, yon: 1 | -1) => {
  const miktar = (bosuSifir(adet) || 1) * yon;
  if (!miktar) return;
  const stokId = hedef.stokId ? Number(hedef.stokId) : await stokIdCoz(db, null, hedef.urunAdi); // ID yoksa (eski satır): ada göre
  if (!stokId) {
    if (hedef.urunAdi) console.warn(`Aksesuar stok eşleşmedi, stok güncellenmedi: "${hedef.urunAdi}"`);
    return;
  }
  await stokAyarla(db, 'aksesuar_stok', 'id = $2', stokId, miktar);
};

/**
 * Adet doğrulaması + tutarlılık: toplamlar, kaydedilen satır ve stok düşümü AYNI adedi kullanır (eskiden boş adet
 * toplamda 0, kayıtta 1 sayılıyordu). Doğrulama hiçbir şey değişmeden ÖNCE yapılır.
 */
const satirlariHazirla = (parcalar: ParcaGovdesi[] | null | undefined) =>
  (parcalar ?? []).map((p) => ({ ...p, adet: adetCoz(p.adet) }));

/** İndirim ürün toplamından (ve kârdan) düşülür. toplam_satis NET (indirim sonrası) saklanır. */
const toplamlariHesapla = (satirlar: Array<{ adet: number; maliyet?: unknown; satis_fiyati?: unknown }>, indirim: unknown) => {
  let toplamMaliyet = 0;
  let brutSatis = 0;
  for (const p of satirlar) {
    toplamMaliyet += p.adet * bosuSifir(p.maliyet);
    brutSatis += p.adet * bosuSifir(p.satis_fiyati);
  }
  const indirimTutar = Math.min(bosuSifir(indirim), brutSatis);
  const toplamSatis = brutSatis - indirimTutar;
  return { toplamMaliyet, indirimTutar, toplamSatis, kar: toplamSatis - toplamMaliyet };
};

const tamKayit = async (db: Veritabani, id: number) => {
  const satis = await repo.idyeGoreBul(db, id);
  return { ...satis, parcalar: await repo.parcalariListele(db, id) };
};

export const istatistik = (db: Veritabani) => repo.istatistik(db);

/** Tüm satışlar; parçalar ayrı sorguyla çekilip birleştirilir (PostgreSQL'deki json_agg karşılığı). */
export const listele = async (db: Veritabani) =>
  parcalariEkle(db, await repo.hepsiniListele(db), 'aksesuar_parcalar', 'aksesuar_id',
    ['id', 'stok_id', 'urun_adi', 'adet', 'maliyet', 'satis_fiyati', 'created_at'], ['maliyet', 'satis_fiyati'], { anahtariTut: true });

export const detay = async (db: Veritabani, id: number) => {
  const satis = await repo.idyeGoreBul(db, id);
  if (!satis) throw new BulunamadiHatasi('Aksesuar bulunamadı');
  return { ...satis, parcalar: await repo.parcalariListele(db, id) };
};

export const olustur = async (db: BaglamDb, govde: SatisGovdesi, kullanici: Kullanici) => {
  const olusturanKisi = kullanici?.ad_soyad || kullanici?.kullanici_adi || null;

  const aksesuarId = await db.withTransaction(async (tx) => {
    const satirlar = satirlariHazirla(govde.parcalar);
    const { toplamMaliyet, indirimTutar, toplamSatis, kar } = toplamlariHesapla(satirlar, govde.indirim);

    const satis = await repo.ekle(tx, {
      ad_soyad: govde.ad_soyad, telefon: govde.telefon, odeme_sekli: govde.odeme_sekli, aciklama: govde.aciklama,
      durum: (govde.durum as string) || 'beklemede', odeme_detaylari: govde.odeme_detaylari,
      satis_tarihi: govde.satis_tarihi || new Date(), toplam_maliyet: toplamMaliyet, toplam_satis: toplamSatis, kar,
      tamamlama_tarihi: govde.durum === 'tamamlandi' ? new Date() : null,
      olusturan_kisi: olusturanKisi, kalan_odeme: bosuSifir(govde.kalan_odeme), indirim: indirimTutar,
    });
    const id = satis.id as number;

    for (const p of satirlar) {
      const stokId = await stokIdCoz(tx, p.stok_id, p.urun_adi);
      await repo.parcaEkle(tx, id, {
        stok_id: stokId, urun_adi: p.urun_adi, adet: p.adet, maliyet: bosuSifir(p.maliyet), satis_fiyati: bosuSifir(p.satis_fiyati),
      });
      // Tamamlandıysa stoktan düş
      if (govde.durum === 'tamamlandi') await aksesuarStokAyarla(tx, { stokId, urunAdi: p.urun_adi }, p.adet, 1);
    }
    return id;
  });

  // Müşteri auto-collect (işlem tamamlandıktan sonra, bağımsız)
  if (govde.ad_soyad) await upsertMusteri(govde.ad_soyad, govde.telefon, null, db);
  return tamKayit(db, aksesuarId);
};

export const guncelle = async (db: BaglamDb, id: number, govde: SatisGovdesi) => {
  await db.withTransaction(async (tx) => {
    const mevcut = await repo.kilitleyerekOku(tx, id);
    if (!mevcut) throw new BulunamadiHatasi('Bulunamadı');
    const eskiDurum = mevcut.durum;

    const satirlar = satirlariHazirla(govde.parcalar); // doğrulama, hiçbir şey değişmeden ÖNCE

    // Eski durum tamamlandi ise stokları geri ekle
    if (eskiDurum === 'tamamlandi') {
      for (const p of await repo.parcalariOku(tx, id)) {
        await aksesuarStokAyarla(tx, { stokId: p.stok_id, urunAdi: p.urun_adi }, p.adet, -1);
      }
    }

    // Parçaları yeniden oluştur
    await repo.parcalariSil(tx, id);
    for (const p of satirlar) {
      const stokId = await stokIdCoz(tx, p.stok_id, p.urun_adi);
      await repo.parcaEkle(tx, id, {
        stok_id: stokId, urun_adi: p.urun_adi, adet: p.adet, maliyet: bosuSifir(p.maliyet), satis_fiyati: bosuSifir(p.satis_fiyati),
      });
      // Yeni durum tamamlandi ise stoktan düş
      if (govde.durum === 'tamamlandi') await aksesuarStokAyarla(tx, { stokId, urunAdi: p.urun_adi }, p.adet, 1);
    }

    const { toplamMaliyet, indirimTutar, toplamSatis, kar } = toplamlariHesapla(satirlar, govde.indirim);
    await repo.guncelle(tx, id, {
      ad_soyad: govde.ad_soyad, telefon: govde.telefon, odeme_sekli: govde.odeme_sekli, aciklama: govde.aciklama,
      durum: govde.durum, odeme_detaylari: govde.odeme_detaylari, satis_tarihi: govde.satis_tarihi,
      toplam_maliyet: toplamMaliyet, toplam_satis: toplamSatis, kar,
      tamamlama_tarihi: govde.durum === 'tamamlandi' && eskiDurum !== 'tamamlandi' ? new Date() : null,
      kalan_odeme: bosuSifir(govde.kalan_odeme), indirim: indirimTutar,
    });
  });

  // Müşteri auto-collect
  if (govde.ad_soyad) await upsertMusteri(govde.ad_soyad, govde.telefon, null, db);
  return tamKayit(db, id);
};

/**
 * Satışı siler; tamamlanmış satışın stoğu geri eklenir. Satışın var olup olmadığını döner (olmayan kayıt için
 * işlem sessizce başarılıdır ama günlük yazılmaz).
 */
export const sil = (db: BaglamDb, id: number): Promise<boolean> =>
  db.withTransaction(async (tx) => {
    const durum = await repo.durumunuKilitleyerekOku(tx, id);
    if (durum === 'tamamlandi') {
      for (const p of await repo.parcalariOku(tx, id)) {
        await aksesuarStokAyarla(tx, { stokId: p.stok_id, urunAdi: p.urun_adi }, p.adet, -1);
      }
    }
    await repo.sil(tx, id);
    return durum !== null;
  });
