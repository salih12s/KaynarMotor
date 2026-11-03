/* Vitrin segment ve iletişim HTTP katmanı. */
import { pool } from '../database/db';
import { dogrula } from '../lib/dogrulama/dogrula';
import { sarmala } from '../lib/http/kontrolcu';
import { iletisimGovdesi, segmentGovdesi } from '../schemas/iletisim.schemas';
import * as servis from '../services/iletisim.service';

export const segmentleriListele = sarmala('Vitrin segment hatası:', async (_req, res) => {
  res.json(await servis.segmentleriListele(pool));
});

export const iletisimleriListele = sarmala('Vitrin iletişim hatası:', async (_req, res) => {
  res.json(await servis.iletisimleriListele(pool));
});

export const segmentEkle = sarmala('Segment ekleme hatası:', async (req, res) => {
  res.status(201).json(await servis.segmentEkle(pool, dogrula(segmentGovdesi, req.body || {})));
});

export const iletisimKaydet = sarmala('Vitrin iletişim güncelleme hatası:', async (req, res) => {
  await servis.iletisimKaydet(pool, String(req.params.kategori), dogrula(iletisimGovdesi, req.body || {}), req.user);
  res.json({ message: 'Kaydedildi' });
});
