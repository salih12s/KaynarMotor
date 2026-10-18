import React from 'react';
import { Paper, Typography } from '@mui/material';

const ARKA_PLAN = {
  '#C62828': '#ffebee', '#1565C0': '#e3f2fd', '#E65100': '#fff3e0', '#2e7d32': '#e8f5e9',
  '#6A1B9A': '#f3e5f5', '#00695C': '#e0f2f1', '#4A148C': '#ede7f6', '#f57f17': '#fff8e1',
};

// Renkli sol kenarlıklı özet kartı (etiket + büyük değer)
const KartItem = ({ label, value, color = '#C62828', prefix = '' }) => (
  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: ARKA_PLAN[color] || '#ffebee', borderLeft: `4px solid ${color}` }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h5" fontWeight="bold" sx={{ color }}>{prefix}{value}</Typography>
  </Paper>
);

export default KartItem;
