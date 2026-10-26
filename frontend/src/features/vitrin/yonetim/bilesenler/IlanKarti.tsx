import React from 'react';
import type { VitrinIlan } from '../../../../shared/tipler';
import type { IlanListesiDurumu } from '../useIlanListesi';
import { IslemDugmesi } from '../../../../shared/ui';
import MotorIcon from '@mui/icons-material/TwoWheelerOutlined';
import { Box, Button, Typography, Grid, Card, CardMedia, CardContent, CardActions, TextField, IconButton, Chip, CircularProgress } from '@mui/material';

import DragIcon from '@mui/icons-material/DragIndicator';
import UpIcon from '@mui/icons-material/KeyboardArrowUp';
import DownIcon from '@mui/icons-material/KeyboardArrowDown';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArchiveIcon from '@mui/icons-material/Archive';
import { vitrinService } from '../../vitrinApi';
import { sayiYaz } from '../../../../shared/utils/bicim';
import { RENK } from '../../../../app/tokenlar';

// Tek bir ilan kartı: sıra kutusu / sürükleme tutacağı, görsel, rozetler, fiyat, yayın düğmesi ve işlemler.
interface IlanKartiProps {
  u: VitrinIlan;
  /** Yayındaki listedeki konum (0 tabanlı); arşivdeki ilanlarda yoktur. */
  index: number | undefined;
  liste: IlanListesiDurumu;
  isAdmin: boolean;
  isMotor: boolean;
  onDuzenle: (ilan: VitrinIlan) => void;
}

