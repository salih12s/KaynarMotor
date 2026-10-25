import React from 'react';
import { Damga, IslemDugmesi, Plaka } from '../../../../shared/ui';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Tooltip } from '@mui/material';

import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';
import { RENK } from '../../../../app/tokenlar';

// Durum damgası: [etiket, ton]. Konsinye, durumu "stokta" olan konsinye araçtır.
const durumDamgasi = (m) => {
  if (m.durum === 'stokta') return m.stok_tipi === 'konsinye' ? ['Konsinye', 'bekle'] : ['Stokta', 'yesil'];
  if (m.durum === 'kapora') return ['Kapora', 'mavi'];
  if (m.durum === 'depo_serviste') return ['Depo / Serviste', 'turuncu'];
  if (m.durum === 'devir_bekliyor') return ['Devir Bekliyor', 'mor'];
  if (m.durum === 'perte') return ['Perte', 'kirmizi'];
  if (m.durum === 'tamamlandi') return ['Satıldı', 'gri'];
  return [m.durum || '-', 'gri'];
};

const SAYISAL = ['KM', 'İlan Fiyatı', 'Alım', 'Alış Bedeli', 'Kârım'];

// Motor listesi: dar ekranda kartlar, geniş ekranda tablo. Sütun ve düğmeler yetki bayraklarına (perms) göre değişir.
const MotorListesi = ({ filteredMotorlar, isMobile, perms, onDetay, onHizliSatis, onDuzenle, onSil }) => {
  const { isAdmin, isYatirimci, isYatirimciSahip, canAlis, canMusteri, canListe, canEdit } = perms;
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {filteredMotorlar.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
      {filteredMotorlar.map((m) => {
        const [durumEtiketi, durumTon] = durumDamgasi(m);
        return (
          <Paper key={m.id} sx={{ p: 1.5 }} onClick={() => onDetay(m.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Plaka plaka={m.plaka} />
              <Damga ton={durumTon}>{durumEtiketi}</Damga>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {m.marka} {m.model} {m.yil ? `(${m.yil})` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {m.km ? sayiYaz(m.km) + ' km' : ''}
              {canMusteri ? ` • ${m.satici_adi || '-'}` : ''} • {tarihYaz(m.tarih)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
              {canAlis && (
                <Typography variant="body2">
                  Alım: <strong>₺{sayiYaz(m.alis_fiyati)}</strong>
                </Typography>
              )}
              {canAlis && (
                <Typography variant="body2">
                  Noter: <strong>₺{sayiYaz(m.noter_alis)}</strong>
                </Typography>
              )}
              {canListe && (
                <Typography variant="body2" sx={{ color: RENK.mavi }}>
                  İlan: <strong>₺{sayiYaz(m.liste_fiyati)}</strong>
                </Typography>
              )}
              {isYatirimciSahip && m.durum === 'tamamlandi' && (
                <Typography variant="body2" sx={{ color: RENK.yesil }}>
                  Kârım: <strong>₺{sayiYaz(m.yatirimci_kar)}</strong>
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
              {canEdit && m.durum !== 'tamamlandi' && m.durum !== 'perte' && <IslemDugmesi tur="satis" onClick={() => onHizliSatis(m)} />}
              {canEdit && <IslemDugmesi tur="duz" onClick={() => onDuzenle(m)} />}
              {isAdmin && <IslemDugmesi tur="sil" onClick={() => onSil(m.id)} />}
            </Box>
          </Paper>
        );
      })}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1, py: 0.8, fontSize: '0.86rem' } }}>
        <TableHead>
          <TableRow>
            {[
              'Plaka',
              'Marka / Model',
              'Yıl',
              'KM',
              ...(canListe ? ['İlan Fiyatı'] : []),
              ...(canAlis ? ['Alım'] : []),
              ...(canAlis ? ['Alış Bedeli'] : []),
              ...(canMusteri ? ['İsim Soyisim'] : []),
              'Alım Tarihi',
              ...(isYatirimciSahip ? ['Kârım'] : []),
              'Durum',
              isYatirimci ? 'Detay' : 'İşlemler',
            ].map((h) => (
              <TableCell key={h} align={SAYISAL.includes(h) ? 'right' : 'left'} sx={{ whiteSpace: 'nowrap' }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredMotorlar.map((m) => {
            const [durumEtiketi, durumTon] = durumDamgasi(m);
            return (
              <TableRow key={m.id} hover>
                <TableCell>
                  <Plaka plaka={m.plaka} />
                </TableCell>
                <TableCell>
                  <Box sx={{ fontWeight: 700 }}>{m.marka || '-'}</Box>
                  <Box sx={{ color: RENK.soluk }}>{m.model || '-'}</Box>
                </TableCell>
                <TableCell sx={{ color: RENK.soluk }}>{m.yil || '-'}</TableCell>
                <TableCell align="right">{m.km ? sayiYaz(m.km) : '-'}</TableCell>
                {canListe && (
                  <TableCell align="right" sx={{ color: RENK.mavi, fontWeight: 700 }}>
                    {sayiYaz(m.liste_fiyati)}
                  </TableCell>
                )}
                {canAlis && <TableCell align="right">{sayiYaz(m.alis_fiyati)}</TableCell>}
                {canAlis && <TableCell align="right">{sayiYaz(m.noter_alis)}</TableCell>}
                {canMusteri && (
                  <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={`${m.satici_adi || '-'}${m.satici_tc ? ' - TC: ' + m.satici_tc : ''}`}>
                      <span>{m.satici_adi || '-'}</span>
                    </Tooltip>
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: 'nowrap', color: RENK.soluk }}>{tarihYaz(m.tarih)}</TableCell>
                {isYatirimciSahip && (
                  <TableCell align="right" sx={{ color: RENK.yesil, fontWeight: 700 }}>
                    {m.durum === 'tamamlandi' ? sayiYaz(m.yatirimci_kar) : '-'}
                  </TableCell>
                )}
                <TableCell>
                  <Damga ton={durumTon}>{durumEtiketi}</Damga>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {canEdit && m.durum !== 'tamamlandi' && m.durum !== 'perte' && (
                    <Tooltip title="Hızlı Satış">
                      <IslemDugmesi tur="satis" onClick={() => onHizliSatis(m)} />
                    </Tooltip>
                  )}
                  <IslemDugmesi tur="goz" onClick={() => onDetay(m.id)} />
                  {canEdit && <IslemDugmesi tur="duz" onClick={() => onDuzenle(m)} />}
                  {isAdmin && <IslemDugmesi tur="sil" onClick={() => onSil(m.id)} />}
                </TableCell>
              </TableRow>
            );
          })}
          {filteredMotorlar.length === 0 && (
            <TableRow>
              <TableCell colSpan={13} align="center">
                Kayıt yok
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MotorListesi;
