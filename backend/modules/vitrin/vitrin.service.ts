/*
 * Vitrin (site ilanları) iş kuralları: kategori yetkisi (personel yalnızca izinli kategoriyi yönetir), medya/bağlantı
 * doğrulaması, yükleme boyutu sınırı, sıralama ve yayın durumu. HTTP bilmez (express yok).
 * Yayın durumu ve sırayı yalnızca admin değiştirir (PATCH /yayin ve /sira uçlarıyla aynı kural).
 */
import { maxPaket, paketHatasi } from '../../core/db';
import { BulunamadiHatasi, GecersizIstek, YetkiHatasi, bosuNull } from '../../core/dogrula';
import type { BaglamDb, Kullanici, Veritabani } from '../../core/tipler';
import * as repo from './vitrin.repository';
import type { IlanAlanlari, ListeFiltresi } from './vitrin.repository';
import type {
  IlanGuncelleGovdesi, IlanOlusturGovdesi, IlanSorgusu, SiraGovdesi, SiralaGovdesi, YayinGovdesi,
} from './vitrin.schemas';
import { segmentiGaranti } from './vitrinIletisim.service';
import {
  IZINLI_VIDEO, KATEGORILER, MOTOR_DURUMLARI, baglantiHatasi, cokBuyukMesaji, hamMb, kategoriYetkiliMi, medyaHatasi,
  motorDurumu, numOrNull, paketAsimi, parseDataUrl,
} from './vitrinOrtak';

// ---------------------------------------------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------------------------------------------

/**
 * GET /yukleme-siniri: yönetim ekranı, dosya seçilir seçilmez (sunucuya göndermeden) uyarı verebilsin diye. Sınır
 * veritabanının max_allowed_packet değerine bağlıdır; değer HAM dosya boyutu (MB) olarak döner.
 */
export const yuklemeSiniri = async () => {
  const paket = (await maxPaket()) - 1024 * 1024;
  return { video_mb: Math.max(1, Math.min(hamMb(paket), 85)) };
};

/** Liste: geçersiz kategori/durum filtresi yok sayılır; `hepsi` (arşiv dahil) yetkisini route'taki kapı denetler. */
export const ilanlariListele = (db: Veritabani, sorgu: IlanSorgusu) => {
  const filtre: ListeFiltresi = {
    hepsi: !!sorgu.hepsi,
    kategori: sorgu.kategori && KATEGORILER.includes(sorgu.kategori) ? sorgu.kategori : undefined,
    segment: sorgu.segment,
    durum: sorgu.durum && MOTOR_DURUMLARI.includes(sorgu.durum) ? sorgu.durum : undefined,
    marka: sorgu.marka,
    cc_min: sorgu.cc_min,
    cc_max: sorgu.cc_max,
    km_max: sorgu.km_max,
    q: sorgu.q,
  };
  return repo.ilanlariListele(db, filtre);
};

/** Yayındaki motor ilanlarının markaları ve adetleri (COUNT MariaDB'de metin döner → sayı). */
export const markalariListele = async (db: Veritabani, durum?: string) => {
  const satirlar = await repo.markalariListele(db, durum && MOTOR_DURUMLARI.includes(durum) ? durum : undefined);
  return satirlar.map((r) => ({ marka: r.marka, adet: Number(r.adet) }));
};

/**
 * Tek ilan + görsel id listesi. Yayından kaldırılmış ilan herkese açık değildir: yalnızca vitrin yetkilisi (düzenleme
 * ekranı) görebilir. `kullaniciGetir` yalnızca gerektiğinde (ilan yayında değilse) çağrılır.
 */
export const ilanDetay = async (db: Veritabani, id: number, kullaniciGetir: () => Promise<Kullanici | null>) => {
  const ilan = await repo.ilanBul(db, id);
  if (!ilan) throw new BulunamadiHatasi('Kayıt bulunamadı');
  if (!ilan.yayinda) {
    const u = await kullaniciGetir();
    if (!u || !(u.rol === 'admin' || u.motor_vitrin_yetkisi || u.aksesuar_vitrin_yetkisi)) throw new BulunamadiHatasi('Kayıt bulunamadı');
  }
  return { ...ilan, gorsel_idler: await repo.gorselIdleri(db, id) };
};

// ---------------------------------------------------------------------------------------------------------------
// Sıralama ve yayın
// ---------------------------------------------------------------------------------------------------------------

/** Kategori içindeki ilanların vitrin sırasını topluca günceller (hepsi bu kategoriye ait olmalı, tek işlem). */
export const sirala = async (db: BaglamDb, govde: SiralaGovdesi, kullanici: Kullanici) => {
  const { kategori, urun_ids: urunIds } = govde;
  if (!KATEGORILER.includes(kategori as string)) throw new GecersizIstek('Geçersiz kategori');
  if (!kategoriYetkiliMi(kullanici, kategori)) throw new YetkiHatasi('Bu kategori için vitrin yetkiniz yok');
  if (!Array.isArray(urunIds) || urunIds.length === 0 || urunIds.length > 1000) throw new GecersizIstek('Sıralanacak ilan listesi geçersiz');

  const ids = urunIds.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    throw new GecersizIstek('İlan listesinde geçersiz veya tekrar eden kayıt var');
  }

  await db.withTransaction(async (tx) => {
    const sonuc = await repo.siralamaYaz(tx, ids, kategori as string);
    if (sonuc.rowCount !== ids.length) throw new GecersizIstek('Bazı ilanlar bu kategoriye ait değil');
  });
};

