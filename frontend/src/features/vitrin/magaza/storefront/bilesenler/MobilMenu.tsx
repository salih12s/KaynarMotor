import React from 'react';
import type { StorefrontDurumu } from '../useStorefront';
import { Box, Typography, IconButton, Divider, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Drawer } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import CalculateIcon from '@mui/icons-material/Calculate';
import { KATEGORILER } from '../../../vitrinSabitleri';
import { RED, KATEGORI_ICON } from '../kategoriSabitleri';

// Mobil menü çekmecesi (hamburger): ana sayfa, kategoriler ve taksit hesapla.
const MobilMenu = ({ s }: { s: StorefrontDurumu }) => {
  const { mobilMenu, setMobilMenu, goHome, tab, handleTab, setTaksitOpen } = s;
  return (
    <Drawer anchor="right" open={mobilMenu} onClose={() => setMobilMenu(false)} PaperProps={{ sx: { width: 260, bgcolor: '#1a1a1a', color: '#fff' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Typography fontWeight="bold" sx={{ letterSpacing: 1 }}>
          KAYNAR <span style={{ color: RED }}>MOTOR</span>
        </Typography>
        <IconButton onClick={() => setMobilMenu(false)} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              goHome();
              setMobilMenu(false);
            }}
          >
            <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 38 }}>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Ana Sayfa" />
          </ListItemButton>
        </ListItem>
        {KATEGORILER.map((k, i) => (
          <ListItem disablePadding key={k.key}>
            <ListItemButton
              selected={tab === i}
              onClick={() => {
                handleTab(i);
                setMobilMenu(false);
              }}
              sx={{ '&.Mui-selected': { bgcolor: 'rgba(198,40,40,0.25)', borderLeft: `4px solid ${RED}` } }}
            >
              <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 38 }}>{KATEGORI_ICON[k.key]}</ListItemIcon>
              <ListItemText primary={k.label} primaryTypographyProps={{ fontWeight: tab === i ? 700 : 500 }} />
            </ListItemButton>
          </ListItem>
        ))}
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 0.5 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setTaksitOpen(true);
              setMobilMenu(false);
            }}
          >
            <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 38 }}>
              <CalculateIcon />
            </ListItemIcon>
            <ListItemText primary="Taksit Hesapla" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default MobilMenu;
