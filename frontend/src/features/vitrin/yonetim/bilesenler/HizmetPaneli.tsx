import React from 'react';
import type { VitrinIletisim } from '../../../../shared/tipler';
import type { KategoriBilgisi } from '../../vitrinSabitleri';
import { Box, Button, Typography, Paper } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import { vitrinService } from '../../vitrinApi';

// Hizmet kategorilerinde (bakım, nakliye, sigorta) ilan yerine gösterilen ayar paneli.
interface HizmetPaneliProps {
  curIletisim: VitrinIletisim | undefined;
  kategori: string;
  aktifKategori: KategoriBilgisi;
  onDuzenle: () => void;
}

const HizmetPaneli = ({ curIletisim, kategori, aktifKategori, onDuzenle }: HizmetPaneliProps) => {
  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ bgcolor: '#F3F3EE' }}>
        {curIletisim?.gorsel_var ? (
          <Box
            component="img"
            src={`${vitrinService.iletisimGorselUrl(kategori)}?t=${curIletisim.updated_at || ''}`}
            alt={aktifKategori.label}
            sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">Henüz görsel eklenmedi</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          {curIletisim?.baslik || aktifKategori.label}
        </Typography>
        {curIletisim?.aciklama && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {curIletisim.aciklama}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <PhoneIcon color="error" fontSize="small" />
          <Typography variant="body1" fontWeight="500">
            {curIletisim?.personel_adi || '—'}
            {curIletisim?.telefon ? ` • ${curIletisim.telefon}` : ''}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Bu sayfada ilan yoktur. Müşteriye yukarıdaki görsel, telefon ve WhatsApp butonu gösterilir.
        </Typography>
        <Button variant="contained" startIcon={<PhoneIcon />} onClick={onDuzenle} sx={{ mt: 1.5 }}>
          Hizmet Sayfasını Düzenle
        </Button>
      </Box>
    </Paper>
  );
};

export default HizmetPaneli;
