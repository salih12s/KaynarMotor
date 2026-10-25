import React from 'react';
import type { StorefrontDurumu } from '../useStorefront';
import type { NavigateFunction } from 'react-router-dom';
import { Box, AppBar, Toolbar, Button, Typography, IconButton } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import CalculateIcon from '@mui/icons-material/Calculate';
import { KATEGORILER } from '../../../vitrinSabitleri';
import { RED } from '../kategoriSabitleri';

// Üst çubuk: logo, masaüstü menüsü (kategoriler), mobilde hamburger, taksit hesapla ve servise git.
const UstBar = ({ s, isMobile, navigate }: { s: StorefrontDurumu; isMobile: boolean; navigate: NavigateFunction }) => {
  const { goHome, tab, handleTab, setTaksitOpen, setMobilMenu } = s;
  return (
    <AppBar position="sticky" sx={{ bgcolor: '#1a1a1a', borderRadius: 0 }} elevation={3}>
      <Toolbar sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 56, md: 64 }, px: { xs: 1.5, md: 3 } }}>
        <Box onClick={goHome} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, cursor: 'pointer' }}>
          <span className="kmt-logo-wrap" style={{ width: 32, height: 36, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <img
              className="kmt-logo"
              src="/KaynarMotor.png"
              alt="Kaynar Motor"
              width="32"
              height="36"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }}
            />
          </span>
          <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 1, fontSize: { xs: 15, md: 20 }, whiteSpace: 'nowrap' }}>
            KAYNAR <span style={{ color: RED }}>MOTOR</span>
          </Typography>
        </Box>

        {/* Masaüstü menüler — eşit aralıklı (space-evenly) dağılır */}
        {!isMobile && (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'space-evenly', mx: 2 }}>
            <Button
              disableRipple
              onClick={goHome}
              startIcon={<HomeIcon />}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap',
                borderRadius: 0,
                px: 1,
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              Ana Sayfa
            </Button>
            {KATEGORILER.map((k, i) => (
              <Button
                key={k.key}
                disableRipple
                onClick={() => handleTab(i)}
                sx={{
                  color: tab === i ? '#fff' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  borderRadius: 0,
                  px: 1,
                  borderBottom: tab === i ? `3px solid ${RED}` : '3px solid transparent',
                  '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                {k.label}
              </Button>
            ))}
          </Box>
        )}

        {/* Mobilde hamburger menü butonu */}
        {isMobile && (
          <>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={() => setMobilMenu(true)} sx={{ color: '#fff' }} aria-label="Menü">
              <MenuIcon />
            </IconButton>
          </>
        )}

        {!isMobile && (
          <Button
            variant="outlined"
            startIcon={<CalculateIcon />}
            onClick={() => setTaksitOpen(true)}
            sx={{
              flexShrink: 0,
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              px: 2,
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Taksit Hesapla
          </Button>
        )}

        <Button
          variant="contained"
          color="error"
          startIcon={!isMobile && <LoginIcon />}
          onClick={() => navigate('/login')}
          sx={{ flexShrink: 0, fontSize: { xs: 12, md: 14 }, px: { xs: 1.5, md: 2 } }}
        >
          Servise Git
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default UstBar;
