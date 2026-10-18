/* İstek doğrulama yardımcıları ve istemci hata sınıfları (route/controller/service'ler arasında ortak). */
import type { Response } from 'express';
import type { z } from 'zod';

// İstemcinin düzeltebileceği hata: 4xx döner, mesajı kullanıcıya gösterilir. Controller'lar bunu `hataYanitla` ile
// ayırır; merkezi hata işleyicisi de tanır (server.js). Service'ler HTTP bilmez: durumu bu sınıflarla bildirir.
export class IstemciHatasi extends Error {
  status: number;
  istemciHatasi = true as const;
  constructor(mesaj: string, durum = 400) {
    super(mesaj);
    this.name = 'IstemciHatasi';
    this.status = durum;
  }
}

/** 400: geçersiz istek. */
export class GecersizIstek extends IstemciHatasi {
  constructor(mesaj: string, durum = 400) {
    super(mesaj, durum);
    this.name = 'GecersizIstek';
  }
}

/** 404: kayıt yok. */
export class BulunamadiHatasi extends IstemciHatasi {
  constructor(mesaj = 'Kayıt bulunamadı') {
    super(mesaj, 404);
    this.name = 'BulunamadiHatasi';
  }
}

/** 403: yetki yok. */
export class YetkiHatasi extends IstemciHatasi {
  constructor(mesaj = 'Bu işlem için yetkiniz yok') {
    super(mesaj, 403);
    this.name = 'YetkiHatasi';
  }
}

/** 409: kayıt mevcut durumla çakışıyor. */
export class CakismaHatasi extends IstemciHatasi {
  constructor(mesaj: string) {
    super(mesaj, 409);
    this.name = 'CakismaHatasi';
  }
}

// Adet: pozitif tam sayı olmalı. Boş/undefined/null → varsayılan (1). 0, negatif, ondalık, metin → 400.
// (Eskiden `Number(adet) || 1` negatif adedi geçiriyordu: negatif satış stoğu ARTIRIYORDU.)
export const adetCoz = (deger: unknown, varsayilan = 1): number => {
  if (deger === '' || deger === undefined || deger === null) return varsayilan;
  const n = Number(deger);
  if (!Number.isInteger(n) || n <= 0) throw new GecersizIstek('Adet pozitif bir tam sayı olmalıdır');
  return n;
};

// Formlar boş alanı '' olarak gönderir; tamsayı/FK kolonuna '' yazılamaz (katı SQL modunda hata) → NULL
export const bosuNull = <T>(deger: T | '' | undefined): T | null => (deger === '' || deger === undefined ? null : deger);

// Şifre kuralı: metin, 8–128 karakter. Sorun varsa kullanıcıya gösterilecek mesajı, yoksa null döndürür.
// (Yalnızca YENİ şifreler denetlenir; mevcut kullanıcılar eski şifreleriyle girmeye devam eder.)
export const sifreSorunu = (sifre: unknown): string | null => {
  if (typeof sifre !== 'string' || sifre.length < 8) return 'Şifre en az 8 karakter olmalıdır';
  if (sifre.length > 128) return 'Şifre en fazla 128 karakter olabilir';
  return null;
};

const istemciHatasiMi = (hata: unknown): hata is IstemciHatasi =>
  typeof hata === 'object' && hata !== null && (hata as { istemciHatasi?: unknown }).istemciHatasi === true;

// catch içinde: istemci hatasıysa 4xx + mesaj, değilse günlüğe yaz ve 500
export const hataYanitla = (res: Response, hata: unknown, baglam: string): Response => {
  if (istemciHatasiMi(hata)) return res.status(hata.status).json({ message: hata.message });
  console.error(baglam, hata);
  return res.status(500).json({ message: 'Sunucu hatası' });
};

/**
 * zod şemasıyla doğrular; geçersizse ilk sorunun mesajıyla 400 (GecersizIstek) fırlatır.
 * Şemalar API sözleşmesini DEĞİŞTİRMEZ: mevcut kuralları ve alan adlarını kodlar (bilinçli olarak gevşek).
 */
export const dogrula = <S extends z.ZodType>(sema: S, veri: unknown): z.infer<S> => {
  const sonuc = sema.safeParse(veri);
  if (!sonuc.success) throw new GecersizIstek(sonuc.error.issues[0]?.message || 'Geçersiz istek');
  return sonuc.data;
};
