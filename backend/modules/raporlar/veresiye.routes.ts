/* Veresiye (açık borç) URL'si. Yalnızca admin: rol kısıtı server.js'te modül düzeyinde uygulanır. Girdisi yoktur. */
import { Router } from 'express';
import * as kontrolcu from './veresiye.controller';

const router = Router();

router.get('/', kontrolcu.borclar);

export default router;
