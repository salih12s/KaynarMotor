// Sıfır motor stoğunun saf kuralları (ekran/durum yok, doğrudan test edilebilir): form dönüşümleri, adlandırma, süzme.
import type { Motor, SifirMotor } from '../../../shared/tipler';
import { metinIcerir } from '../../../shared/utils/metin';

/** Form alanı: kullanıcı yazarken metin, kayıttan gelirken sayı olabilir. */
type FormSayisi = string | number;

export interface SifirMotorFormu {
  marka: string;
  model: string;
  yil: FormSayisi;
  motor_cc: FormSayisi;
  segment: string;
  alis_fiyati: FormSayisi;
  liste_fiyati: FormSayisi;
  aciklama: string;
}

export const bosSifirForm = (): SifirMotorFormu => ({
  marka: '',
  model: '',
  yil: new Date().getFullYear(),
  motor_cc: '',
  segment: '',
  alis_fiyati: '',
  liste_fiyati: '',
  aciklama: '',
});

export const sifirdenForm = (m: SifirMotor): SifirMotorFormu => ({
  marka: m.marka || '',
  model: m.model || '',
  yil: m.yil || '',
  motor_cc: m.motor_cc || '',
  segment: m.segment || '',
  alis_fiyati: m.alis_fiyati ?? '',
  liste_fiyati: m.liste_fiyati || '',
  aciklama: m.aciklama || '',
});

/** "Honda PCX 125 (2026)": listelerde ve satış formunda modelin adı. */
export const sifirAdi = (m: Pick<SifirMotor, 'marka' | 'model' | 'yil'>): string =>
  `${[m.marka, m.model].filter(Boolean).join(' ')}${m.yil ? ` (${m.yil})` : ''}`;

/** Arama (marka, model, segment) + marka/model sırası. */
export const sifirFiltrele = (liste: SifirMotor[], arama: string): SifirMotor[] =>
  liste
    .filter((m) => metinIcerir(m.marka, arama) || metinIcerir(m.model, arama) || metinIcerir(m.segment, arama))
    .sort((a, b) => sifirAdi(a).localeCompare(sifirAdi(b), 'tr'));

/** Satış kaydı sıfır stoktan mı? (Stok ekranı bunları ikinci el listesinde göstermez.) */
export const sifirSatisMi = (m: Pick<Motor, 'motor_durumu'>): boolean => m.motor_durumu === 'sifir';
