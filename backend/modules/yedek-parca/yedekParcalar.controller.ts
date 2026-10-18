/* Yedek parça satış HTTP katmanı. */
import { pool } from '../../core/db';
import { dogrula } from '../../core/dogrula';
import { sarmala } from '../../core/kontrolcu';
import { satisGovdesi } from './yedekParcalar.schemas';
import * as servis from './yedekParcalar.service';

export const listele = sarmala('Yedek parça listeleme hatası:', async (_req, res) => {
  res.json(await servis.listele(pool));
});

export const detay = sarmala('Yedek parça detay hatası:', async (req, res) => {
  res.json(await servis.detay(pool, Number(req.params.id)));
});

export const ekle = sarmala('Yedek parça satış hatası:', async (req, res) => {
  res.status(201).json(await servis.ekle(pool, dogrula(satisGovdesi, req.body)));
});

export const guncelle = sarmala('Yedek parça güncelleme hatası:', async (req, res) => {
  res.json(await servis.guncelle(pool, Number(req.params.id), dogrula(satisGovdesi, req.body)));
});

export const sil = sarmala('Yedek parça silme hatası:', async (req, res) => {
  await servis.sil(pool, Number(req.params.id));
  res.json({ message: 'Yedek parça silindi' });
});
