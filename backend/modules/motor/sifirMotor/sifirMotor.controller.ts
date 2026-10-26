/* Sıfır motor stoğu HTTP katmanı: isteği okur, servisi çağırır, denetim günlüğünü yazar, yanıtı verir. */
import type { Request, Response } from 'express';
import { ISLEM_TIPLERI, logAktivite } from '../../../core/gunluk/activityLogger';
import { pool } from '../../../core/veritabani/db';
import { dogrula } from '../../../core/dogrulama/dogrula';
import { sarmala } from '../../../core/http/kontrolcu';
import { KALICI_ONBELLEK, medyaBasliklari } from '../../vitrin/medya/medya.controller';
import { sifirMotorGovdesi } from './sifirMotor.schemas';
import * as servis from './sifirMotor.service';

const gunluk = (req: Request, islem_tipi: string, islem_detay: string, hedef_id: number) =>
  logAktivite({
    kullanici_id: req.user.id,
    kullanici_adi: req.user.kullanici_adi,
    islem_tipi,
    islem_detay,
    hedef_tablo: 'sifir_motorlar',
    hedef_id,
  });

export const listele = sarmala('Sıfır motor listeleme hatası:', async (req, res) => {
  res.json(await servis.listele(pool, req.user));
});

export const detay = sarmala('Sıfır motor detay hatası:', async (req, res) => {
  res.json(await servis.detay(pool, Number(req.params.id), req.user));
});

export const olustur = sarmala('Sıfır motor ekleme hatası:', async (req, res) => {
  const govde = dogrula(sifirMotorGovdesi, req.body);
  const kayit = await servis.olustur(pool, govde, req.user);
  await gunluk(req, ISLEM_TIPLERI.CREATE, `Sıfır motor stoğa eklendi: ${kayit.marka} ${kayit.model || ''}`.trim(), kayit.id);
  res.status(201).json(kayit);
});

export const guncelle = sarmala('Sıfır motor güncelleme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  const kayit = await servis.guncelle(pool, id, dogrula(sifirMotorGovdesi, req.body), req.user);
  await gunluk(req, ISLEM_TIPLERI.UPDATE, `Sıfır motor #${id} güncellendi`, id);
  res.json(kayit);
});

export const sil = sarmala('Sıfır motor silme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  await servis.sil(pool, id, req.user);
  await gunluk(req, ISLEM_TIPLERI.DELETE, `Sıfır motor #${id} stoktan silindi`, id);
  res.json({ message: 'Sıfır motor silindi' });
});

/** GET /gorsel/:id (herkese açık): vitrin görselleriyle aynı başlıklar; hata yanıtı metindir. */
export const gorsel = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const etag = `"sifir-gorsel-${id}"`;
    const kalici = { 'Cache-Control': KALICI_ONBELLEK, ETag: etag };
    if (req.headers['if-none-match'] === etag) return res.set(kalici).status(304).end();
    const sonuc = await servis.gorselBul(pool, id);
    if (sonuc.tur !== 'bulundu') return res.set('Cache-Control', 'public, max-age=60').status(404).send('Görsel bulunamadı');
    medyaBasliklari(res);
    res.set(kalici).set('Content-Type', sonuc.medya.mime);
    res.send(sonuc.medya.buffer);
  } catch (hata) {
    console.error('Sıfır motor görsel hatası:', (hata as Error).message);
    res.set('Cache-Control', 'no-store').status(500).send('Sunucu hatası');
  }
};
