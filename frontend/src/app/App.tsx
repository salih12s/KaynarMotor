import React, { lazy, Suspense, type ReactElement, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClientProvider } from '@tanstack/react-query';
import { OnayProvider } from '../shared/ui';
import { sorguIstemcisiOlustur } from '../shared/sorgu/sorguIstemcisi';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import type { Kullanici } from '../shared/tipler';
import { CustomThemeProvider, useCustomTheme } from './ThemeContext';
import { RENK } from './tokenlar';

// Rota bazlı kod bölme: vitrin ziyaretçisi yönetim panelinin kodunu indirmez. Her sayfa kendi parçasıdır; ortak kütüphaneler (MUI vb.) paylaşılan parçada kalır.
const Layout = lazy(() => import('./Layout'));
const Login = lazy(() => import('../features/auth/Login'));
const IsEmirleri = lazy(() => import('../features/servis/IsEmirleri'));
const Aksesuarlar = lazy(() => import('../features/aksesuar/Aksesuarlar'));
const AksesuarStok = lazy(() => import('../features/aksesuar/AksesuarStok'));
const IkinciElMotor = lazy(() => import('../features/motor/IkinciElMotor'));
const MotorStok = lazy(() => import('../features/motor/MotorStok'));
const ETicaret = lazy(() => import('../features/eticaret/ETicaret'));
const YedekParcalar = lazy(() => import('../features/yedek-parca/YedekParcalar'));
const YedekParcaStok = lazy(() => import('../features/yedek-parca/YedekParcaStok'));
const ServisGecmisi = lazy(() => import('../features/servis/ServisGecmisi'));
const Raporlar = lazy(() => import('../features/raporlar/Raporlar'));
const Kullanicilar = lazy(() => import('../features/auth/Kullanicilar'));
const Yetkilendirme = lazy(() => import('../features/auth/Yetkilendirme'));
const Musteriler = lazy(() => import('../features/musteriler/Musteriler'));
const Veresiye = lazy(() => import('../features/raporlar/Veresiye'));
const Vitrin = lazy(() => import('../features/vitrin/yonetim/Vitrin'));
const Storefront = lazy(() => import('../features/vitrin/magaza/Storefront'));
const StorefrontDetay = lazy(() => import('../features/vitrin/magaza/StorefrontDetay'));
const TaksitHesaplama = lazy(() => import('../features/taksit/TaksitHesaplama'));
const TaksitGoruntule = lazy(() => import('../features/taksit/TaksitGoruntule'));
const BelgeArsivi = lazy(() => import('../features/motor/BelgeArsivi'));

// Route Guards
type RotaProps = { children: ReactElement };

const ProtectedRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin') return <Navigate to="/" />;
  return children;
};

const AksesuarRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.aksesuar_yetkisi) return <Navigate to="/" />;
  return children;
};

const MotorSatisRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  // Muhasebeci: yalnızca admin "Motor Satış'ı görebilir" anahtarını açtıysa (salt-okunur)
  const muhasebeGorur = user.rol === 'muhasebeci' && !!user.motor_satis_gor;
  if (user.rol !== 'admin' && !user.motor_satis_yetkisi && !muhasebeGorur) return <Navigate to="/" />;
  return children;
};

// Motor Stok: admin, motor yetkisi olan personel veya yatırımcı erişebilir
const MotorStokRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'yatirimci' && !user.motor_satis_yetkisi) return <Navigate to="/" />;
  return children;
};

// Belge Arşivi: muhasebeci (tek sayfası) ve admin
const BelgeArsivRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'muhasebeci') return <Navigate to="/" />;
  return children;
};

// Raporlar: admin veya yatırımcı (yatırımcı sadece kendi raporunu görür)
const RaporRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'yatirimci') return <Navigate to="/" />;
  return children;
};

const EticaretRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.eticaret_yetkisi) return <Navigate to="/" />;
  return children;
};

const ServisRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.servis_yetkisi) return <Navigate to="/" />;
  return children;
};

const AksesuarStokRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.aksesuar_stok_yetkisi) return <Navigate to="/" />;
  return children;
};

// Vitrin: admin veya motor/aksesuar vitrin yetkisi olan personel
const VitrinRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.motor_vitrin_yetkisi && !user.aksesuar_vitrin_yetkisi) return <Navigate to="/" />;
  return children;
};

const YedekParcaRoute = ({ children }: RotaProps) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.yedek_parca_yetkisi) return <Navigate to="/" />;
  return children;
};

const PublicRoute = ({ children }: RotaProps) => {
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
const panelHedefi = (user: Kullanici): string | null => {
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
          background: RENK.kirmizi,
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
const PanelTema = ({ children }: { children?: ReactNode }) => {
  const { panelTheme } = useCustomTheme();
  return (
    <ThemeProvider theme={panelTheme}>
      <CssBaseline />
      <OnayProvider>{children}</OnayProvider>
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
          <Suspense fallback={null}>
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
                {/* Eski adresler (sayfaları kaldırıldı; işi listedeki pencereler görüyor): yer imi olan kullanıcı listeye düşer */}
                <Route path="/is-emri/*" element={<Navigate to="/servis" replace />} />
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
                <Route path="/motor/:id" element={<Navigate to="/ikinci-el-motor" replace />} />
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
          </Suspense>
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
