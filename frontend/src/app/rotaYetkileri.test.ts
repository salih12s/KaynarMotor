/*
 * Rota yetkileri (saf kural). Regression (E02): Taksit Hesaplama menüde yatırımcı ve muhasebeciye gizliydi ama rotada guard yoktu; adres çubuğuna
 * /taksit-hesaplama yazan yatırımcı sayfayı açabiliyordu. Menü ve rota guard'ı artık AYNI fonksiyonu kullanır: biri değişirse öteki kendiliğinden uyar.
 * (Sayfanın sunucu ucu yok, hesap tarayıcıda; etkisi düşük ama kural tek yerde olmalı.)
 */
import { taksitGorebilirMi } from './rotaYetkileri';

describe('taksitGorebilirMi', () => {
  test('admin ve personel görebilir', () => {
    expect(taksitGorebilirMi({ rol: 'admin' })).toBe(true);
    expect(taksitGorebilirMi({ rol: 'personel' })).toBe(true);
  });

  test('yatırımcı ve muhasebeci göremez', () => {
    expect(taksitGorebilirMi({ rol: 'yatirimci' })).toBe(false);
    expect(taksitGorebilirMi({ rol: 'muhasebeci' })).toBe(false);
  });

  test('oturum yoksa göremez', () => {
    expect(taksitGorebilirMi(null)).toBe(false);
    expect(taksitGorebilirMi(undefined)).toBe(false);
  });
});
