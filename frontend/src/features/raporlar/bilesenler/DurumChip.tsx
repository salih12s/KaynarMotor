import React from 'react';
import { Damga } from '../../../shared/ui';
import type { TonAdi } from '../../../app/tokenlar';

const DURUMLAR: Record<string, { label: string; ton: TonAdi }> = {
  stokta: { label: 'Stokta', ton: 'gri' },
  beklemede: { label: 'Beklemede', ton: 'bekle' },
  kapora: { label: 'Kapora', ton: 'bekle' },
  devam_ediyor: { label: 'İşlemde', ton: 'mavi' },
  odeme_bekliyor: { label: 'Ödeme Bekl.', ton: 'mor' },
  devir_bekliyor: { label: 'Devir Bekliyor', ton: 'mor' },
  tamamlandi: { label: 'Tamamlandı', ton: 'yesil' },
  iptal: { label: 'İptal', ton: 'kirmizi' },
  perte: { label: 'Perte', ton: 'kirmizi' },
};

// İş emri / aksesuar satışı durumunu çerçeveli damga olarak gösterir
const DurumChip = ({ durum }: { durum: string | null | undefined }) => {
  const d = (durum && DURUMLAR[durum]) || { label: durum || '-', ton: 'gri' };
  return <Damga ton={d.ton}>{d.label}</Damga>;
};

export default DurumChip;
