import React from 'react';
import { Box, Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Üst durum çipleri (süzgeç olarak çalışır), ikincil fatura/devir/ödeme çipleri ve "Motor Ekle" düğmesi.
const IstatistikCipleri = ({ motorlar, isYatirimci, canEdit, activeFilter, setActiveFilter, secondaryFilter, setSecondaryFilter, onYeni }) => {
  const stoktaSahip = motorlar.filter((m) => m.durum === 'stokta' && m.stok_tipi !== 'konsinye');
  const stoktaKonsinye = motorlar.filter((m) => m.durum === 'stokta' && m.stok_tipi === 'konsinye');
  const kaporalar = motorlar.filter((m) => m.durum === 'kapora');
  const depoServiste = motorlar.filter((m) => m.durum === 'depo_serviste');
  const devirBekleyen = motorlar.filter((m) => m.durum === 'devir_bekliyor');
  const tamamlananlar = motorlar.filter((m) => m.durum === 'tamamlandi');
  const perteler = motorlar.filter((m) => m.durum === 'perte');

  const statChips = [
    { label: `Toplam: ${isYatirimci ? motorlar.length - tamamlananlar.length : motorlar.length}`, color: '#C62828', bg: '#ffebee', filter: null },
    { label: `Stokta: ${stoktaSahip.length}`, color: '#2e7d32', bg: '#e8f5e9', filter: 'stokta' },
    { label: `Konsinye: ${stoktaKonsinye.length}`, color: '#1565C0', bg: '#e3f2fd', filter: 'konsinye' },
    { label: `Kapora: ${kaporalar.length}`, color: '#F9A825', bg: '#FFFDE7', filter: 'kapora' },
    { label: `Depo/Serviste: ${depoServiste.length}`, color: '#EF6C00', bg: '#FFF3E0', filter: 'depo_serviste' },
    { label: `Devir Bekliyor: ${devirBekleyen.length}`, color: '#7B1FA2', bg: '#F3E5F5', filter: 'devir_bekliyor' },
    { label: `Perte: ${perteler.length}`, color: '#d32f2f', bg: '#ffcdd2', filter: 'perte' },
    // Satılan kutusu herkese gösterilir; yatırımcı tıklayınca satılanları (kârıyla) görür
    { label: `Satılan: ${tamamlananlar.length}`, color: '#00695C', bg: '#E0F2F1', filter: 'tamamlandi' },
  ];

  const secondaryChips = [
    { label: `Fatura ✓ ${motorlar.filter((m) => m.fatura_kesildi).length}`, filter: 'fatura_kesildi', color: '#2e7d32', bg: '#e8f5e9' },
    { label: `Fatura ✗ ${motorlar.filter((m) => !m.fatura_kesildi).length}`, filter: 'fatura_kesilmedi', color: '#d32f2f', bg: '#ffebee' },
    { label: `Devir ✓ ${tamamlananlar.length}`, filter: 'devir_verildi', color: '#2e7d32', bg: '#e8f5e9' },
    { label: `Devir ✗ ${devirBekleyen.length}`, filter: 'devir_verilmedi', color: '#d32f2f', bg: '#ffebee' },
    { label: `Ödeme ✓ ${motorlar.filter((m) => !(parseFloat(m.kalan_odeme || 0) > 0)).length}`, filter: 'odeme_tamam', color: '#2e7d32', bg: '#e8f5e9' },
    { label: `Ödeme ✗ ${motorlar.filter((m) => parseFloat(m.kalan_odeme || 0) > 0).length}`, filter: 'odeme_bekliyor', color: '#d32f2f', bg: '#ffebee' },
  ];
  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {statChips.map((c, i) => (
          <Chip
            key={i}
            label={c.label}
            onClick={() => setActiveFilter(activeFilter === c.filter ? null : c.filter)}
            sx={{
              bgcolor: activeFilter === c.filter ? c.color : c.bg,
              color: activeFilter === c.filter ? 'white' : c.color,
              fontWeight: 'bold',
              fontSize: '0.8rem',
              borderLeft: `4px solid ${c.color}`,
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }}
          />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        {canEdit && (
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>
            Motor Ekle
          </Button>
        )}
      </Box>

      {/* Operasyonel sayaçlar (fatura/devir/ödeme) yatırımcıya gösterilmez */}
      {!isYatirimci && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {secondaryChips.map((c, i) => (
            <Chip
              key={i}
              label={c.label}
              size="small"
              onClick={() => setSecondaryFilter(secondaryFilter === c.filter ? null : c.filter)}
              sx={{
                bgcolor: secondaryFilter === c.filter ? c.color : c.bg,
                color: secondaryFilter === c.filter ? 'white' : c.color,
                fontWeight: 'bold',
                fontSize: '0.75rem',
                cursor: 'pointer',
                '&:hover': { opacity: 0.85 },
              }}
            />
          ))}
        </Box>
      )}
    </>
  );
};

export default IstatistikCipleri;
