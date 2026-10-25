import React from 'react';
import type { VitrinIletisim } from '../../../../shared/tipler';
import type { KategoriBilgisi } from '../../vitrinSabitleri';
import type { IletisimFormuDurumu } from '../useIletisimFormu';
import TelefonIkon from '@mui/icons-material/PhoneOutlined';
import { DialogBasligi } from '../../../../shared/ui';
import { Box, Button, Typography, Dialog, DialogContent, DialogActions, TextField, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoIcon from '@mui/icons-material/PhotoCamera';
import { vitrinService } from '../../vitrinApi';

// Kategori iletişim penceresi; hizmet sayfalarında başlık ve görsel de düzenlenir.
interface IletisimDialogProps {
  ilet: IletisimFormuDurumu;
  aktifKategori: KategoriBilgisi;
  isHizmet: boolean;
  kategori: string;
  iletisim: Record<string, VitrinIletisim>;
}

const IletisimDialog = ({ ilet, aktifKategori, isHizmet, kategori, iletisim }: IletisimDialogProps) => {
  const { iletDlg, kapat, iletForm, setIletForm, iletGorsel, iletGorselVar, iletGorselSil, removeIletGorsel, handleIletGorsel, handleSaveIletisim } = ilet;
  return (
    <Dialog open={iletDlg} onClose={kapat} maxWidth="xs" fullWidth>
      <DialogBasligi ikon={<TelefonIkon />} baslik={`${aktifKategori.label}: ${isHizmet ? 'Hizmet Sayfası' : 'İletişim'}`} onKapat={kapat} />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {isHizmet && (
            <>
              <TextField
                label="Başlık"
                value={iletForm.baslik}
                onChange={(e) => setIletForm({ ...iletForm, baslik: e.target.value })}
                fullWidth
                placeholder={aktifKategori.label}
              />
              {/* Hizmet görseli */}
              <Box sx={{ border: '1px solid #D2D3CA', borderRadius: 2, p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sayfa Görseli
                </Typography>
                {iletGorsel || (iletGorselVar && !iletGorselSil) ? (
                  <Box>
                    <Box
                      component="img"
                      src={iletGorsel || `${vitrinService.iletisimGorselUrl(kategori)}?t=${iletisim[kategori]?.updated_at || ''}`}
                      alt="görsel"
                      sx={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 1, display: 'block', mb: 1 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={removeIletGorsel}>
                        Kaldır
                      </Button>
                      <Button size="small" variant="outlined" component="label" startIcon={<PhotoIcon />}>
                        Değiştir
                        <input type="file" hidden accept="image/*" onChange={handleIletGorsel} />
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Button variant="outlined" component="label" startIcon={<PhotoIcon />}>
                    Görsel Yükle
                    <input type="file" hidden accept="image/*" onChange={handleIletGorsel} />
                  </Button>
                )}
              </Box>
            </>
          )}
          <TextField
            label="Personel Adı"
            value={iletForm.personel_adi}
            onChange={(e) => setIletForm({ ...iletForm, personel_adi: e.target.value })}
            fullWidth
          />
          <TextField
            label="Telefon"
            value={iletForm.telefon}
            onChange={(e) => setIletForm({ ...iletForm, telefon: e.target.value })}
            fullWidth
            placeholder="05XX XXX XX XX"
            helperText={isHizmet ? 'WhatsApp butonu bu numarayı kullanır' : ''}
          />
          {/* İkinci personel isteğe bağlıdır; doldurulursa sitede birinci kişinin yanında gösterilir */}
          <TextField
            label="2. Personel Adı (opsiyonel)"
            value={iletForm.personel_adi_2}
            onChange={(e) => setIletForm({ ...iletForm, personel_adi_2: e.target.value })}
            fullWidth
          />
          <TextField
            label="2. Personel Telefon (opsiyonel)"
            value={iletForm.telefon_2}
            onChange={(e) => setIletForm({ ...iletForm, telefon_2: e.target.value })}
            fullWidth
            placeholder="05XX XXX XX XX"
          />
          <TextField
            label={isHizmet ? 'Açıklama (opsiyonel)' : 'Not (opsiyonel)'}
            value={iletForm.aciklama}
            onChange={(e) => setIletForm({ ...iletForm, aciklama: e.target.value })}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat}>İptal</Button>
        <Button variant="contained" onClick={handleSaveIletisim}>
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IletisimDialog;