/** Yalnızca admin (routes kapısı): ilanı hızlıca yayına al/kaldır. */
export const yayinDurumuAyarla = async (db: BaglamDb, id: number, govde: YayinGovdesi) => {
  if (!Number.isInteger(id) || id <= 0) throw new GecersizIstek('Geçersiz ilan');
  if (typeof govde.yayinda !== 'boolean') throw new GecersizIstek('Yayın durumu geçersiz');
  const yayinda = govde.yayinda;

  const sonuc = await db.withTransaction(async (tx) => {
    const etkilenen = await repo.yayinDurumunuYaz(tx, id, yayinda);
    return etkilenen === 0 ? null : repo.yayinDurumuOku(tx, id);
  });
  if (!sonuc) throw new BulunamadiHatasi('Kayıt bulunamadı');
  return sonuc;
};

/**
 * Yalnızca admin (routes kapısı): ilanı doğrudan istenen sıraya taşır. Sıra, ilanın bulunduğu grup içinde hesaplanır:
 * yayındakiler kendi arasında, arşivdekiler kendi arasında (yönetim ekranı yayındaki listeyi 1..N numaralar).
 */
export const siraAyarla = async (db: BaglamDb, id: number, govde: SiraGovdesi) => {
  const istenenSira = Number(govde.sira);
  if (!Number.isInteger(id) || id <= 0) throw new GecersizIstek('Geçersiz ilan');
  if (!Number.isInteger(istenenSira) || istenenSira < 1) throw new GecersizIstek('Sıra numarası 1 veya daha büyük olmalı');

  return db.withTransaction(async (tx) => {
    const ilan = await repo.siraBilgisi(tx, id);
    if (!ilan) throw new BulunamadiHatasi('Kayıt bulunamadı');

    const ids = await repo.grupIdleriniKilitle(tx, ilan.kategori, !!ilan.yayinda);
    const mevcutIndex = ids.indexOf(id);
    if (mevcutIndex === -1) throw new BulunamadiHatasi('Kayıt bulunamadı');

    ids.splice(mevcutIndex, 1);
    const hedefIndex = Math.min(istenenSira, ids.length + 1) - 1;
    ids.splice(hedefIndex, 0, id);

    await repo.siralamaYaz(tx, ids, ilan.kategori);
    return { sira: hedefIndex + 1, urun_ids: ids };
  });
};

// ---------------------------------------------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------------------------------------------

/** Gövdeden ilan alanlarını normalize eder. `yayinda`/`siralama` çağıranın belirlediği değerlerle gelir. */
const ilanAlanlari = (g: IlanOlusturGovdesi, yayinda: unknown, siralama: unknown): IlanAlanlari => ({
  kategori: g.kategori, baslik: g.baslik, aciklama: bosuNull(g.aciklama), fiyat: numOrNull(g.fiyat) || 0, video_url: bosuNull(g.video_url),
  marka: bosuNull(g.marka), model: bosuNull(g.model), yil: numOrNull(g.yil), segment: bosuNull(g.segment),
  motor_cc: numOrNull(g.motor_cc), km: numOrNull(g.km), yayinda, siralama,
  one_cikan: g.one_cikan === true, stok_motor_id: numOrNull(g.stok_motor_id), rubik_link: bosuNull(g.rubik_link),
  hasar_kaydi: bosuNull(g.hasar_kaydi), motor_durumu: motorDurumu(g.kategori, g.motor_durumu),
});

/** Medya, bağlantı ve boyut denetimleri (hepsi veritabanına yazmadan ÖNCE). */
const medyayiDogrula = async (gorseller: unknown, video: unknown, rubikLink: unknown, videoUrl: unknown) => {
  const medyaSorunu = medyaHatasi(gorseller, video) || baglantiHatasi(rubikLink, videoUrl);
  if (medyaSorunu) throw new GecersizIstek(medyaSorunu);
  const asim = await paketAsimi(video, ...(Array.isArray(gorseller) ? gorseller : []));
  if (asim) throw new GecersizIstek(cokBuyukMesaji(asim), 413);
};

/** Görselleri sırayla ekler (geçersiz data URL atlanır); kapak olarak ilk geçerli görselin id'sini döner. */
const gorselleriYaz = async (tx: Veritabani, urunId: number, gorseller: unknown[]): Promise<number | null> => {
  let kapakId: number | null = null;
  for (let i = 0; i < gorseller.length; i++) {
    if (!parseDataUrl(gorseller[i])) continue;
    const id = await repo.gorselEkle(tx, urunId, gorseller[i] as string, i);
    if (kapakId === null) kapakId = id;
  }
  return kapakId;
};

