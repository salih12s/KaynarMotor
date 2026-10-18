/*
 * İş emri iş kuralları. HTTP bilmez (express yok): hataları IstemciHatasi sınıflarıyla bildirir.
 * Fiş numarası üretimi, parça toplamları/kâr, yedek parça stoğuyla bağlantı ve müşteri otomatik kaydı burada.
 * Denetim günlüğü (kim ne yaptı) HTTP katmanında, controller'da yazılır.
 */
import { BulunamadiHatasi, YetkiHatasi, adetCoz, bosuNull } from '../../core/dogrula';
import { bosuSifir } from '../../core/sayi';
import type { BaglamDb, Kullanici, Veritabani } from '../../core/tipler';
import { stokAyarla } from '../../shared/stok';
import { upsertMusteri } from '../musteriler/musteriler.service';
import type { IsEmriFiltresi, IsEmriGuncelleGovdesi, IsEmriOlusturGovdesi, ParcaGovdesi } from './isEmirleri.schemas';
import * as repo from './isEmirleri.repository';
import type { ParcaSatiri } from './isEmirleri.repository';

/**
 * İş emri parçalarından yedek parça stoğuna bağlı olanları ayarla (yon: 1 stoktan düş, -1 geri ekle).
 * parca_kodu yedek_parca_stok'ta yoksa (ör. aksesuar stok kodu veya serbest metin) sorgu hiçbir satırı etkilemez.
 * Stok eksiye düşebilir, iade tam geri verir (shared/stok).
 */
const yedekParcaStokAyarla = async (db: Veritabani, parcalar: Array<Pick<ParcaSatiri, 'parca_kodu' | 'adet'> | ParcaGovdesi> | null | undefined, yon: 1 | -1) => {
  for (const parca of parcalar || []) {
    const kod = String(parca.parca_kodu || '').trim();
    if (!kod) continue;
    await stokAyarla(db, 'yedek_parca_stok', 'stok_kodu = $2', kod, (bosuSifir(parca.adet) || 1) * yon);
  }
};

/** Parça satırlarını yazar; (gerçek toplam, toplam maliyet) döner. Geçersiz adet 400 fırlatır (işlem geri alınır). */
const parcalariYaz = async (db: Veritabani, isEmriId: number, parcalar: ParcaGovdesi[] | null | undefined) => {
  let toplamFiyat = 0;
  let toplamMaliyet = 0;
  if (parcalar && parcalar.length > 0) {
    for (const parca of parcalar) {
      const adet = adetCoz(parca.adet);
      const birimFiyat = bosuSifir(parca.birim_fiyat);
      const maliyet = bosuSifir(parca.maliyet);
      const parcaToplamFiyat = adet * birimFiyat;
      await repo.parcaEkle(db, isEmriId, {
        parca_kodu: parca.parca_kodu, takilan_parca: parca.takilan_parca,
        adet, birim_fiyat: birimFiyat, maliyet, toplam_fiyat: parcaToplamFiyat,
      });
      toplamFiyat += parcaToplamFiyat;
      toplamMaliyet += adet * maliyet;
    }
  }
  return { toplamFiyat, toplamMaliyet };
};

const tamKayit = async (db: Veritabani, id: number) => {
  const isEmri = await repo.idyeGoreBul(db, id);
  const parcalar = await repo.parcalariListele(db, id);
  return { ...isEmri, parcalar };
};

export const sonrakiFisNo = async (db: Veritabani) => ({ nextFisNo: await repo.sonrakiFisNoOnizleme(db) });

export const listele = (db: Veritabani, filtre: IsEmriFiltresi) => repo.listele(db, filtre);

/** Tek iş emri + parçaları. */
export const detay = async (db: Veritabani, id: number) => {
  const isEmri = await repo.idyeGoreBul(db, id);
  if (!isEmri) throw new BulunamadiHatasi('İş emri bulunamadı');
  return { ...isEmri, parcalar: await repo.parcalariListele(db, id) };
};

