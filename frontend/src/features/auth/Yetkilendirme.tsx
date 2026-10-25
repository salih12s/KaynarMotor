import React, { useState, useEffect } from 'react';
import { hataMesaji } from '../../shared/api/istemci';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Alert,
  Chip,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { RENK } from '../../app/tokenlar';
import { authService } from './authApi';
import type { Kullanici, YetkiBayraklari } from '../../shared/tipler';

// Motor Satış yetkisi ile birlikte verilen görüntüleme yetkileri
// (satış fiyatı, müşteri bilgisi ve satış geçmişi Motor Satış'ın içinde gelir — alış fiyatı ve kâr DAHİL DEĞİL)
const MOTOR_SATIS_KAPSAMI = ['satis_fiyati_gor', 'musteri_gor', 'satis_gecmisi_gor'];

// İşlem (modül) yetkileri — tüm yetkilendirme tek bir tabloda toplanır
const ISLEM_YETKILERI: Array<{ key: keyof YetkiBayraklari; label: string }> = [
  { key: 'motor_satis_yetkisi', label: 'Motor Satış' },
  { key: 'aksesuar_yetkisi', label: 'Aksesuar Satış' },
  { key: 'aksesuar_stok_yetkisi', label: 'Aksesuar Stok' },
  { key: 'yedek_parca_yetkisi', label: 'Yedek Parça' },
  { key: 'servis_yetkisi', label: 'Servis' },
  { key: 'eticaret_yetkisi', label: 'E-Ticaret' },
  { key: 'motor_vitrin_yetkisi', label: 'Motor Vitrini (Site)' },
  { key: 'aksesuar_vitrin_yetkisi', label: 'Aksesuar Vitrini (Site)' },
];

const TUM_YETKILER = ISLEM_YETKILERI;

