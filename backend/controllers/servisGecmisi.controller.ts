/* Servis geçmişi HTTP katmanı (herkese açık, token tabanlı). */
import { pool } from '../database/db';
import { sarmala } from '../lib/http/kontrolcu';
import * as servis from '../services/servisGecmisi.service';

export const gecmisiGetir = sarmala('Servis geçmişi hatası:', async (req, res) => {
  res.json(await servis.gecmisiGetir(pool, req.params.token));
});
