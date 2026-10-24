import React from 'react';
import { Box, Button, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import DragIcon from '@mui/icons-material/DragIndicator';
import IlanKarti from './IlanKarti';

// İlan listesi: yükleniyor / boş / sonuç yok mesajları ve ilan kartları ızgarası.
const IlanListesi = ({ liste, isAdmin, isMotor, onDuzenle }) => {
  const { loading, urunler, filtrelenmis, aramaVar, arama, arsivGorunumu, digerSonuc, setGorunum, siraDegistirilebilir, orderSaving, siraMap } = liste;
  return loading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  ) : urunler.length === 0 ? (
    <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Bu kategoride henüz ilan yok. "İlan Ekle" ile başlayın.</Paper>
  ) : filtrelenmis.length === 0 ? (
    <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
      {aramaVar ? (
        <>
          <Typography>
            "{arama.trim()}" ile eşleşen ilan {arsivGorunumu ? 'arşivde' : 'yayında'} yok.
          </Typography>
          {digerSonuc > 0 && (
            <Button sx={{ mt: 1 }} onClick={() => setGorunum(arsivGorunumu ? 'aktif' : 'arsiv')}>
              {arsivGorunumu ? 'Yayındakilerde' : 'Arşivde'} {digerSonuc} sonuç var — göster
            </Button>
          )}
        </>
      ) : arsivGorunumu ? (
        'Arşiv boş. Yayından kaldırdığınız ilanlar burada toplanır.'
      ) : (
        'Yayında ilan yok. Arşivden "Yayına Al" ile geri getirebilir veya yeni ilan ekleyebilirsiniz.'
      )}
    </Paper>
  ) : (
    <>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        {!isAdmin && siraDegistirilebilir && <DragIcon color="action" />}
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {arsivGorunumu
            ? 'Arşivdeki ilanlar sitede görünmez. Geri getirmek için "Yayına Al"a basın; ilan yayındaki listenin sonuna eklenir.'
            : aramaVar
              ? `${filtrelenmis.length} ilan bulundu. Yukarı/aşağı okları ve sürükleme, aramayı temizleyince açılır.`
              : isAdmin
                ? 'Kartın üstündeki sıra numarasını yazıp Değiştir düğmesine basın.'
                : 'Kartları sürükleyerek anasayfadaki sırayı belirleyin. Telefonda ok tuşlarını kullanabilirsiniz.'}
        </Typography>
        {orderSaving && <CircularProgress size={18} />}
      </Paper>
      <Grid container spacing={2}>
        {filtrelenmis.map((u) => (
          <IlanKarti key={u.id} u={u} index={siraMap.get(u.id)} liste={liste} isAdmin={isAdmin} isMotor={isMotor} onDuzenle={onDuzenle} />
        ))}
      </Grid>
    </>
  );
};

export default IlanListesi;
