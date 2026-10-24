import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatTL } from '../eticaretVeri';

// Platform listesi: dar ekranda kartlar, geniş ekranda tablo; düzenle/sil yalnızca admin için.
const PlatformListesi = ({ platformlar, isMobile, isAdmin, onDuzenle, onSil }) => {
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {platformlar.length === 0 && <Alert severity="info">Platform yok</Alert>}
      {platformlar.map((p) => (
        <Paper key={p.id} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            {p.platform_adi}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              Komisyon: <strong>%{parseFloat(p.komisyon_orani || 0).toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2">
              KDV: <strong>%{parseFloat(p.kdv_orani || 20).toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2">
              Kargo: <strong>{formatTL(p.kargo_ucreti)} ₺</strong>
            </Typography>
          </Box>
          {isAdmin && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <IconButton size="small" color="info" onClick={() => onDuzenle(p)}>
                <EditIcon />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => onSil(p.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#C62828' }}>
            {['Platform Adı', 'Komisyon (%)', 'KDV (%)', 'Kargo (₺)', ...(isAdmin ? ['İşlemler'] : [])].map((h) => (
              <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {platformlar.map((p) => (
            <TableRow key={p.id} hover>
              <TableCell sx={{ fontWeight: 'bold' }}>{p.platform_adi}</TableCell>
              <TableCell>%{parseFloat(p.komisyon_orani || 0).toFixed(2)}</TableCell>
              <TableCell>%{parseFloat(p.kdv_orani || 20).toFixed(2)}</TableCell>
              <TableCell>{formatTL(p.kargo_ucreti)} ₺</TableCell>
              {isAdmin && (
                <TableCell>
                  <IconButton size="small" color="info" onClick={() => onDuzenle(p)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onSil(p.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
          {platformlar.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 5 : 4} align="center">
                Platform yok
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PlatformListesi;
