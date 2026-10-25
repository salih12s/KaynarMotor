import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClientProvider } from '@tanstack/react-query';
import { sorguIstemcisiOlustur } from '../shared/sorgu/sorguIstemcisi';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { CustomThemeProvider, useCustomTheme } from './ThemeContext';

import Layout from './Layout';
import Login from '../features/auth/Login';
import IsEmirleri from '../features/servis/IsEmirleri';
import IsEmriForm from '../features/servis/IsEmriForm';
import IsEmriDetay from '../features/servis/IsEmriDetay';
import Aksesuarlar from '../features/aksesuar/Aksesuarlar';
import AksesuarStok from '../features/aksesuar/AksesuarStok';
import IkinciElMotor from '../features/motor/IkinciElMotor';
import MotorStok from '../features/motor/MotorStok';
import ETicaret from '../features/eticaret/ETicaret';
import YedekParcalar from '../features/yedek-parca/YedekParcalar';
import YedekParcaStok from '../features/yedek-parca/YedekParcaStok';
import ServisGecmisi from '../features/servis/ServisGecmisi';
import Raporlar from '../features/raporlar/Raporlar';
import Kullanicilar from '../features/auth/Kullanicilar';
import Yetkilendirme from '../features/auth/Yetkilendirme';
import Musteriler from '../features/musteriler/Musteriler';
import MotorDetay from '../features/motor/MotorDetay';
import Veresiye from '../features/raporlar/Veresiye';
import Vitrin from '../features/vitrin/yonetim/Vitrin';
import Storefront from '../features/vitrin/magaza/Storefront';
import StorefrontDetay from '../features/vitrin/magaza/StorefrontDetay';
import TaksitHesaplama from '../features/taksit/TaksitHesaplama';
import TaksitGoruntule from '../features/taksit/TaksitGoruntule';
import BelgeArsivi from '../features/motor/BelgeArsivi';

// Route Guards
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin') return <Navigate to="/" />;
  return children;
};

const AksesuarRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.aksesuar_yetkisi) return <Navigate to="/" />;
  return children;
};

const MotorSatisRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  // Muhasebeci: yalnızca admin "Motor Satış'ı görebilir" anahtarını açtıysa (salt-okunur)
  const muhasebeGorur = user.rol === 'muhasebeci' && !!user.motor_satis_gor;
  if (user.rol !== 'admin' && !user.motor_satis_yetkisi && !muhasebeGorur) return <Navigate to="/" />;
  return children;
};

// Motor Stok: admin, motor yetkisi olan personel veya yatırımcı erişebilir
const MotorStokRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'yatirimci' && !user.motor_satis_yetkisi) return <Navigate to="/" />;
  return children;
};

// Belge Arşivi: muhasebeci (tek sayfası) ve admin
const BelgeArsivRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'muhasebeci') return <Navigate to="/" />;
  return children;
};

// Raporlar: admin veya yatırımcı (yatırımcı sadece kendi raporunu görür)
const RaporRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'yatirimci') return <Navigate to="/" />;
  return children;
};

const EticaretRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.eticaret_yetkisi) return <Navigate to="/" />;
  return children;
};

const ServisRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.servis_yetkisi) return <Navigate to="/" />;
  return children;
};

const AksesuarStokRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.aksesuar_stok_yetkisi) return <Navigate to="/" />;
  return children;
};

// Vitrin: admin veya motor/aksesuar vitrin yetkisi olan personel
const VitrinRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.motor_vitrin_yetkisi && !user.aksesuar_vitrin_yetkisi) return <Navigate to="/" />;
  return children;
};

const YedekParcaRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.yedek_parca_yetkisi) return <Navigate to="/" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.rol === 'admin') return <Navigate to="/" />;
    if (user.rol === 'yatirimci') return <Navigate to="/motor-stok" />;
    if (user.rol === 'muhasebeci') return <Navigate to="/belge-arsivi" />;
    if (user.servis_yetkisi) return <Navigate to="/" />;
    if (user.aksesuar_yetkisi) return <Navigate to="/aksesuarlar" />;
    if (user.motor_satis_yetkisi) return <Navigate to="/ikinci-el-motor" />;
    if (user.eticaret_yetkisi) return <Navigate to="/eticaret" />;
    if (user.aksesuar_stok_yetkisi) return <Navigate to="/aksesuar-stok" />;
    if (user.yedek_parca_yetkisi) return <Navigate to="/yedek-parcalar" />;
    if (user.motor_vitrin_yetkisi || user.aksesuar_vitrin_yetkisi) return <Navigate to="/vitrin" />;
    return <Navigate to="/" />;
  }
  return children;
};

// Giriş yapmış kullanıcıyı rolüne göre uygun panele yönlendiren hedef
const panelHedefi = (user) => {
  if (user.rol === 'admin') return '/servis';
  if (user.rol === 'yatirimci') return '/motor-stok';
  if (user.rol === 'muhasebeci') return '/belge-arsivi';
  if (user.servis_yetkisi) return '/servis';
  if (user.aksesuar_yetkisi) return '/aksesuarlar';
  if (user.motor_satis_yetkisi) return '/ikinci-el-motor';
  if (user.eticaret_yetkisi) return '/eticaret';
  if (user.aksesuar_stok_yetkisi) return '/aksesuar-stok';
  if (user.yedek_parca_yetkisi) return '/yedek-parcalar';
  if (user.motor_vitrin_yetkisi || user.aksesuar_vitrin_yetkisi) return '/vitrin';
  return null; // Hiçbir yetki yok — yönlendirme döngüsünü önlemek için null
};

