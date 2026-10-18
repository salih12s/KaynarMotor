/*
 * Controller yardımcısı: işleyiciyi try/catch ile sarar. Hata fırlatılırsa `hataYanitla` istemci hatasını (4xx + mesaj)
 * ya da sunucu hatasını (günlük + 500) yanıtlar. Controller'lar böylece yalnızca HTTP işini (okuma/yazma) yapar.
 */
import type { Request, RequestHandler, Response } from 'express';
import { hataYanitla } from '../dogrulama/dogrula';

export const sarmala = (baglam: string, isleyici: (req: Request, res: Response) => unknown): RequestHandler =>
  async (req, res) => {
    try {
      await isleyici(req, res);
    } catch (hata) {
      hataYanitla(res, hata, baglam);
    }
  };
