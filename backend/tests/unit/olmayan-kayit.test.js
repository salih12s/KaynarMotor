/*
 * Olmayan kayıt: silme/onay/ret 200 değil 404 (BulunamadiHatasi). Servisler HTTP bilmez; hatayı sınıfıyla bildirir, 404'e çevirmek controller'ın işi.
 * Eskiden `DELETE ... WHERE id = ?` etkilenen satır sayısına bakılmadan "başarılı" sayılıyordu (GET/PUT aynı kayıt için 404 veriyordu) ve
 * denetim günlüğüne hiç olmayan bir silme yazılıyordu (E03). Sahte veritabanı varsayılan olarak boş sonuç ve 0 etkilenen satır döndürür:
 * yani "kayıt yok" durumudur.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');

const musteriler = require('../../services/musteriler.service');
const isEmirleri = require('../../services/isEmirleri.service');
const aksesuarlar = require('../../services/aksesuarlar.service');
const aksesuarStok = require('../../services/aksesuarStok.service');
const yedekParcalar = require('../../services/yedekParcalar.service');
const yedekParcaStok = require('../../services/yedekParcaStok.service');
const eticaret = require('../../services/eticaret.service');
const motor = require('../../services/ikinciElMotor.service');
const ilanlar = require('../../services/ilanlar.service');
const auth = require('../../services/auth.service');

const ADMIN = { id: 1, kullanici_adi: 'admin', ad_soyad: 'Admin', rol: 'admin' };

const OLMAYAN = [
  ['müşteri silme', () => musteriler.sil(sahteDb(), 9)],
  ['iş emri silme', () => isEmirleri.sil(sahteDb(), 9, ADMIN)],
  ['aksesuar satışı silme', () => aksesuarlar.sil(sahteDb(), 9)],
  ['aksesuar stoğu silme', () => aksesuarStok.sil(sahteDb(), 9)],
  ['yedek parça satışı silme', () => yedekParcalar.sil(sahteDb(), 9)],
  ['yedek parça stoğu silme', () => yedekParcaStok.sil(sahteDb(), 9)],
  ['e-ticaret satışı silme', () => eticaret.satisSil(sahteDb(), 9)],
  ['e-ticaret platformu silme', () => eticaret.platformSil(sahteDb(), 9, ADMIN)],
  ['ikinci el motor silme', () => motor.sil(sahteDb(), 9, ADMIN)],
  ['vitrin ilanı silme', () => ilanlar.ilanSil(sahteDb(), 9, ADMIN)],
  ['kullanıcı silme', () => auth.kullaniciSil(sahteDb(), 9, { id: 1 })],
  ['kullanıcı onaylama', () => auth.onayla(sahteDb(), 9)],
  ['kullanıcı reddetme', () => auth.reddet(sahteDb(), 9)],
];

describe('olmayan kayıt: 404 BulunamadiHatasi', () => {
  for (const [ad, calistir] of OLMAYAN) {
    it(`${ad}: kayıt yoksa 404`, async () => {
      await assert.rejects(calistir(), (h) => h.status === 404, `${ad} 404 vermedi`);
    });
  }
});
