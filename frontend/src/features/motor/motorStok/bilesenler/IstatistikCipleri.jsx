import React from 'react';
import { sayiDegeri } from '../../../../shared/utils/bicim';
import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { TON } from '../../../../app/tokenlar';

// Üst durum çipleri (süzgeç olarak çalışır), ikincil fatura/devir/ödeme sayaçları ve "Motor Ekle" düğmesi.
const IstatistikCipleri = ({ motorlar, isYatirimci, canEdit, activeFilter, setActiveFilter, secondaryFilter, setSecondaryFilter, onYeni }) => {
  const stoktaSahip = motorlar.filter((m) => m.durum === 'stokta' && m.stok_tipi !== 'konsinye');
  const stoktaKonsinye = motorlar.filter((m) => m.durum === 'stokta' && m.stok_tipi === 'konsinye');
  const kaporalar = motorlar.filter((m) => m.durum === 'kapora');
  const depoServiste = motorlar.filter((m) => m.durum === 'depo_serviste');
  const devirBekleyen = motorlar.filter((m) => m.durum === 'devir_bekliyor');
  const tamamlananlar = motorlar.filter((m) => m.durum === 'tamamlandi');
  const perteler = motorlar.filter((m) => m.durum === 'perte');

  const statChips = [
    { label: `Toplam: ${isYatirimci ? motorlar.length - tamamlananlar.length : motorlar.length}`, ton: 'gri', filter: null },
    { label: `Stokta: ${stoktaSahip.length}`, ton: 'yesil', filter: 'stokta' },
    { label: `Konsinye: ${stoktaKonsinye.length}`, ton: 'bekle', filter: 'konsinye' },
    { label: `Kapora: ${kaporalar.length}`, ton: 'mavi', filter: 'kapora' },
    { label: `Depo/Serviste: ${depoServiste.length}`, ton: 'turuncu', filter: 'depo_serviste' },
    { label: `Devir Bekliyor: ${devirBekleyen.length}`, ton: 'mor', filter: 'devir_bekliyor' },
    { label: `Perte: ${perteler.length}`, ton: 'kirmizi', filter: 'perte' },
    // Satılan kutusu herkese gösterilir; yatırımcı tıklayınca satılanları (kârıyla) görür
    { label: `Satılan: ${tamamlananlar.length}`, ton: 'gri', filter: 'tamamlandi' },
  ];

  const ikincilTon = (iyi) => (iyi ? 'yesil' : 'kirmizi');
  const secondaryChips = [
    { label: `Fatura ✓ ${motorlar.filter((m) => m.fatura_kesildi).length}`, filter: 'fatura_kesildi', ton: ikincilTon(true) },
    { label: `Fatura ✗ ${motorlar.filter((m) => !m.fatura_kesildi).length}`, filter: 'fatura_kesilmedi', ton: ikincilTon(false) },
    { label: `Devir ✓ ${tamamlananlar.length}`, filter: 'devir_verildi', ton: ikincilTon(true) },
    { label: `Devir ✗ ${devirBekleyen.length}`, filter: 'devir_verilmedi', ton: ikincilTon(false) },
    { label: `Ödeme ✓ ${motorlar.filter((m) => !(sayiDegeri(m.kalan_odeme) > 0)).length}`, filter: 'odeme_tamam', ton: ikincilTon(true) },
    { label: `Ödeme ✗ ${motorlar.filter((m) => sayiDegeri(m.kalan_odeme) > 0).length}`, filter: 'odeme_bekliyor', ton: ikincilTon(false) },
  ];
  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {statChips.map((c) => {
          const { fg, bg } = TON[c.ton];
          const secili = activeFilter === c.filter;
          return (
            <Box
              key={c.label}
              component="button"
              type="button"
              onClick={() => setActiveFilter(secili ? null : c.filter)}
              aria-pressed={secili}
              sx={{
                height: 32,
                px: 1.5,
                border: `1.5px solid ${fg}`,
                borderRadius: '4px',
                bgcolor: secili ? fg : bg,
                color: secili ? '#fff' : fg,
                font: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                '&:hover': { filter: 'brightness(0.96)' },
              }}
            >
              {c.label}
            </Box>
          );
        })}
        <Box sx={{ flexGrow: 1 }} />
        {canEdit && (
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni}>
            Motor Ekle
          </Button>
        )}
      </Box>

      {/* Operasyonel sayaçlar (fatura/devir/ödeme) yatırımcıya gösterilmez */}
      {!isYatirimci && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mb: 2 }}>
          {secondaryChips.map((c) => {
            const { fg } = TON[c.ton];
            const secili = secondaryFilter === c.filter;
            return (
              <Box
                key={c.label}
                component="button"
                type="button"
                onClick={() => setSecondaryFilter(secili ? null : c.filter)}
                aria-pressed={secili}
                sx={{
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  color: fg,
                  font: 'inherit',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderBottom: secili ? `2px solid ${fg}` : '2px solid transparent',
                  '&:hover': { borderBottomColor: fg },
                }}
              >
                {c.label}
              </Box>
            );
          })}
        </Box>
      )}
    </>
  );
};

export default IstatistikCipleri;
