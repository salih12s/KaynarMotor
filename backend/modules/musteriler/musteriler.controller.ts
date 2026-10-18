/* Müşteri HTTP katmanı: isteği okur, servisi çağırır, yanıtı yazar. İş kuralı burada değil, service'te. */
import { pool } from '../../core/db';
import { dogrula } from '../../core/dogrula';
import { sarmala } from '../../core/kontrolcu';
import { musteriGovdesi } from './musteriler.schemas';
import * as servis from './musteriler.service';

export const listele = sarmala('Müşteri listeleme hatası:', async (_req, res) => {
  res.json(await servis.listele(pool));
});

export const ara = sarmala('Müşteri arama hatası:', async (req, res) => {
  res.json(await servis.ara(pool, String(req.params.query)));
});

export const telefonaGoreBul = sarmala('Telefon arama hatası:', async (req, res) => {
  res.json(await servis.telefonaGoreBul(pool, String(req.params.telefon || '')));
});

export const detay = sarmala('Müşteri detay hatası:', async (req, res) => {
  res.json(await servis.detay(pool, Number(req.params.id)));
});

export const ekle = sarmala('Müşteri ekleme hatası:', async (req, res) => {
  res.status(201).json(await servis.ekle(pool, dogrula(musteriGovdesi, req.body)));
});

export const guncelle = sarmala('Müşteri güncelleme hatası:', async (req, res) => {
  res.json(await servis.guncelle(pool, Number(req.params.id), dogrula(musteriGovdesi, req.body)));
});

export const sil = sarmala('Müşteri silme hatası:', async (req, res) => {
  await servis.sil(pool, Number(req.params.id));
  res.json({ message: 'Müşteri silindi' });
});
