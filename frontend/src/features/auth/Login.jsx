import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Tab, Tabs } from '@mui/material';
import { useAuth } from './AuthContext';
import { authService } from './authApi';
import { FONT, RENK } from '../../app/tokenlar';

// Giriş / kayıt: üstü delikli kâğıt fişi andıran tek kart, ortada logo (Servis Defteri tasarımı).
const Login = () => {
  const { login } = useAuth();
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({ kullanici_adi: '', sifre: '', ad_soyad: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authService.login({ kullanici_adi: formData.kullanici_adi, sifre: formData.sifre });
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş başarısız');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authService.register(formData);
      setSuccess(res.data.message);
      setTab(0);
      setFormData({ ...formData, ad_soyad: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt başarısız');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: RENK.kenarMenu, px: 2, py: 4 }}>
      <Box
        sx={{
          position: 'relative',
          width: 440,
          maxWidth: '100%',
          bgcolor: RENK.yuzey,
          px: { xs: 3, sm: 5 },
          pt: { xs: 5, sm: 6 },
          pb: { xs: 4, sm: 5 },
          boxShadow: '0 24px 48px -18px rgba(22,24,28,.28), 0 2px 6px rgba(22,24,28,.08)',
          // Delikli üst kenar: zemin renginde yarım daireler
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            backgroundImage: `radial-gradient(circle at 11px 0, ${RENK.kenarMenu} 6px, transparent 6.5px)`,
            backgroundSize: '22px 12px',
            backgroundRepeat: 'repeat-x',
          },
        }}
      >
        <Box sx={{ textAlign: 'left' }}>
          <img
            src="/kaynar-logo.png"
            alt="Kaynar Motor"
            width="190"
            height="102"
            style={{ width: 190, maxWidth: '70%', height: 'auto', display: 'block', margin: 0 }}
          />
        </Box>
        <Typography
          component="h1"
          sx={{
            fontFamily: FONT.baslik,
            fontWeight: 700,
            fontSize: { xs: 34, sm: 40 },
            lineHeight: 1.1,
            color: RENK.murekkep,
            mt: 1.5,
            pb: 2.5,
            mb: 2.5,
            borderBottom: `1.5px dashed ${RENK.cizgiKesik}`,
          }}
        >
          Servis Yönetim Sistemi
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setError('');
            setSuccess('');
          }}
          TabIndicatorProps={{ sx: { bgcolor: RENK.kirmizi } }}
          sx={{ mb: 2.5, borderBottom: `1px solid ${RENK.cizgi}` }}
        >
          <Tab label="Giriş Yap" />
          <Tab label="Kayıt Ol" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {tab === 0 ? (
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Kullanıcı Adı"
              name="kullanici_adi"
              value={formData.kullanici_adi}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus
              autoComplete="username"
              placeholder="Kullanıcı adı"
            />
            <TextField
              fullWidth
              label="Şifre"
              name="sifre"
              type="password"
              value={formData.sifre}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
              placeholder="Şifre"
            />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2.5, py: 1.4 }} disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <TextField
              fullWidth
              label="Ad Soyad"
              name="ad_soyad"
              value={formData.ad_soyad}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus
              placeholder="Ad soyad"
            />
            <TextField
              fullWidth
              label="Kullanıcı Adı"
              name="kullanici_adi"
              value={formData.kullanici_adi}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="username"
              placeholder="Kullanıcı adı"
            />
            <TextField
              fullWidth
              label="Şifre"
              name="sifre"
              type="password"
              value={formData.sifre}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
              placeholder="Şifre"
            />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2.5, py: 1.4 }} disabled={loading}>
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </Button>
            <Typography sx={{ mt: 1.75, fontSize: 14, color: RENK.soluk }}>Kaydınız yönetici onayından sonra açılır.</Typography>
          </form>
        )}
      </Box>
    </Box>
  );
};

export default Login;
