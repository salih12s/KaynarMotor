import React, { useState, useEffect } from 'react';
import { hataMesaji } from '../../shared/api/istemci';
import LockIcon from '@mui/icons-material/LockOutlined';
import PersonAddIcon2 from '@mui/icons-material/PersonAddAltOutlined';
import { Damga, IslemDugmesi, DialogBasligi } from '../../shared/ui';
import { FONT, TON, type TonAdi } from '../../app/tokenlar';
import type { Kullanici } from '../../shared/tipler';
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
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { authService } from './authApi';

// Rol: yuvarlak köşeli düz etiket (personel gri, yatırımcı mor, admin kırmızı).
const ROL: Record<string, [TonAdi, string]> = {
  admin: ['kirmizi', 'admin'],
  yatirimci: ['mor', 'yatırımcı'],
  personel: ['gri', 'personel'],
  muhasebeci: ['mavi', 'muhasebeci'],
};
const RolEtiketi = ({ rol }: { rol: string | null | undefined }) => {
  const [ton, yazi]: [TonAdi, string | null | undefined] = (rol && ROL[rol]) || ['gri', rol];
  return (
    <Box
      component="span"
      sx={{ display: 'inline-block', px: 1.25, py: '1px', borderRadius: '999px', fontSize: 13, fontWeight: 600, color: TON[ton].fg, bgcolor: TON[ton].bg }}
    >
      {yazi}
    </Box>
  );
};

// Onay durumu: çerçeveli damga
const ONAY: Record<string, [TonAdi, string]> = {
  onaylandi: ['yesil', 'Onaylandı'],
  reddedildi: ['kirmizi', 'Reddedildi'],
  beklemede: ['bekle', 'Onay bekliyor'],
};
const OnayDamgasi = ({ durum }: { durum: string | null | undefined }) => {
  const [ton, yazi]: [TonAdi, string | null | undefined] = (durum && ONAY[durum]) || ['gri', durum];
  return <Damga ton={ton}>{yazi}</Damga>;
};

