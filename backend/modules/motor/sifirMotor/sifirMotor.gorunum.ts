/*
 * Sıfır motor stoğunda "kim neyi görür" (saf fonksiyonlar: veritabanı/HTTP yok).
 *
 * Liste fiyatı sitede de yayınlanan fiyattır: stoğu görebilen herkes görür. Alış fiyatı (maliyet) ikinci el motordaki
 * kuralla aynıdır: admin, alış fiyatı yetkilisi, motor satış yetkilisi ve izinli muhasebeci. Yatırımcı ve izinsiz
 * muhasebeci bu stoğa hiç giremez (routes'taki kapı).
 */
import type { Kullanici } from '../../../core/tipler';
import { muhasebeMotorGorur } from '../ikinciElMotor/ikinciElMotor.gorunum';
import type { SifirMotorSatiri } from './sifirMotor.repository';

export const sifirAlisGorur = (user: Kullanici): boolean =>
  user.rol === 'admin' || (user.rol === 'personel' && (!!user.alis_fiyati_gor || !!user.motor_satis_yetkisi)) || muhasebeMotorGorur(user);

/** Sayaçlar (COUNT) MariaDB'de metin döner: sayıya çevrilir. Alış fiyatı yetkisizden silinir. */
export const sanitizeSifirMotor = (row: SifirMotorSatiri, user: Kullanici): SifirMotorSatiri => {
  const m: SifirMotorSatiri = { ...row };
  if ('gorsel_sayisi' in m) m.gorsel_sayisi = Number(m.gorsel_sayisi) || 0;
  if ('satilan_adet' in m) m.satilan_adet = Number(m.satilan_adet) || 0;
  if (!sifirAlisGorur(user)) delete m.alis_fiyati;
  return m;
};
