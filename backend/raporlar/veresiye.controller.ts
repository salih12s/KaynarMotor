/* Veresiye HTTP katmanı. */
import { pool } from '../platform/database/db';
import { sarmala } from '../platform/lib/http/kontrolcu';
import * as servis from './veresiye.service';

export const borclar = sarmala('Veresiye listeleme hatası:', async (_req, res) => {
  res.json(await servis.borclar(pool));
});
