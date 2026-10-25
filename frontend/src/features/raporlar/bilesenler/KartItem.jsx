import React from 'react';
import { Paper, Typography } from '@mui/material';

const ARKA_PLAN = {
  '#C62828': '#F6DAD7',
  '#1E4A86': '#DCE6F4',
  '#A5530F': '#F7E7C4',
  '#1D6A3B': '#D8EBDD',
  '#5B3A8C': '#E7DFF3',
  '#0F7B6C': '#D5EAE6',
  '#5B3A8C': '#E7DFF3',
  '#8A5300': '#F7E7C4',
};

// Renkli sol kenarlıklı özet kartı (etiket + büyük değer)
const KartItem = ({ label, value, color = '#C62828', prefix = '' }) => (
  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: ARKA_PLAN[color] || '#F6DAD7', borderLeft: `4px solid ${color}` }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" fontWeight="bold" sx={{ color }}>
      {prefix}
      {value}
    </Typography>
  </Paper>
);

export default KartItem;
