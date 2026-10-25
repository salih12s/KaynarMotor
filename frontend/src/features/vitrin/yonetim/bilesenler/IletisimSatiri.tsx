import React from 'react';
import type { VitrinIletisim } from '../../../../shared/tipler';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PhoneIcon from '@mui/icons-material/Phone';

// Kategori iletişim kartı ve "İlan Ekle" düğmesi.
interface IletisimSatiriProps {
  curIletisim: VitrinIletisim | undefined;
  onIletisim: () => void;
  onYeni: () => void;
}

const IletisimSatiri = ({ curIletisim, onIletisim, onYeni }: IletisimSatiriProps) => {
  return (
    <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          Bu kategori için iletişim
        </Typography>
        {curIletisim && (curIletisim.personel_adi || curIletisim.telefon) ? (
          <Typography variant="body1" fontWeight="500">
            {curIletisim.personel_adi || '—'} {curIletisim.telefon ? `• ${curIletisim.telefon}` : ''}
            {(curIletisim.personel_adi_2 || curIletisim.telefon_2) && (
              <>
                <br />
                {curIletisim.personel_adi_2 || '—'} {curIletisim.telefon_2 ? `• ${curIletisim.telefon_2}` : ''}
              </>
            )}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Henüz tanımlanmadı
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button variant="outlined" startIcon={<PhoneIcon />} onClick={onIletisim}>
          Personel / Telefon
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onYeni}>
          İlan Ekle
        </Button>
      </Stack>
    </Paper>
  );
};

export default IletisimSatiri;
