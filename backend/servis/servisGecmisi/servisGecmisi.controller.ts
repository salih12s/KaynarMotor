/* Servis geçmişi HTTP katmanı (herkese açık, token tabanlı). */
import { pool } from '../../platform/database/db';
import { sarmala } from '../../platform/lib/http/kontrolcu';
import * as servis from './servisGecmisi.service';

export const gecmisiGetir = sarmala('Servis geçmişi hatası:', async (req, res) => {
  res.json(await servis.gecmisiGetir(pool, req.params.token));
});
