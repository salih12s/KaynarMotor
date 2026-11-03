/* Veresiye HTTP katmanı. */
import { pool } from '../database/db';
import { sarmala } from '../lib/http/kontrolcu';
import * as servis from '../services/veresiye.service';

export const borclar = sarmala('Veresiye listeleme hatası:', async (_req, res) => {
  res.json(await servis.borclar(pool));
});
