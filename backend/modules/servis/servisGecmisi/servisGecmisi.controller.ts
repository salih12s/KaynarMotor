/* Servis geçmişi HTTP katmanı (herkese açık, token tabanlı). */
import { pool } from '../../../core/veritabani/db';
import { sarmala } from '../../../core/http/kontrolcu';
import * as servis from './servisGecmisi.service';

export const gecmisiGetir = sarmala('Servis geçmişi hatası:', async (req, res) => {
  res.json(await servis.gecmisiGetir(pool, req.params.token));
});
