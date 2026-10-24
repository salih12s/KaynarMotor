import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import SellIcon from '@mui/icons-material/ShoppingCart';
import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';

// Motor listesi: dar ekranda kartlar, geniş ekranda tablo. Sütun ve düğmeler yetki bayraklarına (perms) göre değişir.
const MotorListesi = ({ filteredMotorlar, isMobile, perms, onDetay, onHizliSatis, onDuzenle, onSil }) => {
  const { isAdmin, isYatirimci, isYatirimciSahip, canAlis, canMusteri, canListe, canEdit } = perms;
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {filteredMotorlar.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
      {filteredMotorlar.map(m => {
        const bgColor = m.durum === 'tamamlandi' ? '#E0F2F1' : m.durum === 'perte' ? '#ffcdd2' : m.durum === 'devir_bekliyor' ? '#F3E5F5' : m.durum === 'depo_serviste' ? '#FFF3E0' : m.stok_tipi === 'konsinye' ? '#E3F2FD' : m.durum === 'kapora' ? '#FFFDE7' : '#fff';
        return (
          <Paper key={m.id} sx={{ p: 1.5, bgcolor: bgColor }} onClick={() => onDetay(m.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">{m.plaka}</Typography>
              <Typography variant="caption" color="text.secondary">{tarihYaz(m.tarih)}</Typography>
            </Box>
            <Typography variant="body2">{m.marka} {m.model} {m.yil ? `(${m.yil})` : ''}</Typography>
            <Typography variant="body2" color="text.secondary">{m.km ? Number(m.km).toLocaleString('tr-TR') + ' km' : ''}{canMusteri ? ` • ${m.satici_adi || '-'}` : ''}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
              {canAlis && <Typography variant="body2">Alım: <strong>₺{sayiYaz(m.alis_fiyati)}</strong></Typography>}
              {canAlis && <Typography variant="body2">Noter: <strong>₺{sayiYaz(m.noter_alis)}</strong></Typography>}
              {canListe && <Typography variant="body2" sx={{ color: '#1565C0' }}>İlan: <strong>₺{sayiYaz(m.liste_fiyati)}</strong></Typography>}
              {isYatirimciSahip && m.durum === 'tamamlandi' && <Typography variant="body2" sx={{ color: '#2e7d32' }}>Kârım: <strong>₺{sayiYaz(m.yatirimci_kar)}</strong></Typography>}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
              {canEdit && m.durum !== 'tamamlandi' && m.durum !== 'perte' && (
                <IconButton size="small" sx={{ color: '#2e7d32' }} onClick={() => onHizliSatis(m)}><SellIcon fontSize="small" /></IconButton>
              )}
              {canEdit && <IconButton size="small" color="info" onClick={() => onDuzenle(m)}><EditIcon fontSize="small" /></IconButton>}
              {isAdmin && <IconButton size="small" color="error" onClick={() => onSil(m.id)}><DeleteIcon fontSize="small" /></IconButton>}
            </Box>
          </Paper>
        );
      })}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1, py: 0.5, fontSize: '0.78rem' } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#C62828' }}>
            {[
              'Plaka', 'Marka', 'Model', 'Yıl', 'KM',
              ...(canListe ? ['İlan Fiyatı'] : []),
              ...(canAlis ? ['Alım'] : []),
              ...(canAlis ? ['Alış Bedeli'] : []),
              ...(canMusteri ? ['İsim Soyisim'] : []),
              'Alım Tarihi',
              ...(isYatirimciSahip ? ['Kârım'] : []),
              isYatirimci ? 'Detay' : 'İşlemler'
            ].map(h => (
              <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', px: 1, py: 0.7, fontSize: '0.78rem' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredMotorlar.map(m => {
            return (
              <TableRow key={m.id} hover sx={m.durum === 'tamamlandi' ? { bgcolor: '#E0F2F1' } : m.durum === 'perte' ? { bgcolor: '#ffcdd2' } : m.durum === 'devir_bekliyor' ? { bgcolor: '#F3E5F5' } : m.durum === 'depo_serviste' ? { bgcolor: '#FFF3E0' } : m.stok_tipi === 'konsinye' ? { bgcolor: '#E3F2FD' } : m.durum === 'kapora' ? { bgcolor: '#FFFDE7' } : {}}>
                <TableCell><strong>{m.plaka}</strong></TableCell>
                <TableCell>{m.marka || '-'}</TableCell>
                <TableCell>{m.model || '-'}</TableCell>
                <TableCell>{m.yil || '-'}</TableCell>
                <TableCell>{m.km ? Number(m.km).toLocaleString('tr-TR') : '-'}</TableCell>
                {canListe && <TableCell sx={{ color: '#1565C0', fontWeight: 'bold' }}>{sayiYaz(m.liste_fiyati)}</TableCell>}
                {canAlis && <TableCell>{sayiYaz(m.alis_fiyati)}</TableCell>}
                {canAlis && <TableCell>{sayiYaz(m.noter_alis)}</TableCell>}
                {canMusteri && (
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={`${m.satici_adi || '-'}${m.satici_tc ? ' - TC: ' + m.satici_tc : ''}`}>
                      <span>{m.satici_adi || '-'}</span>
                    </Tooltip>
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{tarihYaz(m.tarih)}</TableCell>
                {isYatirimciSahip && <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold' }}>{m.durum === 'tamamlandi' ? sayiYaz(m.yatirimci_kar) : '-'}</TableCell>}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {canEdit && m.durum !== 'tamamlandi' && m.durum !== 'perte' && (
                    <Tooltip title="Hızlı Satış"><IconButton size="small" sx={{ color: '#2e7d32', p: 0.3 }} onClick={() => onHizliSatis(m)}><SellIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                  <IconButton size="small" color="primary" sx={{ p: 0.3 }} onClick={() => onDetay(m.id)}><ViewIcon fontSize="small" /></IconButton>
                  {canEdit && <IconButton size="small" color="info" sx={{ p: 0.3 }} onClick={() => onDuzenle(m)}><EditIcon fontSize="small" /></IconButton>}
                  {isAdmin && <IconButton size="small" color="error" sx={{ p: 0.3 }} onClick={() => onSil(m.id)}><DeleteIcon fontSize="small" /></IconButton>}
                </TableCell>
              </TableRow>
            );
          })}
          {filteredMotorlar.length === 0 && <TableRow><TableCell colSpan={12} align="center">Kayıt yok</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MotorListesi;