const Kullanicilar = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [users, setUsers] = useState<Kullanici[]>([]);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: Kullanici | null }>({ open: false, user: null });
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ kullanici_adi: '', sifre: '', ad_soyad: '', rol: 'yatirimci' });
  const [sifreDialog, setSifreDialog] = useState<{ open: boolean; user: Kullanici | null; sifre: string }>({ open: false, user: null, sifre: '' });
  const [bilgi, setBilgi] = useState('');

  const loadUsers = async () => {
    try {
      const res = await authService.getUsers();
      setUsers(res.data);
    } catch {
      setError('Kullanıcılar yüklenemedi');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async () => {
    setError('');
    if (!createForm.kullanici_adi || !createForm.sifre || !createForm.ad_soyad) {
      setError('Tüm alanlar zorunludur');
      return;
    }
    if (createForm.sifre.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return;
    }
    try {
      await authService.createUser(createForm);
      setCreateDialog(false);
      setCreateForm({ kullanici_adi: '', sifre: '', ad_soyad: '', rol: 'yatirimci' });
      loadUsers();
    } catch (err) {
      setError(hataMesaji(err, 'Oluşturma hatası'));
    }
  };

  // Şifreler artık saklanmaz ve gösterilemez: unutan kullanıcıya yönetici yeni şifre belirler
  const handleSifreSifirla = async () => {
    setError('');
    if (sifreDialog.sifre.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return;
    }
    const kullanici = sifreDialog.user;
    if (!kullanici) return;
    try {
      await authService.setSifre(kullanici.id, sifreDialog.sifre);
      setBilgi(`${kullanici.ad_soyad} için şifre güncellendi. Yeni şifreyi kullanıcıya iletin.`);
      setSifreDialog({ open: false, user: null, sifre: '' });
    } catch (err) {
      setError(hataMesaji(err, 'Şifre güncellenemedi'));
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await authService.approveUser(id);
      loadUsers();
    } catch {
      setError('Onaylama hatası');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await authService.rejectUser(id);
      loadUsers();
    } catch {
      setError('Reddetme hatası');
    }
  };

  const handleDelete = async () => {
    const kullanici = deleteDialog.user;
    if (!kullanici) return;
    try {
      await authService.deleteUser(kullanici.id);
      setDeleteDialog({ open: false, user: null });
      loadUsers();
    } catch (err) {
      setError(hataMesaji(err, 'Silme hatası'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          Kullanıcı Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => {
            setError('');
            setCreateDialog(true);
          }}
          sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#A61F1F' } }}
        >
          Kullanıcı / Yatırımcı Ekle
        </Button>
      </Box>
      {error && !sifreDialog.open && !createDialog && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {bilgi && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setBilgi('')}>
          {bilgi}
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        Personel yetkilerini (Motor Satış, Servis, Aksesuar, vb.) <strong>Yetkilendirme</strong> sayfasından ayarlayabilirsiniz.
      </Alert>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {users.map((user) => (
            <Paper key={user.id} sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {user.ad_soyad}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <RolEtiketi rol={user.rol} />
                  <OnayDamgasi durum={user.onay_durumu} />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {user.kullanici_adi}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                {user.onay_durumu === 'beklemede' && (
                  <>
                    <IslemDugmesi tur="onay" onClick={() => handleApprove(user.id)} />
                    <IslemDugmesi tur="carpi" onClick={() => handleReject(user.id)} />
                  </>
                )}
                <IslemDugmesi
                  tur="kilit"
                  onClick={() => {
                    setError('');
                    setBilgi('');
                    setSifreDialog({ open: true, user, sifre: '' });
                  }}
                />
                {user.rol !== 'admin' && <IslemDugmesi tur="sil" onClick={() => setDeleteDialog({ open: true, user })} />}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                {['Ad Soyad', 'Kullanıcı Adı', 'Rol', 'Durum', 'İşlemler'].map((h) => (
                  <TableCell key={h} sx={{ whiteSpace: 'nowrap', px: 1 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{user.ad_soyad}</TableCell>
                  <TableCell sx={{ fontFamily: FONT.mono, fontSize: 14 }}>{user.kullanici_adi}</TableCell>
                  <TableCell>
                    <RolEtiketi rol={user.rol} />
                  </TableCell>
                  <TableCell>
                    <OnayDamgasi durum={user.onay_durumu} />
                  </TableCell>
                  <TableCell>
                    {user.onay_durumu === 'beklemede' && (
                      <>
                        <IslemDugmesi tur="onay" onClick={() => handleApprove(user.id)} />
                        <IslemDugmesi tur="carpi" onClick={() => handleReject(user.id)} />
                      </>
                    )}
                    <IslemDugmesi
                      tur="kilit"
                      onClick={() => {
                        setError('');
                        setBilgi('');
                        setSifreDialog({ open: true, user, sifre: '' });
                      }}
                    />
                    {user.rol !== 'admin' && <IslemDugmesi tur="sil" onClick={() => setDeleteDialog({ open: true, user })} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })} fullScreen={isMobile}>
        <DialogTitle>Kullanıcı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteDialog.user?.ad_soyad}</strong> kullanıcısını silmek istediğinizden emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={sifreDialog.open} onClose={() => setSifreDialog({ open: false, user: null, sifre: '' })} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogBasligi ikon={<LockIcon />} baslik={'Şifre Sıfırla'} />
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography sx={{ mb: 2 }}>
            <strong>{sifreDialog.user?.ad_soyad}</strong> için yeni şifre belirleyin. Eski şifre görüntülenemez.
          </Typography>
          <TextField
            fullWidth
            label="Yeni şifre (en az 8 karakter)"
            type="password"
            autoComplete="new-password"
            value={sifreDialog.sifre}
            onChange={(e) => setSifreDialog({ ...sifreDialog, sifre: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSifreDialog({ open: false, user: null, sifre: '' })}>İptal</Button>
          <Button variant="contained" onClick={handleSifreSifirla}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogBasligi ikon={<PersonAddIcon2 />} baslik={'Yeni Kullanıcı / Yatırımcı Ekle'} />
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField select fullWidth label="Rol" value={createForm.rol} onChange={(e) => setCreateForm({ ...createForm, rol: e.target.value })}>
                <MenuItem value="yatirimci">Yatırımcı</MenuItem>
                <MenuItem value="personel">Personel</MenuItem>
                <MenuItem value="muhasebeci">Muhasebeci (sadece Belge Arşivi)</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Ad Soyad"
                value={createForm.ad_soyad}
                onChange={(e) => setCreateForm({ ...createForm, ad_soyad: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Kullanıcı Adı"
                value={createForm.kullanici_adi}
                onChange={(e) => setCreateForm({ ...createForm, kullanici_adi: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Şifre (en az 8 karakter)"
                type="password"
                autoComplete="new-password"
                value={createForm.sifre}
                onChange={(e) => setCreateForm({ ...createForm, sifre: e.target.value })}
                required
              />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            Yatırımcılar giriş yapınca sadece kendi motorlarını ve raporlarını görür. Personel yetkileri oluşturduktan sonra tabloda ve Yetkilendirme ekranında
            ayarlanabilir.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleCreate}>
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Kullanicilar;
