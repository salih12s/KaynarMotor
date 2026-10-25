import React, { createContext, useState, useContext, useMemo, type ReactNode } from 'react';
import { createTheme, type Theme } from '@mui/material/styles';
import { temaOlustur } from './tema';

export type TemaAdi = 'default' | 'aksesuar' | 'motor' | 'eticaret' | 'yedekParca';

interface TemaAyari {
  primary: string;
  secondary: string;
  name: string;
}

interface TemaDegeri {
  /** Vitrin ve müşteriye açık sayfaların (eski) teması. */
  theme: Theme;
  /** Yönetim paneli teması (Servis Defteri). */
  panelTheme: Theme;
  currentTheme: TemaAdi;
  themeConfigs: Record<TemaAdi, TemaAyari>;
  setDefaultTheme: () => void;
  setAksesuarTheme: () => void;
  setMotorTheme: () => void;
  setEticaretTheme: () => void;
  setYedekParcaTheme: () => void;
}

const ThemeContext = createContext<TemaDegeri | null>(null);

const themeConfigs: Record<TemaAdi, TemaAyari> = {
  default: { primary: '#C62828', secondary: '#1a1a1a', name: 'Servis' },
  aksesuar: { primary: '#C62828', secondary: '#1a1a1a', name: 'Aksesuar' },
  motor: { primary: '#C62828', secondary: '#1a1a1a', name: '2. El Motor' },
  eticaret: { primary: '#C62828', secondary: '#1a1a1a', name: 'E-Ticaret' },
  yedekParca: { primary: '#C62828', secondary: '#1a1a1a', name: 'Yedek Parça' },
};

export const CustomThemeProvider = ({ children }: { children?: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<TemaAdi>('default');

  const setDefaultTheme = () => setCurrentTheme('default');
  const setAksesuarTheme = () => setCurrentTheme('aksesuar');
  const setMotorTheme = () => setCurrentTheme('motor');
  const setEticaretTheme = () => setCurrentTheme('eticaret');
  const setYedekParcaTheme = () => setCurrentTheme('yedekParca');

  const theme = useMemo(() => {
    const config = themeConfigs[currentTheme] || themeConfigs.default;
    return createTheme({
      palette: {
        primary: { main: config.primary },
        secondary: { main: config.secondary },
      },
      typography: {
        fontFamily: '"Roboto", "Segoe UI", sans-serif',
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: { textTransform: 'none', borderRadius: 8 },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: { borderRadius: 12 },
          },
        },
      },
    });
  }, [currentTheme]);

  // Yönetim paneli (Servis Defteri tasarımı). Vitrin ve müşteriye açık sayfalar `theme` ile (eski) kalır.
  const panelTheme = useMemo(() => {
    const config = themeConfigs[currentTheme] || themeConfigs.default;
    return temaOlustur({ primary: config.primary, secondary: config.secondary });
  }, [currentTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        panelTheme,
        currentTheme,
        themeConfigs,
        setDefaultTheme,
        setAksesuarTheme,
        setMotorTheme,
        setEticaretTheme,
        setYedekParcaTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = (): TemaDegeri => {
  const deger = useContext(ThemeContext);
  if (!deger) throw new Error('useCustomTheme, CustomThemeProvider içinde kullanılmalı');
  return deger;
};
export default ThemeContext;
