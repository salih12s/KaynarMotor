import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Typography, Drawer, IconButton, Box, Collapse, useMediaQuery, useTheme, Avatar, ButtonBase } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import MotorIcon from '@mui/icons-material/TwoWheeler';
import ShopIcon from '@mui/icons-material/ShoppingCart';
import StokIcon from '@mui/icons-material/Inventory';
import StoreIcon from '@mui/icons-material/Store';
import SellIcon from '@mui/icons-material/Sell';
import ReportIcon from '@mui/icons-material/Assessment';
import AdminIcon from '@mui/icons-material/SupervisorAccount';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import VeresiyeIcon from '@mui/icons-material/AccountBalanceWallet';
import HomeIcon from '@mui/icons-material/Home';
import CalculateIcon from '@mui/icons-material/Calculate';
import FolderIcon from '@mui/icons-material/FolderCopy';
import PublicIcon from '@mui/icons-material/Public';
import GppGoodIcon from '@mui/icons-material/GppGood';
import { useAuth } from '../features/auth/AuthContext';
import { useCustomTheme } from './ThemeContext';
import { authService } from '../features/auth/authApi';
import { FONT, MENU_RENK, RENK } from './tokenlar';

const KENAR_GENISLIK = 216;
const MOBIL_GENISLIK = 300;

