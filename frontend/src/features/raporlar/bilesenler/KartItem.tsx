import React, { type ReactNode } from 'react';
import { Paper, Typography } from '@mui/material';
import { FONT, RENK, TON } from '../../../app/tokenlar';

// Kart rengine göre zemin: yazı rengi çağıran yerden gelir, zemin burada eşlenir
const ARKA_PLAN: Record<string, string> = {
  [RENK.kirmizi]: TON.kirmizi.bg,
  [RENK.mavi]: TON.mavi.bg,
  [TON.turuncu.fg]: TON.turuncu.bg,
  [RENK.yesil]: TON.yesil.bg,
  [TON.mor.fg]: TON.mor.bg,
  '#0F7B6C': TON.yesil.bg,
  [TON.bekle.fg]: TON.turuncu.bg,
};

// Kartlara sırayla verilen renkler (kırmızı, mavi, turuncu, yeşil, mor)
export const KART_RENKLERI = [RENK.kirmizi, RENK.mavi, TON.turuncu.fg, RENK.yesil, TON.mor.fg, TON.bekle.fg];

/** Üst kart satırındaki bir kart (renk verilmezse sırayla KART_RENKLERI). */
export interface KartVerisi {
  label: string;
  value: ReactNode;
  color?: string;
}

// Kart listesini KartVerisi[] olarak tiplemek için (satır içi dizi sabitlerinde `color` her öğede yok)
export const kartlar = (liste: KartVerisi[]): KartVerisi[] => liste;

// Özet kartı: solda küçük etiket (cümle düzeninde yazılır: yalnız ilk harf büyük), altında büyük rakam
interface KartItemProps {
  label: string;
  value: ReactNode;
  color?: string;
  prefix?: string;
}

const KartItem = ({ label, value, color = RENK.kirmizi, prefix = '' }: KartItemProps) => (
  <Paper sx={{ px: 2.25, py: 1.5, bgcolor: ARKA_PLAN[color] || TON.kirmizi.bg }}>
    <Typography sx={{ fontSize: 14, color: RENK.soluk, textTransform: 'lowercase', '&::first-letter': { textTransform: 'uppercase' } }}>{label}</Typography>
    <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 30, lineHeight: 1.25, color, whiteSpace: 'nowrap' }}>
      {prefix}
      {value}
    </Typography>
  </Paper>
);

export default KartItem;