const IlanKarti = ({ u, index, liste, isAdmin, isMotor, onDuzenle }: IlanKartiProps) => {
  const {
    arsivGorunumu,
    aktifler,
    siraTaslaklari,
    setSiraTaslaklari,
    orderSaving,
    siraSavingId,
    siraDegistirilebilir,
    draggedUrunId,
    setDraggedUrunId,
    yayinSavingId,
    handleDogrudanSira,
    handleYayinToggle,
    handleDelete,
    moveUrun,
    handleUrunDrop,
  } = liste;
  return (
    <Grid
      size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
      sx={{ display: 'flex', minWidth: 0 }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleUrunDrop(u.id)}
    >
      <Card
        sx={{ width: '100%', height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: u.yayinda ? 'background.paper' : 'action.hover' }}
      >
        {arsivGorunumu ? (
          <Box sx={{ px: 1.2, py: 0.7, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover' }}>
            <ArchiveIcon fontSize="small" color="action" />
            <Typography variant="caption" fontWeight="bold">
              Arşivde
            </Typography>
          </Box>
        ) : isAdmin ? (
          <Box sx={{ px: 1, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: 'action.hover' }}>
            <Typography variant="caption" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
              Sıra
            </Typography>
            <TextField
              size="small"
              type="number"
              value={siraTaslaklari[u.id] ?? String((index ?? 0) + 1)}
              onChange={(e) => setSiraTaslaklari((prev) => ({ ...prev, [u.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleDogrudanSira(u);
                }
              }}
              inputProps={{ min: 1, max: aktifler.length, step: 1, 'aria-label': `${u.baslik} sıra numarası` }}
              disabled={orderSaving}
              sx={{ width: 72, '& .MuiInputBase-input': { py: 0.75, textAlign: 'center', fontWeight: 700 } }}
            />
            <Button size="small" variant="contained" onClick={() => handleDogrudanSira(u)} disabled={orderSaving} sx={{ minWidth: 78, ml: 'auto' }}>
              {siraSavingId === u.id ? <CircularProgress size={16} color="inherit" /> : 'Değiştir'}
            </Button>
          </Box>
        ) : (
          <Box
            draggable={!orderSaving && siraDegistirilebilir}
            onDragStart={(e) => {
              setDraggedUrunId(u.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setDraggedUrunId(null)}
            sx={{
              px: 1.2,
              py: 0.7,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: draggedUrunId === u.id ? 'action.selected' : 'action.hover',
              cursor: orderSaving ? 'wait' : siraDegistirilebilir ? 'grab' : 'default',
              userSelect: 'none',
            }}
          >
            <DragIcon fontSize="small" color="action" />
            <Typography variant="caption" fontWeight="bold">
              {(index ?? 0) + 1}. sıra
            </Typography>
          </Box>
        )}
        <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', bgcolor: RENK.yuzeyKoyu, flexShrink: 0 }}>
          {u.kapak_gorsel_id ? (
            <CardMedia
              component="img"
              image={vitrinService.gorselUrl(u.kapak_gorsel_id)}
              alt={u.baslik}
              loading="lazy"
              decoding="async"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                color: 'text.secondary',
              }}
            >
              <MotorIcon fontSize="large" />
              <Typography variant="body2">Fotoğraf yok</Typography>
            </Box>
          )}
        </Box>
        <CardContent sx={{ flex: 1, pb: 1, display: 'flex', flexDirection: 'column' }}>
          {u.ilan_no != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              İlan No: ILN-{String(u.ilan_no).padStart(4, '0')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignContent: 'flex-start', gap: 0.5, mb: 0.5, mt: 0.3, minHeight: 52, flexWrap: 'wrap' }}>
            {!u.yayinda && !arsivGorunumu && <Chip size="small" label="Yayında değil" color="default" />}
            {isMotor &&
              (u.motor_durumu === 'sifir' ? <Chip size="small" label="Sıfır" color="primary" /> : <Chip size="small" label="İkinci El" variant="outlined" />)}
            {u.one_cikan ? <Chip size="small" label="★ Öne Çıkan" color="warning" /> : null}
            {u.stok_motor_id || u.sifir_motor_id ? <Chip size="small" label="Stok bağlı" color="success" variant="outlined" /> : null}
            {u.segment && <Chip size="small" label={u.segment} color="error" variant="outlined" />}
            {u.motor_cc ? <Chip size="small" label={`${u.motor_cc} cc`} variant="outlined" /> : null}
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {u.baslik}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ minHeight: 20 }}>
            {[u.marka, u.model, u.yil].filter(Boolean).join(' ') || '\u00a0'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 20 }}>
            {u.km ? `${sayiYaz(u.km)} km` : '\u00a0'}
          </Typography>
          <Typography variant="h6" color="error" fontWeight="bold" sx={{ mt: 'auto', pt: 0.5 }}>
            {sayiYaz(u.fiyat)} ₺
          </Typography>
        </CardContent>
        {isAdmin && (
          <Box sx={{ px: 1.25, pb: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              fullWidth
              size="small"
              variant={u.yayinda ? 'outlined' : 'contained'}
              color={u.yayinda ? 'warning' : 'success'}
              startIcon={yayinSavingId === u.id ? <CircularProgress size={15} color="inherit" /> : u.yayinda ? <VisibilityOffIcon /> : <VisibilityIcon />}
              disabled={yayinSavingId !== null}
              onClick={() => handleYayinToggle(u)}
            >
              {u.yayinda ? 'Yayından Kaldır' : 'Yayına Al'}
            </Button>
          </Box>
        )}
        <CardActions sx={{ pt: 0 }}>
          <IslemDugmesi tur="duz" onClick={() => onDuzenle(u)} />
          <IslemDugmesi tur="sil" onClick={() => handleDelete(u.id)} />
          <Box sx={{ flexGrow: 1 }} />
          {!arsivGorunumu && (
            <>
              <IconButton
                size="small"
                disabled={orderSaving || !siraDegistirilebilir || index === 0}
                onClick={() => moveUrun(u.id, -1)}
                title="Bir sıra yukarı"
              >
                <UpIcon />
              </IconButton>
              <IconButton
                size="small"
                disabled={orderSaving || !siraDegistirilebilir || index === aktifler.length - 1}
                onClick={() => moveUrun(u.id, 1)}
                title="Bir sıra aşağı"
              >
                <DownIcon />
              </IconButton>
            </>
          )}
        </CardActions>
      </Card>
    </Grid>
  );
};

export default IlanKarti;
