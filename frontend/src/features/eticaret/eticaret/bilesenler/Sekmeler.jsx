import React from 'react';
import { Paper, TextField, MenuItem, Tabs, Tab } from '@mui/material';

// Satışlar / Platformlar sekmeleri ve (satışlarda) platform süzgeci.
const Sekmeler = ({ tab, setTab, platformFiltre, setPlatformFiltre, platformlar }) => {
  return (
    <Paper sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flexGrow: 1 }}>
        <Tab label="Satışlar" />
        <Tab label="Platformlar" />
      </Tabs>
      {tab === 0 && (
        <TextField select size="small" value={platformFiltre} onChange={e => setPlatformFiltre(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 160 }, mr: { xs: 0, sm: 2 }, mb: { xs: 1, sm: 0 }, mx: { xs: 1, sm: 0 } }} label="Platform Filtre">
          <MenuItem value="">Tümü</MenuItem>
          {platformlar.map(p => <MenuItem key={p.id} value={p.id}>{p.platform_adi}</MenuItem>)}
        </TextField>
      )}
    </Paper>
  );
};

export default Sekmeler;