// Alt sekme çubuğunda (telefon) gösterilecek menü kodları, öncelik sırasıyla; yetkisi olan ilk 4 tanesi görünür.
const ALT_SEKME_SIRASI = ['servis', 'motor', 'raporlar', 'musteriler', 'aksesuar', 'eticaret', 'yedek', 'vitrin', 'veresiye'];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  // Alt menü açık/kapalı durumu grup başlığına göre ayrı ayrı tutulur
  const [openMenus, setOpenMenus] = useState({});
  const toggleMenu = (key) => setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  const { setDefaultTheme, setAksesuarTheme, setMotorTheme, setEticaretTheme, setYedekParcaTheme } = useCustomTheme();

  const pathname = location.pathname;

  useEffect(() => {
    if (pathname === '/aksesuarlar' || pathname === '/aksesuar-stok') {
      setAksesuarTheme();
    } else if (pathname === '/ikinci-el-motor' || pathname === '/motor-stok') {
      setMotorTheme();
    } else if (pathname === '/eticaret') {
      setEticaretTheme();
    } else if (pathname === '/yedek-parcalar' || pathname === '/yedek-parca-stok') {
      setYedekParcaTheme();
    } else {
      setDefaultTheme();
    }
  }, [pathname, setDefaultTheme, setAksesuarTheme, setMotorTheme, setEticaretTheme, setYedekParcaTheme]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const isAdmin = user?.rol === 'admin';
  const isYatirimci = user?.rol === 'yatirimci';
  const isMuhasebeci = user?.rol === 'muhasebeci';
  const hasAksesuar = user?.aksesuar_yetkisi;
  const hasMotor = user?.motor_satis_yetkisi;
  const muhasebeMotor = isMuhasebeci && !!user?.motor_satis_gor; // muhasebeci: salt-okunur Motor Satış
  const hasEticaret = user?.eticaret_yetkisi;
  const hasServis = user?.servis_yetkisi;
  const hasAksesuarStok = user?.aksesuar_stok_yetkisi;
  const hasYedekParca = user?.yedek_parca_yetkisi;
  const hasMotorVitrin = user?.motor_vitrin_yetkisi;
  const hasAksesuarVitrin = user?.aksesuar_vitrin_yetkisi;

  const getPageTitle = () => {
    if (pathname === '/servis') return 'Servis';
    if (pathname === '/vitrin') return 'Vitrin / Site';
    if (pathname === '/ikinci-el-motor') return 'Motor Satış';
    if (pathname === '/motor-stok') return 'Motor Stok';
    if (pathname === '/aksesuarlar') return 'Aksesuarlar';
    if (pathname === '/aksesuar-stok') return 'Aksesuar Stok';
    if (pathname === '/eticaret') return 'E-Ticaret';
    if (pathname === '/yedek-parcalar') return 'Yedek Parça';
    if (pathname === '/yedek-parca-stok') return 'Yedek Parça Stok';
    if (pathname === '/taksit-hesaplama') return 'Taksit Hesaplama';
    if (pathname === '/belge-arsivi') return 'Belge Arşivi';
    if (pathname === '/veresiye') return 'Veresiye';
    if (pathname === '/raporlar') return 'Raporlar';
    if (pathname === '/musteriler') return 'Müşteriler';
    if (pathname === '/kullanicilar') return 'Kullanıcılar';
    if (pathname === '/yetkilendirme') return 'Yetkilendirme';
    if (pathname.startsWith('/is-emri/') && pathname.includes('duzenle')) return 'İş Emri Düzenle';
    if (pathname === '/is-emri/yeni') return 'Yeni İş Emri';
    if (pathname.startsWith('/is-emri/')) return 'İş Emri Detay';
    return '';
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

  const menuItems = [
    {
      title: 'Motorsiklet',
      icon: <MotorIcon />,
      kod: 'motor',
      show: isAdmin || hasMotor || isYatirimci || muhasebeMotor,
      key: 'motor',
      subItems: [
        ...(isAdmin || hasMotor || muhasebeMotor ? [{ title: 'Motor Satış', path: '/ikinci-el-motor', icon: <SellIcon /> }] : []),
        ...(!muhasebeMotor ? [{ title: isYatirimci ? 'Motorlarım' : 'Motor Stok', path: '/motor-stok', icon: <StokIcon /> }] : []),
      ],
    },
    { title: 'Servis', path: '/servis', icon: <BuildIcon />, show: isAdmin || hasServis, kod: 'servis' },
    {
      title: 'Aksesuarlar',
      icon: <ShopIcon />,
      kod: 'aksesuar',
      show: isAdmin || hasAksesuar || hasAksesuarStok,
      subItems: [
        ...(isAdmin || hasAksesuar ? [{ title: 'Aksesuar Satış', path: '/aksesuarlar', icon: <SellIcon /> }] : []),
        ...(isAdmin || hasAksesuarStok ? [{ title: 'Aksesuar Stok', path: '/aksesuar-stok', icon: <StokIcon /> }] : []),
      ],
    },
    { title: 'E-Ticaret', path: '/eticaret', icon: <StoreIcon />, show: isAdmin || hasEticaret, kod: 'eticaret' },
    { title: 'Taksit Hesaplama', path: '/taksit-hesaplama', icon: <CalculateIcon />, show: !isYatirimci && !isMuhasebeci, kod: 'taksit' },
    {
      title: 'Yedek Parça',
      icon: <SettingsIcon />,
      kod: 'yedek',
      show: isAdmin || hasYedekParca,
      subItems: [
        { title: 'Yedek Parça Satış', path: '/yedek-parcalar', icon: <SellIcon /> },
        { title: 'Yedek Parça Stok', path: '/yedek-parca-stok', icon: <StokIcon /> },
      ],
    },
    { title: 'Vitrin / Site', path: '/vitrin', icon: <PublicIcon />, show: isAdmin || hasMotorVitrin || hasAksesuarVitrin, kod: 'vitrin' },
    { title: 'Veresiye', path: '/veresiye', icon: <VeresiyeIcon />, show: isAdmin, kod: 'veresiye' },
    { title: isYatirimci ? 'Raporum' : 'Raporlar', path: '/raporlar', icon: <ReportIcon />, show: isAdmin || isYatirimci, kod: 'raporlar' },
    { title: 'Müşteriler', path: '/musteriler', icon: <PeopleIcon />, show: isAdmin, kod: 'musteriler' },
    { title: 'Belge Arşivi', path: '/belge-arsivi', icon: <FolderIcon />, show: isAdmin || isMuhasebeci, kod: 'belge' },
    { title: 'Kullanıcılar', path: '/kullanicilar', icon: <AdminIcon />, show: isAdmin, kod: 'kullanicilar' },
    { title: 'Yetkilendirme', path: '/yetkilendirme', icon: <GppGoodIcon />, show: isAdmin, kod: 'yetki' },
  ];
  const anaSayfa = { title: 'Ana Sayfaya Git', path: '/site', icon: <HomeIcon />, show: !isMuhasebeci, kod: 'ana' };
  const gorunenler = menuItems.filter((item) => item.show);

  const isActive = (path) => pathname === path;
  const isSubActive = (item) => item.subItems?.some((s) => pathname === s.path);
  const hedefYol = (item) => item.path || item.subItems?.[0]?.path;

  // Ortak satır görünümü: renkli simge + ad; seçili satır açık yüzey rengi ve ince çerçeve alır.
  const satirStili = (aktif, ic = false) => ({
    display: 'flex',
    alignItems: 'center',
    gap: ic ? 1.25 : 1.5,
    width: '100%',
    minHeight: ic ? 34 : 40,
    px: 1.5,
    pl: ic ? 5 : 1.5,
    borderRadius: '6px',
    justifyContent: 'flex-start',
    textAlign: 'left',
    color: aktif ? RENK.murekkep : '#3C4046',
    fontFamily: FONT.metin,
    fontSize: ic ? 14 : 15,
    fontWeight: aktif ? 700 : 500,
    bgcolor: aktif ? RENK.yuzey : 'transparent',
    boxShadow: aktif ? `0 0 0 1px ${RENK.cizgi}` : 'none',
    '&:hover': { bgcolor: aktif ? RENK.yuzey : 'rgba(22,24,28,.06)' },
    '& svg': { fontSize: ic ? 17 : 20 },
  });
  const ikonKutusu = (kod, ic = false) => ({ display: 'inline-flex', color: MENU_RENK[kod], opacity: ic ? 0.9 : 1, flex: 'none' });

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: RENK.kenarMenu, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2, flexShrink: 0 }}>
        <img src="/kaynar-logo.png" alt="Kaynar Motor" style={{ display: 'block', width: 150, height: 'auto' }} />
      </Box>
      <Box
        component="nav"
        aria-label="Ana gezinme"
        sx={{
          flex: 1,
          px: 1.5,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(22,24,28,.2)', borderRadius: 3 },
        }}
      >
        {gorunenler.map((item) =>
          item.subItems ? (
            <React.Fragment key={item.kod}>
              <ButtonBase onClick={() => toggleMenu(item.key || item.title)} sx={satirStili(false)} aria-expanded={!!openMenus[item.key || item.title]}>
                <Box component="span" sx={ikonKutusu(item.kod)}>
                  {item.icon}
                </Box>
                <Box component="span" sx={{ flex: 1, fontWeight: isSubActive(item) ? 700 : 500, color: RENK.murekkep }}>
                  {item.title}
                </Box>
                <Box component="span" sx={{ display: 'inline-flex', opacity: 0.6 }}>
                  {openMenus[item.key || item.title] ? <ExpandLess /> : <ExpandMore />}
                </Box>
              </ButtonBase>
              <Collapse in={!!openMenus[item.key || item.title]} timeout="auto" unmountOnExit>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', pb: 0.5 }}>
                  {item.subItems.map((sub) => (
                    <ButtonBase key={sub.path} onClick={() => handleNavigate(sub.path)} sx={satirStili(isActive(sub.path), true)}>
                      <Box component="span" sx={ikonKutusu(item.kod, true)}>
                        {sub.icon}
                      </Box>
                      {sub.title}
                    </ButtonBase>
                  ))}
                </Box>
              </Collapse>
            </React.Fragment>
          ) : (
            <ButtonBase key={item.kod} onClick={() => handleNavigate(item.path)} sx={satirStili(isActive(item.path))}>
              <Box component="span" sx={ikonKutusu(item.kod)}>
                {item.icon}
              </Box>
              {item.title}
            </ButtonBase>
          ),
        )}
      </Box>
      <Box sx={{ px: 1.5, pb: 2, pt: 1, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {anaSayfa.show && (
          <ButtonBase onClick={() => handleNavigate(anaSayfa.path)} sx={satirStili(false)}>
            <Box component="span" sx={ikonKutusu(anaSayfa.kod)}>
              {anaSayfa.icon}
            </Box>
            {anaSayfa.title}
          </ButtonBase>
        )}
        {isMobile && (
          <ButtonBase onClick={handleLogout} sx={satirStili(false)}>
            <Box component="span" sx={{ display: 'inline-flex', color: '#B3261E' }}>
              <LogoutIcon />
            </Box>
            Çıkış Yap
          </ButtonBase>
        )}
      </Box>
    </Box>
  );

  // Telefon alt sekmeleri: yetkisi olan ilk dört bölüm + Menü
  const altSekmeler = ALT_SEKME_SIRASI.map((kod) => gorunenler.find((m) => m.kod === kod))
    .filter(Boolean)
    .slice(0, 4);
  const altSekmeAktif = (item) => (item.subItems ? isSubActive(item) : isActive(item.path));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: MOBIL_GENISLIK, maxWidth: '86vw', border: 'none', borderRadius: 0 } }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: KENAR_GENISLIK,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: KENAR_GENISLIK, border: 'none', borderRight: `1px solid ${RENK.cizgi}`, borderRadius: 0 },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: RENK.kagit, width: isMobile ? '100%' : `calc(100% - ${KENAR_GENISLIK}px)`, pb: isMobile ? 9 : 0 }}
      >
        {/* Sayfa başlığı */}
        {isMobile ? (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.75,
              py: 1.25,
              bgcolor: RENK.kenarMenu,
              borderBottom: `1px solid ${RENK.cizgi}`,
            }}
          >
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Menüyü aç"
              sx={{
                width: 38,
                height: 38,
                borderRadius: '6px',
                bgcolor: RENK.yuzey,
                border: `1px solid ${RENK.cizgi}`,
                color: RENK.murekkep,
                '&:hover': { bgcolor: RENK.yuzey },
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography component="h1" noWrap sx={{ flex: 1, fontFamily: FONT.baslik, fontWeight: 700, fontSize: 26, lineHeight: 1.1 }}>
              {getPageTitle()}
            </Typography>
            <Avatar sx={{ width: 32, height: 32, bgcolor: RENK.murekkep, fontSize: 14, fontWeight: 700 }}>{user?.ad_soyad?.charAt(0) || 'U'}</Avatar>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', px: 3.5, pt: 3, pb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 46, lineHeight: 1 }}>
                {getPageTitle()}
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: 14, color: RENK.soluk }}>{dateStr}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{user?.ad_soyad}</Typography>
              <Avatar sx={{ width: 36, height: 36, bgcolor: RENK.murekkep, fontSize: 15, fontWeight: 700 }}>{user?.ad_soyad?.charAt(0) || 'U'}</Avatar>
              <IconButton onClick={handleLogout} size="small" aria-label="Çıkış yap" title="Çıkış Yap" sx={{ color: RENK.soluk }}>
                <LogoutIcon />
              </IconButton>
            </Box>
          </Box>
        )}

        <Box sx={{ px: { xs: 1.75, md: 3.5 }, pt: { xs: 1.75, md: 1.5 }, pb: { xs: 2, md: 5 } }}>
          <Outlet />
        </Box>
      </Box>

      {isMobile && (
        <Box
          component="nav"
          aria-label="Alt sekmeler"
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: 66,
            zIndex: 25,
            display: 'grid',
            gridTemplateColumns: `repeat(${altSekmeler.length + 1}, 1fr)`,
            bgcolor: RENK.kenarMenu,
            borderTop: `1px solid ${RENK.cizgi}`,
          }}
        >
          {altSekmeler.map((item) => (
            <ButtonBase
              key={item.kod}
              onClick={() => handleNavigate(hedefYol(item))}
              sx={{
                flexDirection: 'column',
                gap: '3px',
                fontSize: 12,
                fontWeight: altSekmeAktif(item) ? 700 : 500,
                color: RENK.murekkep,
                fontFamily: FONT.metin,
              }}
            >
              <Box component="span" sx={{ display: 'inline-flex', color: MENU_RENK[item.kod], '& svg': { fontSize: 22 } }}>
                {item.icon}
              </Box>
              {item.title === 'Motorsiklet' ? 'Motor' : item.title === 'Müşteriler' ? 'Müşteriler' : item.title.split(' ')[0]}
            </ButtonBase>
          ))}
          <ButtonBase
            onClick={() => setMobileOpen(true)}
            sx={{ flexDirection: 'column', gap: '3px', fontSize: 12, fontWeight: 500, color: RENK.murekkep, fontFamily: FONT.metin }}
          >
            <Box component="span" sx={{ display: 'inline-flex', '& svg': { fontSize: 22 } }}>
              <MenuIcon />
            </Box>
            Menü
          </ButtonBase>
        </Box>
      )}
    </Box>
  );
};

export default Layout;
