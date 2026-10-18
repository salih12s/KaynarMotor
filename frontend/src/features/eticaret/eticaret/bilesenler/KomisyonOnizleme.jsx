import React from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import { karEtiketi, formatTL } from '../eticaretVeri';

// Satış formu: platforma göre canlı komisyon, KDV ve (yalnızca admin) net kâr önizlemesi; satış fiyatı girilince görünür.
const KomisyonOnizleme = ({ sf, canliPlatformTipi, canliHesap, isAdmin }) => {
  if (!(Number(sf.satis_fiyati) > 0)) return null;
  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>
        Komisyon Hesaplama {canliPlatformTipi === 'hepsiburada' ? '(HepsiBurada)' : canliPlatformTipi === 'n11' ? '(N11)' : '(Trendyol)'}
      </Typography>

      {/* Ana sonuçlar - Platform bazlı */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        {(() => {
          let cards = [];
          if (canliPlatformTipi === 'hepsiburada') {
            cards = [
              { label: 'Komisyon', value: `${formatTL(canliHesap.komisyonTutari)} ₺`, color: '#e65100', bg: '#fff3e0' },
              { label: 'Yat. Geri Dönüş Oranı', value: `%${canliHesap.yatirimGeriDonus}`, color: '#1565c0', bg: '#e3f2fd' },
              { label: 'Ödeme Bedeli', value: `${formatTL(canliHesap.odemeBedeli)} ₺`, color: '#555', bg: '#f5f5f5' },
              { label: 'İşlem Bedeli', value: `${formatTL(canliHesap.islemBedeli)} ₺`, color: '#555', bg: '#f5f5f5' },
              { label: 'Stopaj Bedeli', value: `${formatTL(canliHesap.stopaj)} ₺`, color: '#555', bg: '#f5f5f5' },
              { label: 'Kâr Oranı', value: `%${canliHesap.karOrani}`, color: '#2e7d32', bg: '#e8f5e9' },
              { label: 'KDV', value: `${formatTL(canliHesap.odenecekKDV)} ₺`, color: '#f57f17', bg: '#fff8e1' },
            ];
          } else if (canliPlatformTipi === 'n11') {
            cards = [
              { label: 'Komisyon', value: `${formatTL(canliHesap.komisyonTutari)} ₺`, color: '#e65100', bg: '#fff3e0' },
              { label: 'Yat. Geri Dönüş Oranı', value: `%${canliHesap.yatirimGeriDonus}`, color: '#1565c0', bg: '#e3f2fd' },
              { label: 'S. Pazarlama ve Hizmet', value: `${formatTL(canliHesap.pazarlamaHizmet)} ₺`, color: '#555', bg: '#f5f5f5' },
              { label: 'Stopaj Bedeli', value: `${formatTL(canliHesap.stopaj)} ₺`, color: '#555', bg: '#f5f5f5' },
              { label: 'Kâr Oranı', value: `%${canliHesap.karOrani}`, color: '#2e7d32', bg: '#e8f5e9' },
              { label: 'KDV', value: `${formatTL(canliHesap.odenecekKDV)} ₺`, color: '#f57f17', bg: '#fff8e1' },
            ];
          } else {
            cards = [
              { label: 'Komisyon (Toplam)', value: `${formatTL(canliHesap.toplamKomisyon)} ₺`, color: '#e65100', bg: '#fff3e0', sub: `Komisyon: ${formatTL(canliHesap.komisyonTutari)}₺ + Hizmet: ${formatTL(canliHesap.hizmetBedeli)}₺ + Stopaj: ${formatTL(canliHesap.stopaj)}₺` },
              { label: 'Yat. Geri Dönüş Oranı', value: `%${canliHesap.yatirimGeriDonus}`, color: '#1565c0', bg: '#e3f2fd' },
              { label: 'Kâr Oranı', value: `%${canliHesap.karOrani}`, color: '#2e7d32', bg: '#e8f5e9' },
              { label: 'KDV', value: `${formatTL(canliHesap.odenecekKDV)} ₺`, color: '#f57f17', bg: '#fff8e1' },
            ];
          }
          return cards.filter(c => isAdmin || !karEtiketi(c.label)).map((c, i) => (
            <Paper key={i} sx={{ p: 1.5, flex: 1, minWidth: 100, textAlign: 'center', bgcolor: c.bg, borderTop: `3px solid ${c.color}` }}>
              <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              <Typography fontWeight="bold" color={c.color}>{c.value}</Typography>
              {c.sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>{c.sub}</Typography>}
            </Paper>
          ));
        })()}
      </Box>

      {/* KDV detayları - Platform bazlı */}
      <Paper sx={{ p: 1.5, bgcolor: '#fafafa', mb: 2 }}>
        <Typography variant="caption" fontWeight="bold" color="text.secondary" gutterBottom>KDV Detayları</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
          {(() => {
            let kdvItems = [
              { label: 'Satıştan Oluşan KDV', value: canliHesap.satistanKDV },
              { label: 'Alıştan Oluşan KDV', value: canliHesap.alisKDV },
              { label: 'Kargodan Oluşan KDV', value: canliHesap.kargoKDV },
              { label: 'Komisyondan Oluşan KDV', value: canliHesap.komisyonKDV },
            ];
            if (canliPlatformTipi === 'hepsiburada') {
              kdvItems.push({ label: 'Ödeme ve İşlem Bedeli KDV', value: canliHesap.odemIslemKDV });
            } else if (canliPlatformTipi === 'n11') {
              kdvItems.push({ label: 'Pazarlama ve Hizmet KDV', value: canliHesap.pazarlamaHizmetKDV });
            } else {
              kdvItems.push({ label: 'Hizmet Bedeli KDV', value: canliHesap.hizmetKDV });
            }
            kdvItems.push({ label: 'Ödenecek KDV', value: canliHesap.odenecekKDV });
            return kdvItems.map((item, i) => (
              <Box key={i} sx={{ textAlign: 'center', minWidth: 130, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.label}</Typography>
                <Typography variant="body2" fontWeight="bold">{formatTL(item.value)} ₺</Typography>
              </Box>
            ));
          })()}
        </Box>
      </Paper>

      {/* Net Kâr büyük gösterim (yalnızca admin) */}
      {isAdmin && (
      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: canliHesap.netKar >= 0 ? '#e8f5e9' : '#ffebee', borderRadius: 2, border: `2px solid ${canliHesap.netKar >= 0 ? '#2e7d32' : '#c62828'}` }}>
        <Typography variant="body2" color="text.secondary">Net Kâr ({canliHesap.miktar} adet)</Typography>
        <Typography variant="h4" fontWeight="bold" sx={{ color: canliHesap.netKar >= 0 ? '#2e7d32' : '#c62828' }}>
          {formatTL(canliHesap.netKar)} ₺
        </Typography>
      </Paper>
      )}
    </Box>
  );
};

export default KomisyonOnizleme;