// Hiçbir modül yetkisi olmayan kullanıcıya gösterilen ekran (sonsuz yönlendirme döngüsünü engeller)
const YetkisizEkran = () => {
  const { user, logout } = useAuth();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: '#1a1a1a',
        color: '#fff',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <img
        src="/KaynarMotor.png"
        alt="Kaynar Motor"
        width="80"
        height="89"
        style={{ width: 80, height: 89, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
      />
      <h2 style={{ margin: 0 }}>Merhaba {user?.ad_soyad || ''}</h2>
      <p style={{ margin: 0, opacity: 0.8, maxWidth: 360 }}>Hesabınıza henüz bir yetki tanımlanmamış. Lütfen yönetici ile iletişime geçin.</p>
      <button
        onClick={() => logout()}
        style={{
          padding: '10px 26px',
          background: '#C62828',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Çıkış Yap
      </button>
    </div>
  );
};

// Kök adres (/): ziyaretçi vitrini görür, giriş yapan kullanıcı panele yönlenir
const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Storefront />;
  const hedef = panelHedefi(user);
  if (!hedef) return <YetkisizEkran />; // yetkisiz kullanıcı: döngü yerine bilgi ekranı
  return <Navigate to={hedef} />;
};

// Yönetim paneli ve giriş ekranı yeni tasarımla (Servis Defteri) çizilir; vitrin ve müşteriye açık sayfalar eski temada kalır.
const PanelTema = ({ children }) => {
  const { panelTheme } = useCustomTheme();
  return (
    <ThemeProvider theme={panelTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

const ThemedApp = () => {
  const { theme } = useCustomTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <PanelTema>
                    <Login />
                  </PanelTema>
                </PublicRoute>
              }
            />
            <Route path="/" element={<RootRoute />} />
            {/* Giriş yapmış kullanıcıların da panelden dönebilmesi için herkese açık vitrin */}
            <Route path="/site" element={<Storefront />} />
            <Route path="/ilan/:id" element={<StorefrontDetay />} />
            {/* Müşteriye gönderilen taksit linki — herkese açık */}
            <Route path="/taksit/:fiyat" element={<TaksitGoruntule />} />
            {/* Motor üzerindeki QR koddan açılan servis geçmişi — herkese açık, sadece o plakanın geçmişi */}
            <Route path="/s/:token" element={<ServisGecmisi />} />
            <Route
              element={
                <ProtectedRoute>
                  <PanelTema>
                    <Layout />
                  </PanelTema>
                </ProtectedRoute>
              }
            >
              <Route
                path="/servis"
                element={
                  <ServisRoute>
                    <IsEmirleri />
                  </ServisRoute>
                }
              />
              <Route
                path="/vitrin"
                element={
                  <VitrinRoute>
                    <Vitrin />
                  </VitrinRoute>
                }
              />
              <Route
                path="/is-emri/yeni"
                element={
                  <ServisRoute>
                    <IsEmriForm />
                  </ServisRoute>
                }
              />
              <Route
                path="/is-emri/:id"
                element={
                  <ServisRoute>
                    <IsEmriDetay />
                  </ServisRoute>
                }
              />
              <Route
                path="/is-emri/:id/duzenle"
                element={
                  <ServisRoute>
                    <IsEmriForm />
                  </ServisRoute>
                }
              />
              <Route
                path="/aksesuarlar"
                element={
                  <AksesuarRoute>
                    <Aksesuarlar />
                  </AksesuarRoute>
                }
              />
              <Route
                path="/aksesuar-stok"
                element={
                  <AksesuarStokRoute>
                    <AksesuarStok />
                  </AksesuarStokRoute>
                }
              />
              <Route
                path="/ikinci-el-motor"
                element={
                  <MotorSatisRoute>
                    <IkinciElMotor />
                  </MotorSatisRoute>
                }
              />
              <Route
                path="/motor-stok"
                element={
                  <MotorStokRoute>
                    <MotorStok />
                  </MotorStokRoute>
                }
              />
              <Route
                path="/motor/:id"
                element={
                  <MotorSatisRoute>
                    <MotorDetay />
                  </MotorSatisRoute>
                }
              />
              <Route
                path="/belge-arsivi"
                element={
                  <BelgeArsivRoute>
                    <BelgeArsivi />
                  </BelgeArsivRoute>
                }
              />
              <Route
                path="/eticaret"
                element={
                  <EticaretRoute>
                    <ETicaret />
                  </EticaretRoute>
                }
              />
              <Route
                path="/yedek-parcalar"
                element={
                  <YedekParcaRoute>
                    <YedekParcalar />
                  </YedekParcaRoute>
                }
              />
              <Route
                path="/yedek-parca-stok"
                element={
                  <YedekParcaRoute>
                    <YedekParcaStok />
                  </YedekParcaRoute>
                }
              />
              <Route path="/taksit-hesaplama" element={<TaksitHesaplama />} />
              <Route
                path="/veresiye"
                element={
                  <AdminRoute>
                    <Veresiye />
                  </AdminRoute>
                }
              />
              <Route
                path="/raporlar"
                element={
                  <RaporRoute>
                    <Raporlar />
                  </RaporRoute>
                }
              />
              <Route
                path="/kullanicilar"
                element={
                  <AdminRoute>
                    <Kullanicilar />
                  </AdminRoute>
                }
              />
              <Route
                path="/yetkilendirme"
                element={
                  <AdminRoute>
                    <Yetkilendirme />
                  </AdminRoute>
                }
              />
              <Route
                path="/musteriler"
                element={
                  <AdminRoute>
                    <Musteriler />
                  </AdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

// Uygulama boyunca tek önbellek (render dışında kurulur: her render'da sıfırlanmasın)
const sorguIstemcisi = sorguIstemcisiOlustur();

function App() {
  return (
    <QueryClientProvider client={sorguIstemcisi}>
      <CustomThemeProvider>
        <ThemedApp />
      </CustomThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
