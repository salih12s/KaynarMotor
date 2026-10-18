import React, { useState } from 'react';
import { Box, Button, Typography, Stack, Dialog, DialogContent, IconButton, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalculateIcon from '@mui/icons-material/Calculate';
import { VitrinAcikTema } from '../../../VitrinOrtak';
import { hesaplaTaksit, TaksitTablo, ParaInput, paraToNumber, fmtTL } from '../../../../taksit/TaksitHesaplama';
import { RED } from '../kategoriSabitleri';

// Ana sayfa header'ından açılan, giriş gerektirmeyen taksit hesaplama penceresi.
// Müşteri nakit fiyat (ve isteğe bağlı peşinat) girip 3/6/9/12 ay taksit tablosunu görür.
const TaksitHesaplaDialogIc = ({ open, onClose, isMobile }) => {
  const [nakit, setNakit] = useState('');
  const [pesinat, setPesinat] = useState('');
  const nakitNum = paraToNumber(nakit);
  const pesinatNum = paraToNumber(pesinat);
  const kalan = nakitNum - pesinatNum;
  const sonuc = hesaplaTaksit(nakitNum, pesinatNum);

  const temizle = () => { setNakit(''); setPesinat(''); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
      <Box sx={{ bgcolor: '#1a1a1a', color: '#fff', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalculateIcon />
          <Typography variant="h6" fontWeight="bold">Taksit Hesaplama</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
      </Box>
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Nakit fiyatı girin, 3 / 6 / 9 / 12 ay taksitli ödeme seçeneklerini anında görün.
        </Typography>
        <Stack spacing={1.5}>
          <ParaInput label="Nakit Fiyat" value={nakit} onChange={setNakit} autoFocus />
          <ParaInput label="Peşinat / Peşin Ödeme" value={pesinat} onChange={setPesinat}
            helperText={pesinatNum > 0 ? `Kalan tutar: ${fmtTL(Math.max(kalan, 0))}` : 'İsteğe bağlı — boş bırakılırsa nakit fiyat üzerinden hesaplanır'} />
        </Stack>

        {nakitNum > 0 && !sonuc && (
          <Typography variant="body2" sx={{ mt: 2, color: RED }}>
            Peşinat tutarı nakit fiyata eşit veya daha büyük. Taksitlendirilecek tutar kalmadı.
          </Typography>
        )}

        {sonuc && (
          <Box sx={{ mt: 2 }}>
            {pesinatNum > 0 && (
              <Paper sx={{ p: 1.5, mb: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="text.secondary">
                  Nakit <span style={{ textDecoration: 'line-through' }}>{fmtTL(nakitNum)}</span> − Peşinat {fmtTL(pesinatNum)}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: RED }}>{fmtTL(Math.max(kalan, 0))}</Typography>
                <Typography variant="caption" color="text.secondary">Taksitler bu tutar üzerinden hesaplanır</Typography>
              </Paper>
            )}
            <TaksitTablo sonuc={sonuc} isMobile={isMobile} />
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={temizle} sx={{ color: '#666' }}>Temizle</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// Pencere açık zeminli hazır bir ekran olduğu için sayfanın koyu temasından ayrı, açık temayla gösterilir
const TaksitHesaplaDialog = (props) => <VitrinAcikTema><TaksitHesaplaDialogIc {...props} /></VitrinAcikTema>;

export default TaksitHesaplaDialog;
