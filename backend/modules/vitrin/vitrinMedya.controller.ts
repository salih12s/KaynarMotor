/*
 * Vitrin medyası HTTP katmanı: ikili yanıt (görsel/video), önbellek başlıkları, ETag/304 ve Range (206). Hata yanıtları
 * bu uçlarda JSON değil metindir ("Görsel bulunamadı" vb.). Önbellek başlıkları yalnızca BAŞARILI yanıtta "bir yıl, değişmez"
 * olur: eskiden 404/500 de aynı başlıkla gidiyor, aradaki önbellekler hatayı bir yıl saklayabiliyordu.
 */
import type { Request, RequestHandler, Response } from 'express';
import { pool } from '../../core/db';
import * as servis from './vitrinMedya.service';

const KALICI_ONBELLEK = 'public, max-age=31536000, immutable';

/** Sunulan medya betik çalıştıramasın: sniffing kapalı, sandbox'lı CSP. */
const medyaBasliklari = (res: Response) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; sandbox");
};

/** Metin hata yanıtlı sarmalayıcı: beklenmeyen hata günlüğe yazılır, 500 "Sunucu hatası" metni döner. */
const medyaSarmala = (baglam: string, isleyici: (req: Request, res: Response) => unknown, onbellekYok: boolean): RequestHandler =>
  async (req, res) => {
    try {
      await isleyici(req, res);
    } catch (hata) {
      console.error(baglam, (hata as Error).message);
      if (onbellekYok) res.set('Cache-Control', 'no-store');
      res.status(500).send('Sunucu hatası');
    }
  };

const bulunamadi = (res: Response, mesaj: string, kisaOnbellek: boolean) => {
  if (kisaOnbellek) res.set('Cache-Control', 'public, max-age=60');
  return res.status(404).send(mesaj);
};

/** GET /iletisim-gorsel/:kategori - hizmet sayfası görselini binary servis et. */
export const iletisimGorseli = medyaSarmala('Vitrin iletişim görsel hatası:', async (req, res) => {
  const sonuc = await servis.iletisimGorseliBul(pool, String(req.params.kategori));
  if (sonuc.tur === 'yok') return bulunamadi(res, 'Görsel bulunamadı', false);
  if (sonuc.tur === 'gecersiz') return bulunamadi(res, 'Geçersiz görsel', false);
  medyaBasliklari(res);
  res.set('Content-Type', sonuc.medya.mime);
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(sonuc.medya.buffer);
}, false);

/** GET /gorsel/:id - görseli binary olarak servis et (tarayıcı önbelleğe alır). */
export const gorsel = medyaSarmala('Vitrin görsel hatası:', async (req, res) => {
  const id = String(req.params.id);
  const etag = `"vitrin-gorsel-${id}"`;
  const kalici = { 'Cache-Control': KALICI_ONBELLEK, ETag: etag };
  if (req.headers['if-none-match'] === etag) return res.set(kalici).status(304).end();

  const sonuc = await servis.gorselBul(pool, id);
  if (sonuc.tur === 'yok') return bulunamadi(res, 'Görsel bulunamadı', true);
  if (sonuc.tur === 'gecersiz') return bulunamadi(res, 'Geçersiz görsel', true);
  medyaBasliklari(res);
  res.set(kalici).set('Content-Type', sonuc.medya.mime);
  res.send(sonuc.medya.buffer);
}, true);

/** GET /video/:id - yüklenen videoyu HTTP Range destekli (akıcı) servis et. */
export const video = medyaSarmala('Vitrin video hatası:', async (req, res) => {
  const id = String(req.params.id);
  const etag = `"vitrin-video-${id}"`;
  if (!req.headers.range && req.headers['if-none-match'] === etag) {
    return res.set({ 'Cache-Control': KALICI_ONBELLEK, ETag: etag }).status(304).end();
  }
  const sonuc = await servis.videoBul(pool, id);
  if (sonuc.tur === 'yok') return bulunamadi(res, 'Video bulunamadı', true);
  if (sonuc.tur === 'gecersiz') return bulunamadi(res, 'Geçersiz video', true);

  const { mime, buffer } = sonuc.medya;
  res.set({ 'Cache-Control': KALICI_ONBELLEK, ETag: etag });
  medyaBasliklari(res);
  const toplam = buffer.length;

  // Tarayıcı parça (Range) istediyse 206 ile sadece o aralığı gönder → kasmaz, sarılabilir
  if (req.headers.range) {
    const { baslangic, bitis } = servis.aralikCoz(req.headers.range, toplam);
    const parca = buffer.subarray(baslangic, bitis + 1);
    res.status(206).set({
      'Content-Range': `bytes ${baslangic}-${bitis}/${toplam}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(parca.length),
      'Content-Type': mime,
      'Cache-Control': KALICI_ONBELLEK,
    });
    return res.end(parca);
  }

  res.set({
    'Content-Type': mime,
    'Content-Length': String(toplam),
    'Accept-Ranges': 'bytes',
    'Cache-Control': KALICI_ONBELLEK,
  });
  res.end(buffer);
}, true);