const Yetkilendirme = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'));
  const [users, setUsers] = useState<Kullanici[]>([]);
  const [muhasebeciler, setMuhasebeciler] = useState<Kullanici[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    try {
      const res = await authService.getUsers();
      // Reddedilenler giriş yapamaz: yetkilendirme listesine girmez
      const aktifler = res.data.filter((u) => u.onay_durumu !== 'reddedildi');
      // Admin ve yatırımcı dışındaki (personel) kullanıcılar yetkilendirilir
      setUsers(aktifler.filter((u) => u.rol !== 'admin' && u.rol !== 'yatirimci' && u.rol !== 'muhasebeci'));
      setMuhasebeciler(aktifler.filter((u) => u.rol === 'muhasebeci'));
    } catch {
      setError('Kullanıcılar yüklenemedi');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggle = async (user: Kullanici, key: keyof YetkiBayraklari, value: boolean) => {
    setError('');
    setSuccess('');
    // Motor Satış yetkisi açılınca/kapanınca alış-satış fiyatı, kâr, müşteri ve satış geçmişi yetkileri de birlikte değişir
    const payload: Partial<Record<keyof YetkiBayraklari, boolean>> =
      key === 'motor_satis_yetkisi' ? { motor_satis_yetkisi: value, ...Object.fromEntries(MOTOR_SATIS_KAPSAMI.map((k) => [k, value])) } : { [key]: value };
    const oncekiUser = user; // hata olursa geri almak için
    // Optimistik güncelleme
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...payload } : u)));
    try {
      await authService.setYetkiler(user.id, payload);
      setSuccess(`${user.ad_soyad} yetkileri güncellendi`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(hataMesaji(err, 'Güncelleme hatası'));
      // Geri al
      setUsers((prev) => prev.map((u) => (u.id === user.id ? oncekiUser : u)));
    }
  };

  // Muhasebeci: Motor Satış sayfasını SALT OKUNUR görme izni (alım/satım, noter, satış ve kişi bilgileri; kâr hariç)
  const handleMuhasebeToggle = async (user: Kullanici, value: boolean) => {
    setError('');
    setSuccess('');
    setMuhasebeciler((prev) => prev.map((u) => (u.id === user.id ? { ...u, motor_satis_gor: value } : u)));
    try {
      await authService.setYetkiler(user.id, { motor_satis_gor: value });
      setSuccess(`${user.ad_soyad} yetkileri güncellendi`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(hataMesaji(err, 'Güncelleme hatası'));
      setMuhasebeciler((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    }
  };

  return (
    <Box>
      {/* Sayfa başlığı üst çubukta (Layout) zaten var; burada tekrarlanmaz */}
      <Typography variant="body2" color="text.secondary" mb={3}>
        Personelin hangi işlemleri yapabileceğini buradan ayarlayın. <strong>Motor Satış</strong> yetkisi; satış fiyatı, müşteri bilgisi ve satış geçmişi
        görüntüleme yetkilerini de kapsar (alış fiyatı ve kâr hariç).
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {users.length === 0 && <Alert severity="info">Yetkilendirilecek personel bulunmuyor. Kullanıcı Yönetimi ekranından personel ekleyebilirsiniz.</Alert>}

      {/* Mobil görünüm */}
      {isMobile
        ? users.map((user) => (
            <Card key={user.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography fontWeight="bold">{user.ad_soyad}</Typography>
                  <Chip size="small" label={user.kullanici_adi} variant="outlined" />
                </Box>
                <Divider sx={{ mb: 1 }} />
                {ISLEM_YETKILERI.map((y) => (
                  <FormControlLabel
                    key={y.key}
                    sx={{ display: 'flex', justifyContent: 'space-between', ml: 0 }}
                    labelPlacement="start"
                    label={y.label}
                    control={<Switch checked={!!user[y.key]} onChange={(e) => handleToggle(user, y.key, e.target.checked)} />}
                  />
                ))}
              </CardContent>
            </Card>
          ))
        : users.length > 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: RENK.yuzeyKoyu, zIndex: 1 }}>Personel</TableCell>
                    {TUM_YETKILER.map((y) => (
                      <TableCell key={y.key} sx={{ whiteSpace: 'nowrap' }}>
                        {y.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ position: 'sticky', left: 0, bgcolor: RENK.yuzey }}>
                        <Typography fontWeight="bold" variant="body2">
                          {user.ad_soyad}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.kullanici_adi}
                        </Typography>
                      </TableCell>
                      {TUM_YETKILER.map((y) => (
                        <TableCell key={y.key}>
                          <Switch checked={!!user[y.key]} onChange={(e) => handleToggle(user, y.key, e.target.checked)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

      <Typography variant="h6" fontWeight="bold" mt={4} mb={0.5}>
        Muhasebeciler
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Muhasebeci her zaman Belge Arşivi'ni görür. Aşağıdaki anahtar açılırsa <strong>Motor Satış</strong> sayfasını da <strong>salt okunur</strong> görür:
        alım/satım bedeli, noter tutarları, satış bilgileri ve alıcı/satıcı bilgileri. Kâr, masraf ve yatırımcı payı görünmez; kayıt ekleyemez, düzenleyemez.
      </Typography>
      {muhasebeciler.length === 0 ? (
        <Alert severity="info">Muhasebeci hesabı yok. Kullanıcı Yönetimi ekranından ekleyebilirsiniz.</Alert>
      ) : (
        <Paper variant="outlined">
          {muhasebeciler.map((u, i) => (
            <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderTop: i ? '1px solid' : 0, borderColor: 'divider' }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography fontWeight="bold" variant="body2">
                  {u.ad_soyad}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.kullanici_adi}
                </Typography>
              </Box>
              <FormControlLabel
                labelPlacement="start"
                sx={{ mr: 0 }}
                label="Motor Satış (salt okunur)"
                control={<Switch checked={!!u.motor_satis_gor} onChange={(e) => handleMuhasebeToggle(u, e.target.checked)} />}
              />
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default Yetkilendirme;
