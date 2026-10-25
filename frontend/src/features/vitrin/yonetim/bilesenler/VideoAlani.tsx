import React from 'react';
import type { IlanFormuDurumu } from '../useIlanFormu';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MovieIcon from '@mui/icons-material/Movie';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { RENK } from '../../../../app/tokenlar';

// Tanıtım videosu: dosya yükleme (veritabanında tutulur), değiştirme ve kaldırma.
const VideoAlani = ({ f, videoLimitMb }: { f: IlanFormuDurumu; videoLimitMb: number }) => {
  const { videoFile, videoAdi, videoVar, videoSil, videoYukleniyor, removeVideo, handleVideoFile } = f;
  return (
    <Box sx={{ border: `1px solid ${RENK.cizgi}`, borderRadius: 2, p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Tanıtım Videosu
      </Typography>
      {videoFile || (videoVar && !videoSil) ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <PlayCircleIcon color="error" />
          <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>
            {videoFile ? videoAdi || 'Yeni video seçildi' : 'Yüklü video mevcut'}
          </Typography>
          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={removeVideo}>
            Kaldır
          </Button>
          <Button size="small" variant="outlined" component="label" startIcon={<MovieIcon />}>
            Değiştir
            <input type="file" hidden accept="video/*" onChange={handleVideoFile} />
          </Button>
        </Box>
      ) : (
        <Button variant="outlined" component="label" startIcon={videoYukleniyor ? <CircularProgress size={16} /> : <MovieIcon />} disabled={videoYukleniyor}>
          {videoYukleniyor ? 'Okunuyor...' : 'Video Yükle'}
          <input type="file" hidden accept="video/*" onChange={handleVideoFile} />
        </Button>
      )}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        MP4/WebM önerilir, en fazla ~{videoLimitMb} MB. Yüklenen video ilan detayında oynatılır.
      </Typography>
    </Box>
  );
};

export default VideoAlani;
