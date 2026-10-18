/* Rapor HTTP katmanı: sorgu parametrelerini doğrular, servisi çağırır, yanıtı yazar. */
import { pool } from '../../../core/veritabani/db';
import { dogrula } from '../../../core/dogrulama/dogrula';
import { sarmala } from '../../../core/http/kontrolcu';
import {
  aralikSorgusu, fisKarSorgusu, gunlukSorgusu, yatirimciOzetSorgusu, yatirimciRaporSorgusu,
} from './raporlar.schemas';
import * as servis from './raporlar.service';

export const gunluk = sarmala('Günlük rapor hatası:', async (req, res) => {
  res.json(await servis.gunluk(pool, dogrula(gunlukSorgusu, req.query)));
});

export const aralik = sarmala('Aralık rapor hatası:', async (req, res) => {
  res.json(await servis.aralik(pool, dogrula(aralikSorgusu, req.query)));
});

export const genel = sarmala('Genel rapor hatası:', async (_req, res) => {
  res.json(await servis.genel(pool));
});

export const fisKar = sarmala('Fiş kâr raporu hatası:', async (req, res) => {
  res.json(await servis.fisKar(pool, dogrula(fisKarSorgusu, req.query)));
});

export const personeller = sarmala('Personel listesi hatası:', async (_req, res) => {
  res.json(await servis.personeller(pool));
});

export const yatirimciRaporu = sarmala('Yatırımcı rapor hatası:', async (req, res) => {
  res.json(await servis.yatirimciRaporu(pool, req.user, dogrula(yatirimciRaporSorgusu, req.query)));
});

export const yatirimciOzet = sarmala('Yatırımcı özet hatası:', async (req, res) => {
  res.json(await servis.yatirimciOzet(pool, dogrula(yatirimciOzetSorgusu, req.query)));
});
