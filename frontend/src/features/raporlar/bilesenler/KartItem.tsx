import React, { type ReactNode } from 'react';
import { Paper, Typography } from '@mui/material';
import { FONT, RENK } from '../../../app/tokenlar';

// Kart rengine göre zemin: yazı rengi çağıran yerden gelir, zemin burada eşlenir
const ARKA_PLAN: Record<string, string> = {
  '#C62828': '#F6DAD7',
  '#1E4A86': '#DCE6F4',
  '#A5530F': '#F8E1CC',
  '#1D6A3B': '#D8EBDD',
  '#5B3A8C': '#E7DFF3',
  '#0F7B6C': '#D8EBDD',
  '#8A5300': '#F8E1CC',
};

// Kartlara sırayla verilen renkler (kırmızı, mavi, turuncu, yeşil, mor)
export const KART_RENKLERI = ['#C62828', '#1E4A86', '#A5530F', '#1D6A3B', '#5B3A8C', '#8A5300'];

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

const KartItem = ({ label, value, color = '#C62828', prefix = '' }: KartItemProps) => (
  <Paper sx={{ px: 2.25, py: 1.5, bgcolor: ARKA_PLAN[color] || '#F6DAD7' }}>
    <Typography sx={{ fontSize: 14, color: RENK.soluk, textTransform: 'lowercase', '&::first-letter': { textTransform: 'uppercase' } }}>{label}</Typography>
    <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 30, lineHeight: 1.25, color, whiteSpace: 'nowrap' }}>
      {prefix}
      {value}
    </Typography>
  </Paper>
);

export default KartItem;
