import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, Alert, CircularProgress, IconButton, Chip, InputAdornment } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import { satisBelgeService } from '../services/api';
import { belgeAc, belgeOnizlenebilir } from '../components/SatisBelgeleri';

const boyutYaz = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const normalize = (s) => String(s || '').toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '');

// Muhasebeci (ve admin) için salt-okunur belge arşivi: tüm belgeler plakaya göre gruplanır.
const BelgeArsivi = () => {
  const [gruplar, setGruplar] = useState(null);
  const [hata, setHata] = useState('');
  const [ara, setAra] = useState('');
  const [islemId, setIslemId] = useState(null);

  useEffect(() => {
    let aktif = true;
    satisBelgeService.arsiv()
      .then(res => { if (aktif) setGruplar(res.data); })
      .catch(() => { if (aktif) { setGruplar([]); setHata('Belgeler yüklenemedi'); } });
    return () => { aktif = false; };
  }, []);

  const gorunen = useMemo(() => {
    if (!gruplar) return [];
    const q = normalize(ara);
    if (!q) return gruplar;
    return gruplar.filter(g => normalize(`${g.plaka}${g.marka}${g.model}`).includes(q)
      || g.belgeler.some(b => normalize(b.dosya_adi).includes(q)));
  }, [gruplar, ara]);

  const toplamDosya = gorunen.reduce((t, g) => t + g.belgeler.length, 0);

  const ac = async (b, goster) => {
    setIslemId(b.id); setHata('');
    try { await belgeAc(b, goster); }
    catch { setHata('Belge açılamadı'); }
    setIslemId(null);
  };

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>Belge Arşivi</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Motorlara eklenen tüm belgeler plakaya göre listelenir.
      </Typography>

      <TextField fullWidth size="small" placeholder="Plaka, marka veya dosya adı ara"
        value={ara} onChange={e => setAra(e.target.value)} sx={{ mb: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />

      {hata && <Alert severity="error" onClose={() => setHata('')} sx={{ mb: 2 }}>{hata}</Alert>}

      {gruplar === null ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : gorunen.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {gruplar.length === 0 ? 'Henüz belge eklenmemiş.' : 'Aramaya uyan belge yok.'}
        </Typography>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {gorunen.length} araç • {toplamDosya} dosya
          </Typography>
          {gorunen.map(g => (
            <Box key={g.motor_id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', px: 2, py: 1.25, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{
                  px: 1.25, py: 0.25, border: '2px solid #1a1a1a', borderRadius: '4px', bgcolor: '#fff', color: '#1a1a1a',
                  fontWeight: 800, letterSpacing: 1.5, fontSize: '1.05rem', fontFamily: 'monospace', whiteSpace: 'nowrap',
                }}>
                  {g.plaka || 'PLAKASIZ'}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
                  {[g.marka, g.model].filter(Boolean).join(' ')}
                </Typography>
                {g.durum === 'tamamlandi'
                  ? <Chip size="small" label="Satıldı" color="success" variant="outlined" />
                  : <Chip size="small" label="Stokta" variant="outlined" />}
              </Box>
              {g.belgeler.map(b => (
                <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                  <DescriptionIcon color="action" />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="500" noWrap title={b.dosya_adi}>{b.dosya_adi}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {boyutYaz(b.boyut)} • {new Date(b.created_at).toLocaleDateString('tr-TR')}
                    </Typography>
                  </Box>
                  {islemId === b.id ? <CircularProgress size={20} /> : (
                    <>
                      {belgeOnizlenebilir(b) && (
                        <IconButton size="small" onClick={() => ac(b, true)} title="Görüntüle"><ViewIcon fontSize="small" /></IconButton>
                      )}
                      <IconButton size="small" onClick={() => ac(b, false)} title="İndir"><FileDownloadIcon fontSize="small" /></IconButton>
                    </>
                  )}
                </Box>
              ))}
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};

export default BelgeArsivi;
