import React, { useState } from 'react';
import { Box, Button, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MotorIkon from '@mui/icons-material/TwoWheelerOutlined';
import { Damga, IslemDugmesi } from '../../../../shared/ui';
import { FONT, RENK } from '../../../../app/tokenlar';
import { sayiYaz } from '../../../../shared/utils/bicim';
import type { SifirMotor } from '../../../../shared/tipler';
import { sifirMotorService } from '../../motorApi';
import { sifirAdi, sifirFiltrele } from '../sifirVeri';

// Bir sıfır model kartı: kapak fotoğrafı, ad, teknik bilgi, liste fiyatı (büyük), alış (yetkiliye), satılan sayacı ve işlemler.
const SifirMotorKarti = ({ m, canAlis, canEdit, isAdmin, onSatis, onDuzenle, onSil }: KartProps) => (
  <Paper component="article" aria-label={sifirAdi(m)} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <Box sx={{ position: 'relative', aspectRatio: '4 / 3', bgcolor: RENK.yuzeyKoyu, borderBottom: `1px solid ${RENK.cizgi}` }}>
      {m.kapak_gorsel_id ? (
        <Box
          component="img"
          src={sifirMotorService.gorselUrl(m.kapak_gorsel_id)}
          alt={sifirAdi(m)}
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
            color: RENK.soluk,
          }}
        >
          <MotorIkon fontSize="large" />
          <Typography variant="body2">Fotoğraf yok</Typography>
        </Box>
      )}
    </Box>
    <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
      <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 21, lineHeight: 1.15 }}>{[m.marka, m.model].filter(Boolean).join(' ')}</Typography>
      <Typography variant="body2" sx={{ color: RENK.soluk }}>
        {[m.yil, m.motor_cc ? `${m.motor_cc} cc` : null, m.segment].filter(Boolean).join(' • ') || 'Model bilgisi girilmedi'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 0.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 28, lineHeight: 1, color: RENK.murekkep }} title="Liste fiyatı">
          ₺{sayiYaz(m.liste_fiyati)}
        </Typography>
        {canAlis && m.alis_fiyati !== undefined && (
          <Typography variant="body2" sx={{ color: RENK.soluk }}>
            Alış ₺{sayiYaz(m.alis_fiyati)}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 1.25 }}>
        <Damga ton={m.satilan_adet ? 'mavi' : 'gri'}>{m.satilan_adet ? `${m.satilan_adet} satıldı` : 'Henüz satılmadı'}</Damga>
        <Box>
          {canEdit && <IslemDugmesi tur="satis" etiket={`${sifirAdi(m)} için satış gir`} title="Satış gir" onClick={() => onSatis(m)} />}
          {canEdit && <IslemDugmesi tur="duz" etiket={`${sifirAdi(m)} düzenle`} onClick={() => onDuzenle(m)} />}
          {isAdmin && <IslemDugmesi tur="sil" etiket={`${sifirAdi(m)} sil`} onClick={() => onSil(m)} />}
        </Box>
      </Box>
    </Box>
  </Paper>
);

interface Ortak {
  canAlis: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  onSatis: (m: SifirMotor) => void;
  onDuzenle: (m: SifirMotor) => void;
  onSil: (m: SifirMotor) => void;
}
interface KartProps extends Ortak {
  m: SifirMotor;
}
interface SifirStokProps extends Ortak {
  modeller: SifirMotor[];
  yukleniyor: boolean;
  onYeni: () => void;
}

// Motor Stok > Sıfır sekmesi. Sıfır stok bir MODEL listesidir: satış modeli stoktan düşürmez, yalnızca sayacı artırır.
const SifirStok = ({ modeller, yukleniyor, onYeni, ...ortak }: SifirStokProps) => {
  const [arama, setArama] = useState('');
  const gorunen = sifirFiltrele(modeller, arama);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: RENK.soluk, flex: '1 1 320px', maxWidth: 640 }}>
          Sıfır stok model listesidir. Satış girince model stoktan düşmez; satış Motor Satış'a, kârı raporlarda ayrı satıra yazılır.
        </Typography>
        {ortak.canEdit && (
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni}>
            Sıfır Motor Ekle
          </Button>
        )}
      </Box>

      {modeller.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Marka, model veya segment ile ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>
      )}

      {!yukleniyor && modeller.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 22 }}>Henüz sıfır motor yok</Typography>
          <Typography variant="body2" sx={{ color: RENK.soluk, mt: 0.5, mb: ortak.canEdit ? 2 : 0 }}>
            Sattığınız sıfır modelleri bir kez ekleyin; vitrin ilanı ve satış formu bilgileri buradan alır.
          </Typography>
          {ortak.canEdit && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={onYeni}>
              İlk modeli ekle
            </Button>
          )}
        </Paper>
      ) : modeller.length > 0 && gorunen.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', color: RENK.soluk }}>"{arama}" ile eşleşen model yok.</Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
          {gorunen.map((m) => (
            <SifirMotorKarti key={m.id} m={m} {...ortak} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SifirStok;