export const olustur = async (db: BaglamDb, govde: IsEmriOlusturGovdesi, kullanici: Kullanici) => {
  const isEmriId = await db.withTransaction(async (tx) => {
    // Fiş numarası: kilit alınır, sonra MAX+1 (numaralama mantığı bilinçli olarak korunmuştur)
    await repo.fisNoKilidiniAl(tx);
    const fisNo = await repo.sonrakiFisNoOnizleme(tx);

    // Müşteriyi bul/oluştur (mevcut kayıt ezilmez, yalnızca boş alanlar dolar; aynı transaction'da)
    const musteriId = govde.telefon ? await upsertMusteri(govde.musteri_ad_soyad, govde.telefon, govde.adres, tx) : null;

    const isEmri = await repo.ekle(tx, {
      fisNo, musteriId,
      musteri_ad_soyad: govde.musteri_ad_soyad, adres: govde.adres, telefon: govde.telefon, km: bosuSifir(govde.km),
      model_tip: govde.model_tip, marka: govde.marka, aciklama: govde.aciklama, ariza_sikayetler: govde.ariza_sikayetler,
      tahmini_teslim_tarihi: bosuNull(govde.tahmini_teslim_tarihi), tahmini_toplam_ucret: bosuSifir(govde.tahmini_toplam_ucret),
      durum: (govde.durum as string) || 'beklemede', odeme_detaylari: govde.odeme_detaylari, kalan_odeme: bosuSifir(govde.kalan_odeme),
      olusturan_kullanici_id: kullanici.id, olusturan_kisi: kullanici.ad_soyad, teslim_eden_teknisyen: kullanici.ad_soyad,
      plaka: bosuNull(govde.plaka),
      // Doğrudan "tamamlandı" açılan iş emri de tamamlama tarihi almalı (PUT ve aksesuar POST'u gibi); aksi halde
      // günlük rapor ve fiş-kâr raporu (DATE(tamamlama_tarihi)) bu kaydı hiç görmez
      tamamlama_tarihi: govde.durum === 'tamamlandi' ? new Date() : null,
    });
    const isEmriId = isEmri.id as number;

    const { toplamFiyat, toplamMaliyet } = await parcalariYaz(tx, isEmriId, govde.parcalar);
    await repo.toplamlariGuncelle(tx, isEmriId, toplamFiyat, toplamMaliyet, toplamFiyat - toplamMaliyet);

    // Yedek parça stoğundan seçilen parçaları stoktan düş
    await yedekParcaStokAyarla(tx, govde.parcalar, 1);
    return isEmriId;
  });

  return tamKayit(db, isEmriId);
};

export const guncelle = async (db: BaglamDb, id: number, govde: IsEmriGuncelleGovdesi, kullanici: Kullanici) => {
  await db.withTransaction(async (tx) => {
    // Tamamlanan iş emrini personel düzenleyemez. Kilitli okuma: aynı kayda aynı anda gelen ikinci düzenleme
    // birincinin commit'ini bekler ve onun sonucunu görür.
    const eskiDurum = await repo.durumunuKilitleyerekOku(tx, id);
    if (eskiDurum === null) throw new BulunamadiHatasi('İş emri bulunamadı');
    if (eskiDurum === 'tamamlandi' && kullanici.rol !== 'admin') {
      throw new YetkiHatasi('Tamamlanan iş emrini düzenleme yetkiniz yok');
    }

    // Tamamlama tarihi: yalnızca durum bu istekle "tamamlandı"ya geçiyorsa
    const tamamlamaTarihi = govde.durum === 'tamamlandi' && eskiDurum !== 'tamamlandi' ? new Date() : null;

    // Müşteriyi bul/oluştur (mevcut kayıt ezilmez, yalnızca boş alanlar dolar)
    const musteriId = govde.telefon ? await upsertMusteri(govde.musteri_ad_soyad, govde.telefon, govde.adres, tx) : null;

    await repo.guncelle(tx, id, {
      musteri_ad_soyad: govde.musteri_ad_soyad, adres: govde.adres, telefon: govde.telefon, km: bosuSifir(govde.km),
      model_tip: govde.model_tip, marka: govde.marka, aciklama: govde.aciklama, ariza_sikayetler: govde.ariza_sikayetler,
      tahmini_teslim_tarihi: bosuNull(govde.tahmini_teslim_tarihi), tahmini_toplam_ucret: bosuSifir(govde.tahmini_toplam_ucret),
      durum: govde.durum, odeme_detaylari: govde.odeme_detaylari,
      teslim_alan_ad_soyad: govde.teslim_alan_ad_soyad, teslim_eden_teknisyen: govde.teslim_eden_teknisyen,
      teslim_tarihi: bosuNull(govde.teslim_tarihi), tamamlama_tarihi: tamamlamaTarihi,
      kalan_odeme: bosuSifir(govde.kalan_odeme), plaka: bosuNull(govde.plaka), musteriId,
    });

    // Parçaları yeniden oluştur: önce eski parçaların yedek parça stok düşümünü geri al
    await yedekParcaStokAyarla(tx, await repo.parcaKodlariniOku(tx, id), -1);
    await repo.parcalariSil(tx, id);

    const { toplamFiyat, toplamMaliyet } = await parcalariYaz(tx, id, govde.parcalar);
    await repo.toplamlariGuncelle(tx, id, toplamFiyat, toplamMaliyet, toplamFiyat - toplamMaliyet);

    // Yeni parçaların yedek parça stok düşümünü uygula
    await yedekParcaStokAyarla(tx, govde.parcalar, 1);
  });

  return tamKayit(db, id);
};

/** Yalnızca admin siler; silinen iş emrindeki yedek parça stok düşümleri geri alınır. Kayıt yoksa sessizce başarılı (eski davranış). */
export const sil = async (db: BaglamDb, id: number, kullanici: Kullanici) => {
  if (kullanici.rol !== 'admin') throw new YetkiHatasi('Admin yetkisi gerekli');
  await db.withTransaction(async (tx) => {
    await repo.kilitle(tx, id); // eşzamanlı silme/düzenleme sıraya girer
    await yedekParcaStokAyarla(tx, await repo.parcaKodlariniOku(tx, id), -1);
    await repo.sil(tx, id);
  });
};
