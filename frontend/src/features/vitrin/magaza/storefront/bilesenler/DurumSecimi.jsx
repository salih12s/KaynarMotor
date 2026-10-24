import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { vitrinService } from '../../../vitrinApi';
import { MOTOR_DURUMLARI } from '../../../vitrinSabitleri';
import { RENK, YAZI, ODAK } from '../../../VitrinOrtak';
import { MOTOR_DURUM_BASLIK, MOTOR_DURUM_ACIKLAMA } from '../kategoriSabitleri';

// Motor kategorisinde önce Sıfır / İkinci El seçimi: arka planda o türden bir ilanın fotoğrafı ve ilan sayısı.
const DurumSecimi = ({ s }) => {
  const { durumOzet, secMotorDurumu } = s;
  return (
    <Box sx={{ flex: 1, width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 3, md: 8 } }}>
      <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 34, md: 52 }, lineHeight: 1 }}>
        Nasıl bir motor arıyorsunuz?
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: { xs: 3, md: 4 } }}>
        Seçiminize göre yalnızca o motorları listeleyelim.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {MOTOR_DURUMLARI.map((d) => {
          const ozet = durumOzet[d.key];
          return (
            <ButtonBase
              key={d.key}
              onClick={() => secMotorDurumu(d.key)}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                display: 'block',
                textAlign: 'left',
                minHeight: { xs: 190, md: 300 },
                borderRadius: 3,
                bgcolor: RENK.asfalt,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 16,
                ...ODAK,
                '@media (prefers-reduced-motion: no-preference)': {
                  '& .secim-gorsel': { transition: 'transform .6s cubic-bezier(.2,.7,.2,1)' },
                  '&:hover .secim-gorsel': { transform: 'scale(1.05)' },
                  '& .secim-ok': { transition: 'transform .2s ease' },
                  '&:hover .secim-ok': { transform: 'translateX(6px)' },
                },
              }}
            >
              {/* Arka planda o türden bir ilanın fotoğrafı; yazı okunabilsin diye soldan koyulaştırılır */}
              {ozet?.kapak && (
                <Box
                  component="img"
                  className="secim-gorsel"
                  src={vitrinService.gorselUrl(ozet.kapak)}
                  alt=""
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, rgba(20,20,20,.95) 0%, rgba(20,20,20,.78) 50%, rgba(20,20,20,.3) 100%)',
                }}
              />
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  height: '100%',
                  minHeight: 'inherit',
                  p: { xs: 3, md: 4 },
                }}
              >
                <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 32, md: 44 }, lineHeight: 1 }}>
                  {MOTOR_DURUM_BASLIK[d.key]}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.78)', mt: 1, maxWidth: '26ch' }}>{MOTOR_DURUM_ACIKLAMA[d.key]}</Typography>
                <Box sx={{ mt: 'auto', pt: 3, display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  <span>{ozet?.adet ? `${ozet.adet} ilanı gör` : 'İlanları gör'}</span>
                  <ArrowForwardIcon className="secim-ok" sx={{ fontSize: 20, color: RENK.kirmizi }} />
                </Box>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};

export default DurumSecimi;
