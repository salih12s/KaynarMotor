import React from 'react';
import type { Platform } from '../../../../shared/tipler';
import { Box, Button, TextField, MenuItem, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { RENK } from '../../../../app/tokenlar';

// Satışlar / Platformlar sekmeleri; sağda (satışlarda) platform süzgeci ve sekmeye göre "Yeni Satış" / "Yeni Platform" (yalnız admin) düğmesi.
interface SekmelerProps {
  tab: number;
  setTab: (tab: number) => void;
  platformFiltre: string | number;
  setPlatformFiltre: (platformId: string | number) => void;
  platformlar: Platform[];
  isAdmin: boolean;
  onYeniSatis: () => void;
  onYeniPlatform: () => void;
}

const Sekmeler = ({ tab, setTab, platformFiltre, setPlatformFiltre, platformlar, isAdmin, onYeniSatis, onYeniPlatform }: SekmelerProps) => {
  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: `1px solid ${RENK.cizgi}` }}>
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ flexGrow: 1 }} TabIndicatorProps={{ sx: { bgcolor: RENK.kirmizi } }}>
        <Tab label="Satışlar" />
        <Tab label="Platformlar" />
      </Tabs>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', pb: 1 }}>
        {tab === 0 && (
          <TextField
            select
            size="small"
            value={platformFiltre}
            onChange={(e) => setPlatformFiltre(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 200 } }}
            SelectProps={{
              displayEmpty: true,
              SelectDisplayProps: { 'aria-label': 'Platform Filtre' },
              renderValue: (v) => (v ? platformlar.find((p) => p.id === v)?.platform_adi || '' : 'Platform Filtre'),
            }}
          >
            <MenuItem value="">Tümü</MenuItem>
            {platformlar.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.platform_adi}
              </MenuItem>
            ))}
          </TextField>
        )}
        {tab === 0 && (
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeniSatis}>
            Yeni Satış
          </Button>
        )}
        {tab === 1 && isAdmin && (
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeniPlatform}>
            Yeni Platform
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default Sekmeler;
