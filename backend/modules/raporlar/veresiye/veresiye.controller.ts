/* Veresiye HTTP katmanı. */
import { pool } from '../../../core/veritabani/db';
import { sarmala } from '../../../core/http/kontrolcu';
import * as servis from './veresiye.service';

export const borclar = sarmala('Veresiye listeleme hatası:', async (_req, res) => {
  res.json(await servis.borclar(pool));
});
