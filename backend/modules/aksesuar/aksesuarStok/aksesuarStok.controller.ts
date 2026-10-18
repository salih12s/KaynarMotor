/* Aksesuar stok HTTP katmanı. */
import { pool } from '../../../core/veritabani/db';
import { dogrula } from '../../../core/dogrulama/dogrula';
import { sarmala } from '../../../core/http/kontrolcu';
import { stokGovdesi, topluStokGovdesi } from './aksesuarStok.schemas';
import * as servis from './aksesuarStok.service';

export const sonrakiStokKodu = sarmala('Aksesuar stok kodu hatası:', async (_req, res) => {
  res.json(await servis.sonrakiStokKodu(pool));
});

export const listele = sarmala('Aksesuar stok listeleme hatası:', async (_req, res) => {
  res.json(await servis.listele(pool));
});

export const ara = sarmala('Aksesuar stok arama hatası:', async (req, res) => {
  res.json(await servis.ara(pool, req.query.q));
});

export const barkodlaBul = sarmala('Aksesuar barkod hatası:', async (req, res) => {
  res.json(await servis.barkodlaBul(pool, String(req.params.kod || '')));
});

export const ekle = sarmala('Aksesuar stok ekleme hatası:', async (req, res) => {
  res.status(201).json(await servis.ekle(pool, dogrula(stokGovdesi, req.body)));
});

export const guncelle = sarmala('Aksesuar stok güncelleme hatası:', async (req, res) => {
  res.json(await servis.guncelle(pool, Number(req.params.id), dogrula(stokGovdesi, req.body)));
});

export const sil = sarmala('Aksesuar stok silme hatası:', async (req, res) => {
  await servis.sil(pool, Number(req.params.id));
  res.json({ message: 'Stok silindi' });
});

export const topluEkle = sarmala('Aksesuar toplu stok hatası:', async (req, res) => {
  const eklenen = await servis.topluEkle(pool, dogrula(topluStokGovdesi, req.body));
  res.json({ message: `${eklenen} stok kaydı eklendi/güncellendi` });
});
