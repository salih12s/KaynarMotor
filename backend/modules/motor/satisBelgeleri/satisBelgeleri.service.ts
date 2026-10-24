/*
 * Satış belgesi iş kuralları: izin verilen dosya türleri (içerik başlığı uzantıyla uyuşmalı), boyut/adet sınırları,
 * arşiv gruplama. HTTP bilmez (express yok). Denetim günlüğü controller'da yazılır.
 */
import path from 'node:path';
import { maxPaket, paketHatasi } from '../../../core/veritabani/db';
import { BulunamadiHatasi, GecersizIstek } from '../../../core/dogrulama/dogrula';
import type { Kullanici, Veritabani } from '../../../core/tipler';
import * as repo from './satisBelgeleri.repository';
import type { ArsivSatiri } from './satisBelgeleri.repository';

export const MAX_BOYUT = 10 * 1024 * 1024; // dosya başına 10 MB
const MAX_ADET = 30; // satış başına

const baslar = (buf: Buffer, bytes: number[]) => bytes.every((b, i) => buf[i] === b);
const OLE2 = [0xd0, 0xcf, 0x11, 0xe0]; // eski .doc / .xls
const ZIP = [0x50, 0x4b]; // .docx / .xlsx (zip kapsayıcı)

/**
 * İzin verilen türler. mime istemciden alınmaz, uzantıdan çıkarılır; ayrıca dosyanın ilk baytları uzantıyla uyuşmalı
 * (adı değiştirilmiş zararlı dosya girmesin).
 */
const TURLER: Record<string, { mime: string; gecerli: (b: Buffer) => boolean }> = {
  pdf: { mime: 'application/pdf', gecerli: (b) => b.subarray(0, 1024).includes('%PDF') },
  doc: { mime: 'application/msword', gecerli: (b) => baslar(b, OLE2) },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', gecerli: (b) => baslar(b, ZIP) },
  xls: { mime: 'application/vnd.ms-excel', gecerli: (b) => baslar(b, OLE2) },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', gecerli: (b) => baslar(b, ZIP) },
  jpg: { mime: 'image/jpeg', gecerli: (b) => baslar(b, [0xff, 0xd8, 0xff]) },
  jpeg: { mime: 'image/jpeg', gecerli: (b) => baslar(b, [0xff, 0xd8, 0xff]) },
  png: { mime: 'image/png', gecerli: (b) => baslar(b, [0x89, 0x50, 0x4e, 0x47]) },
};

/** Dosya adından yol ayracı/denetim karakterlerini atar, 200 karaktere kırpar. Boşsa "belge". */
export const temizAd = (s: unknown): string =>
  // eslint-disable-next-line no-control-regex
  String(s || '')
    .replace(/[\\/\u0000-\u001f<>:"|?*]+/g, '_')
    .trim()
    .slice(0, 200) || 'belge';

export const pozitifId = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Arşiv satırlarını (belge başına bir satır) motora göre gruplar; sıra korunur. Saf fonksiyon. */
export const arsivGrupla = (satirlar: ArsivSatiri[]) => {
  const gruplar: Array<Record<string, any>> = [];
  const harita = new Map<number, Record<string, any>>();
  for (const r of satirlar) {
    let g = harita.get(r.motor_id);
    if (!g) {
      g = {
        motor_id: r.motor_id,
        plaka: r.plaka,
        marka: r.marka,
        model: r.model,
        durum: r.durum,
        alis_tarihi: r.alis_tarihi,
        satis_tarihi: r.satis_tarihi,
        belgeler: [],
      };
      harita.set(r.motor_id, g);
      gruplar.push(g);
    }
    g.belgeler.push({ id: r.id, dosya_adi: r.dosya_adi, mime: r.mime, boyut: r.boyut, created_at: r.created_at });
  }
  return gruplar;
};

export const arsiv = async (db: Veritabani) => arsivGrupla(await repo.arsivSatirlari(db));

export const motorBelgeleri = async (db: Veritabani, motorIdHam: unknown) => {
  const motorId = pozitifId(motorIdHam);
  if (!motorId) throw new GecersizIstek('Geçersiz satış');
  return repo.motorBelgeleri(db, motorId);
};

export const yukle = async (db: Veritabani, girdi: { motorIdHam: unknown; dosyaAdiHam: unknown; icerik: unknown; kullanici: Kullanici }) => {
  const motorId = pozitifId(girdi.motorIdHam);
  if (!motorId) throw new GecersizIstek('Geçersiz satış');
  const buf = girdi.icerik;
  if (!Buffer.isBuffer(buf) || buf.length === 0) throw new GecersizIstek('Dosya boş veya okunamadı');

  const dosyaAdi = temizAd(girdi.dosyaAdiHam);
  const tur = TURLER[path.extname(dosyaAdi).slice(1).toLowerCase()];
  if (!tur) throw new GecersizIstek('Desteklenmeyen dosya türü (PDF, Word, Excel, JPG, PNG kabul edilir)');
  if (!tur.gecerli(buf)) throw new GecersizIstek('Dosya içeriği uzantısıyla uyuşmuyor');
  // Veritabanı sunucusunun tek pakette kabul ettiği boyut belge sınırından küçük olabilir.
  const paketSiniri = (await maxPaket()) - 512 * 1024;
  if (buf.length > paketSiniri) {
    throw new GecersizIstek(`Dosya çok büyük (en fazla ${Math.floor(paketSiniri / 1048576)} MB yüklenebilir)`, 413);
  }

  const motor = await repo.motorVeAdet(db, motorId);
  if (!motor) throw new BulunamadiHatasi('Satış kaydı bulunamadı');
  if (Number(motor.adet) >= MAX_ADET) throw new GecersizIstek(`Bir satışa en fazla ${MAX_ADET} belge eklenebilir`);

  try {
    return await repo.ekle(db, {
      motorId,
      dosyaAdi,
      mime: tur.mime,
      icerik: buf,
      yukleyenId: girdi.kullanici.id || null,
      yukleyenAdi: girdi.kullanici.kullanici_adi || null,
    });
  } catch (hata) {
    if (paketHatasi(hata)) throw new GecersizIstek('Dosya çok büyük', 413);
    throw hata;
  }
};

/** İndirilecek dosya (ad, tür, içerik). */
export const indir = async (db: Veritabani, idHam: unknown) => {
  const id = pozitifId(idHam);
  if (!id) throw new GecersizIstek('Geçersiz belge');
  const belge = await repo.icerikBul(db, id);
  if (!belge) throw new BulunamadiHatasi('Belge bulunamadı');
  return belge;
};

/** Belgeyi siler; (motor_id, dosya_adi) döner (günlük için). */
export const sil = async (db: Veritabani, idHam: unknown) => {
  const id = pozitifId(idHam);
  if (!id) throw new GecersizIstek('Geçersiz belge');
  const silinen = await repo.sil(db, id);
  if (!silinen) throw new BulunamadiHatasi('Belge bulunamadı');
  return silinen;
};
