// Rol ve izin bayraklarını tek yerde hesaplar (Motor Stok ekranı ve alt bileşenleri bunları kullanır).
import type { Kullanici } from '../../../shared/tipler';

export const motorYetkileri = (user: Kullanici | null | undefined) => {
  const isAdmin = user?.rol === 'admin';
  const isYatirimci = user?.rol === 'yatirimci';
  // Liste fiyatı açık yatırımcı = "vitrin" modu: tüm satılık motorları SADECE liste fiyatıyla görür, hiçbir şey yapamaz
  const isYatirimciVitrin = isYatirimci && !!user?.liste_fiyati_gor;
  // Liste fiyatı kapalı yatırımcı: kendi motorlarını tam detayıyla görür
  const isYatirimciSahip = isYatirimci && !isYatirimciVitrin;
  const full = isAdmin || isYatirimciSahip; // Admin ve kendi motoru olan yatırımcı tam görür
  // Motor Satış yetkisi; satış fiyatı, alış fiyatı, müşteri ve satış geçmişini kapsar — YALNIZCA kâr admin/sahibe özeldir
  const motorSatis = !!user?.motor_satis_yetkisi;
  const canAlis = full || !!user?.alis_fiyati_gor || motorSatis;
  const canMusteri = full || motorSatis || !!user?.musteri_gor;
  const canListe = full || !!user?.liste_fiyati_gor;
  const canKar = isAdmin; // kâr yalnızca admin'e açık (yatırımcı yalnızca kendi payını görür)
  // Yatırımcı hiçbir operasyonel işlem yapamaz (yalnızca detay görür)
  const canEdit = (isAdmin || !!user?.motor_satis_yetkisi) && !isYatirimci;
  return { isAdmin, isYatirimci, isYatirimciVitrin, isYatirimciSahip, full, motorSatis, canAlis, canMusteri, canListe, canKar, canEdit };
};

export type MotorYetkileri = ReturnType<typeof motorYetkileri>;