const videoyuYaz = async (tx: Veritabani, urunId: number, video: unknown) => {
  const medya = parseDataUrl(video, IZINLI_VIDEO);
  if (!medya) return;
  await repo.videoDegistir(tx, urunId, video as string, medya.mime);
};

/** Veritabanı paket sınırını aşan yazma (görsel/video) 413'e çevrilir. */
const paketHatasiniCevir = (hata: unknown): never => {
  if (paketHatasi(hata)) throw new GecersizIstek('Dosya çok büyük', 413);
  throw hata;
};

/** İlan oluşturur (gorseller: base64 data URL dizisi; ilki kapak). */
export const ilanOlustur = async (db: BaglamDb, govde: IlanOlusturGovdesi, kullanici: Kullanici) => {
  const { kategori, baslik, segment, gorseller, video } = govde;
  if (!KATEGORILER.includes(kategori as string)) throw new GecersizIstek('Geçersiz kategori');
  if (!kategoriYetkiliMi(kullanici, kategori)) throw new YetkiHatasi('Bu kategori için vitrin yetkiniz yok');
  if (!baslik) throw new GecersizIstek('Başlık zorunlu');
  if (kategori === 'motor' && !segment) throw new GecersizIstek('Motor ilanı için segment zorunlu');
  await medyayiDogrula(gorseller, video, govde.rubik_link, govde.video_url);

  if (segment) await segmentiGaranti(db, segment);
  try {
    return await db.withTransaction(async (tx) => {
      const ilan = await repo.ilanEkle(tx, ilanAlanlari(govde, govde.yayinda !== false, numOrNull(govde.siralama) || 0));
      const kapakId = Array.isArray(gorseller) ? await gorselleriYaz(tx, ilan.id, gorseller) : null;
      if (kapakId !== null) await repo.kapakAyarla(tx, ilan.id, kapakId);
      if (typeof video === 'string' && video) await videoyuYaz(tx, ilan.id, video);
      return { id: ilan.id, ilan_no: ilan.ilan_no, kapak_gorsel_id: kapakId };
    });
  } catch (hata) {
    return paketHatasiniCevir(hata);
  }
};

/** İlanı günceller (gorseller verilirse görseller tamamen yenilenir; video_sil videoyu kaldırır). */
export const ilanGuncelle = async (db: BaglamDb, id: number, govde: IlanGuncelleGovdesi, kullanici: Kullanici) => {
  const { kategori, segment, gorseller, video } = govde;
  const adminMi = kullanici.rol === 'admin';

  const mevcut = await repo.kisaKayit(db, id);
  if (!mevcut) throw new BulunamadiHatasi('Kayıt bulunamadı');
  // Hem mevcut kaydın hem hedef kategorinin yetkisi olmalı (personel kapsam dışına çıkamaz)
  if (!kategoriYetkiliMi(kullanici, mevcut.kategori) || !kategoriYetkiliMi(kullanici, kategori)) {
    throw new YetkiHatasi('Bu kategori için vitrin yetkiniz yok');
  }
  if (kategori === 'motor' && !segment) throw new GecersizIstek('Motor ilanı için segment zorunlu');
  await medyayiDogrula(gorseller, video, govde.rubik_link, govde.video_url);

  if (segment) await segmentiGaranti(db, segment);
  try {
    await db.withTransaction(async (tx) => {
      // Yayın durumu ve sıra yalnızca admin tarafından değişir (PATCH /yayin ve /sira uçlarıyla aynı kural)
      await repo.ilanGuncelle(tx, id, ilanAlanlari(
        govde,
        adminMi ? govde.yayinda !== false : mevcut.yayinda,
        adminMi ? (numOrNull(govde.siralama) || 0) : mevcut.siralama
      ));

      // gorseller alanı gönderildiyse görselleri tamamen yenile
      if (Array.isArray(gorseller)) {
        await repo.gorselleriSil(tx, id);
        await repo.kapakAyarla(tx, id, await gorselleriYaz(tx, id, gorseller));
      }

      // Video: yeni dosya geldiyse değiştir; video_sil işaretliyse kaldır; aksi halde dokunma
      if (typeof video === 'string' && video) await videoyuYaz(tx, id, video);
      else if (govde.video_sil) await repo.videoyuKaldir(tx, id);
    });
  } catch (hata) {
    paketHatasiniCevir(hata);
  }
};

/** İlanı siler (görseller/videolar cascade). Personel yalnızca izinli olduğu kategorideki ilanı silebilir. */
export const ilanSil = async (db: Veritabani, id: number, kullanici: Kullanici) => {
  const kategori = await repo.kategoriBul(db, id);
  if (kategori !== null && !kategoriYetkiliMi(kullanici, kategori)) throw new YetkiHatasi('Bu kategori için vitrin yetkiniz yok');
  await repo.ilanSil(db, id);
};
