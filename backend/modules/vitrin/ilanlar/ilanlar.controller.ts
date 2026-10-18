/* Vitrin ilanları HTTP katmanı. */
import { pool } from '../../../core/veritabani/db';
import { dogrula } from '../../../core/dogrulama/dogrula';
import { sarmala } from '../../../core/http/kontrolcu';
import { opsiyonelKullanici } from '../../../core/middleware/auth';
import {
  ilanGuncelleGovdesi, ilanOlusturGovdesi, ilanSorgusu, siraGovdesi, siralaGovdesi, yayinGovdesi,
} from './ilanlar.schemas';
import * as servis from './ilanlar.service';

const govdeyiOku = (req: { body?: unknown }): unknown => req.body || {};

export const yuklemeSiniri = sarmala('Vitrin yükleme sınırı hatası:', async (_req, res) => {
  res.json(await servis.yuklemeSiniri());
});

export const ilanlariListele = sarmala('Vitrin liste hatası:', async (req, res) => {
  res.json(await servis.ilanlariListele(pool, dogrula(ilanSorgusu, req.query)));
});

export const markalariListele = sarmala('Vitrin marka listesi hatası:', async (req, res) => {
  const durum = typeof req.query.durum === 'string' ? req.query.durum : undefined;
  res.json(await servis.markalariListele(pool, durum));
});

export const ilanDetay = sarmala('Vitrin detay hatası:', async (req, res) => {
  res.json(await servis.ilanDetay(pool, Number(req.params.id), () => opsiyonelKullanici(req)));
});

export const sirala = sarmala('Vitrin sıralama hatası:', async (req, res) => {
  await servis.sirala(pool, dogrula(siralaGovdesi, govdeyiOku(req)), req.user);
  res.json({ message: 'Vitrin sırası güncellendi' });
});

export const yayinDurumuAyarla = sarmala('Vitrin yayın durumu hatası:', async (req, res) => {
  res.json(await servis.yayinDurumuAyarla(pool, Number(req.params.id), dogrula(yayinGovdesi, govdeyiOku(req))));
});

export const siraAyarla = sarmala('Vitrin doğrudan sıralama hatası:', async (req, res) => {
  res.json(await servis.siraAyarla(pool, Number(req.params.id), dogrula(siraGovdesi, govdeyiOku(req))));
});

export const ilanOlustur = sarmala('Vitrin ekleme hatası:', async (req, res) => {
  res.status(201).json(await servis.ilanOlustur(pool, dogrula(ilanOlusturGovdesi, govdeyiOku(req)), req.user));
});

export const ilanGuncelle = sarmala('Vitrin güncelleme hatası:', async (req, res) => {
  await servis.ilanGuncelle(pool, Number(req.params.id), dogrula(ilanGuncelleGovdesi, govdeyiOku(req)), req.user);
  res.json({ message: 'Güncellendi' });
});

export const ilanSil = sarmala('Vitrin silme hatası:', async (req, res) => {
  await servis.ilanSil(pool, Number(req.params.id), req.user);
  res.json({ message: 'Silindi' });
});
