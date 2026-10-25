import React from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, TextField, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import { DialogBasligi } from '../ui';

interface Props {
  acik: boolean;
  kapat: () => void;
  metin: string;
  setMetin: (metin: string) => void;
  hata: string;
  aktar: () => void;
  isMobile: boolean;
  /** Yer tutucu örnek satır; sütun sırası açıklamayla aynı olmalı (kod, ad, alış, satış, miktar), Tab ile ayrılmış. */
  ornekSatir: string;
  /** Tab ile ayrılan sütunların açıklaması, örn. "Stok Kodu, Stok Adı, Alış Fiyatı, Satış Fiyatı, Miktar". */
  sutunlar: string;
}

// Aksesuar ve yedek parça stoğunun ortak "Toplu Stok İçe Aktar" penceresi
const StokIceAktarPenceresi = ({ acik, kapat, metin, setMetin, hata, aktar, isMobile, ornekSatir, sutunlar }: Props) => (
  <Dialog open={acik} onClose={kapat} maxWidth="md" fullWidth fullScreen={isMobile}>
    <DialogBasligi ikon={<UploadIcon />} baslik={'Toplu Stok İçe Aktar'} />
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Her satıra bir ürün girin (Tab ile ayırın): {sutunlar}
      </Typography>
      {hata && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {hata}
        </Alert>
      )}
      <TextField fullWidth multiline rows={10} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder={ornekSatir} />
    </DialogContent>
    <DialogActions>
      <Button onClick={kapat}>İptal</Button>
      <Button variant="contained" onClick={aktar}>
        İçe Aktar
      </Button>
    </DialogActions>
  </Dialog>
);

export default StokIceAktarPenceresi;
