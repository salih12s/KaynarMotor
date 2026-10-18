/* Yedek parça stok HTTP katmanı. */
import { pool } from '../../core/db';
import { dogrula } from '../../core/dogrula';
import { sarmala } from '../../core/kontrolcu';
import { stokGovdesi, topluStokGovdesi } from './yedekParcaStok.schemas';
import * as servis from './yedekParcaStok.service';

export const sonrakiStokKodu = sarmala('Yedek parça stok kodu hatası:', async (_req, res) => {
  res.json(await servis.sonrakiStokKodu(pool));
});

export const listele = sarmala('Yedek parça stok listeleme hatası:', async (_req, res) => {
  res.json(await servis.listele(pool));
});

export const ara = sarmala('Yedek parça stok arama hatası:', async (req, res) => {
  res.json(await servis.ara(pool, req.query.q));
});

export const barkodlaBul = sarmala('Yedek parça barkod hatası:', async (req, res) => {
  res.json(await servis.barkodlaBul(pool, String(req.params.kod || '')));
});

export const ekle = sarmala('Yedek parça stok ekleme hatası:', async (req, res) => {
  res.status(201).json(await servis.ekle(pool, dogrula(stokGovdesi, req.body)));
});

export const guncelle = sarmala('Yedek parça stok güncelleme hatası:', async (req, res) => {
  res.json(await servis.guncelle(pool, Number(req.params.id), dogrula(stokGovdesi, req.body)));
});

export const sil = sarmala('Yedek parça stok silme hatası:', async (req, res) => {
  await servis.sil(pool, Number(req.params.id));
  res.json({ message: 'Stok silindi' });
});

export const topluEkle = sarmala('Yedek parça toplu stok hatası:', async (req, res) => {
  const eklenen = await servis.topluEkle(pool, dogrula(topluStokGovdesi, req.body));
  res.json({ message: `${eklenen} stok kaydı eklendi/güncellendi` });
});
