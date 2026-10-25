import { createTheme } from '@mui/material/styles';
import { RENK, TON, FONT } from './tokenlar';

// Chip renkleri damga (çerçeveli etiket) görünümüne çevrilir; durum etiketleri için ortak bileşen: shared/ui/Damga.
const chipRenk = (renk, ton) => ({
  props: { color: renk, variant: 'filled' },
  style: { backgroundColor: ton.bg, color: ton.fg, border: `1.5px solid ${ton.fg}` },
});

export const temaOlustur = ({ primary = RENK.kirmizi, secondary = RENK.murekkep } = {}) =>
  createTheme({
    palette: {
      primary: { main: primary, dark: RENK.kirmiziKoyu },
      secondary: { main: secondary },
      success: { main: RENK.yesil },
      info: { main: '#1E5FAE' },
      warning: { main: '#9A6200' },
      error: { main: '#B3261E' },
      background: { default: RENK.kagit, paper: RENK.yuzey },
      text: { primary: RENK.murekkep, secondary: RENK.soluk },
      divider: RENK.cizgi,
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: FONT.metin,
      h1: { fontFamily: FONT.baslik, fontWeight: 700 },
      h2: { fontFamily: FONT.baslik, fontWeight: 700 },
      h3: { fontFamily: FONT.baslik, fontWeight: 700 },
      h4: { fontFamily: FONT.baslik, fontWeight: 700 },
      h5: { fontFamily: FONT.baslik, fontWeight: 700, letterSpacing: 0 },
      h6: { fontFamily: FONT.baslik, fontWeight: 700, letterSpacing: 0 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontFamily: FONT.metin, fontWeight: 700, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: RENK.kagit, fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 5, fontWeight: 700, letterSpacing: 0 },
          sizeMedium: { minHeight: 40 },
          sizeLarge: { minHeight: 42, fontSize: '0.95rem' },
          containedPrimary: { '&:hover': { backgroundColor: RENK.kirmiziKoyu } },
          outlined: { borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius: 6, backgroundImage: 'none' },
          elevation1: { boxShadow: 'none', border: `1px solid ${RENK.cizgi}` },
          elevation2: { boxShadow: 'none', border: `1px solid ${RENK.cizgi}` },
          elevation3: { boxShadow: 'none', border: `1px solid ${RENK.cizgi}` },
        },
      },
      MuiCard: { styleOverrides: { root: { borderRadius: 6, boxShadow: 'none', border: `1px solid ${RENK.cizgi}` } } },
      MuiTableContainer: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px dashed ${RENK.cizgiKesik}` },
          head: {
            backgroundColor: RENK.yuzeyKoyu,
            color: RENK.soluk,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            borderBottom: `1.5px solid ${RENK.murekkep}`,
          },
        },
      },
      MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#F7F7F3' }, '&:last-child td': { borderBottom: 0 } } } },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 3, fontWeight: 700, letterSpacing: 0 }, label: { paddingLeft: 8, paddingRight: 8 } },
        variants: [
          chipRenk('success', TON.yesil),
          chipRenk('warning', TON.bekle),
          chipRenk('info', TON.mavi),
          chipRenk('error', TON.kirmizi),
          chipRenk('primary', TON.kirmizi),
          chipRenk('secondary', TON.gri),
        ],
      },
      // Etiket alanın üstünde durur (mockup'taki gibi); MUI'nin yüzen etiketi ve çentikli çerçevesi kapatılır.
      MuiInputLabel: {
        styleOverrides: {
          root: {
            position: 'static',
            transform: 'none',
            maxWidth: '100%',
            marginBottom: 4,
            fontSize: 12.5,
            fontWeight: 600,
            color: RENK.soluk,
            lineHeight: 1.3,
            '&.Mui-focused': { color: RENK.soluk },
            '&.Mui-error': { color: '#B3261E' },
            '& .MuiFormLabel-asterisk': { color: RENK.kirmizi },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 5,
            backgroundColor: RENK.yuzey,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: RENK.alanCizgi },
            '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: RENK.soluk },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: RENK.odak, borderWidth: 2 },
            '&.Mui-disabled': { backgroundColor: RENK.yuzeyKoyu },
          },
          notchedOutline: { top: 0 },
        },
      },
      MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2 } } },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, backgroundColor: RENK.murekkep },
          root: { minHeight: 44 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: RENK.soluk,
            minHeight: 44,
            '&.Mui-selected': { color: RENK.murekkep },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 56,
            height: 32,
            padding: 0,
            '& .MuiSwitch-switchBase': { padding: 3, '&.Mui-checked': { color: '#fff', transform: 'translateX(24px)' } },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: RENK.yesil, opacity: 1 },
            '& .MuiSwitch-track': { borderRadius: 16, backgroundColor: '#C9CCD1', opacity: 1 },
            '& .MuiSwitch-thumb': { boxShadow: 'none', width: 26, height: 26 },
          },
          sizeSmall: {
            width: 40,
            height: 24,
            '& .MuiSwitch-switchBase': { padding: 2, '&.Mui-checked': { transform: 'translateX(16px)' } },
            '& .MuiSwitch-thumb': { width: 20, height: 20 },
            '& .MuiSwitch-track': { borderRadius: 12 },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 5 },
          standardInfo: { backgroundColor: '#DCE6F4', color: '#1E3A66', '& .MuiAlert-icon': { color: '#1E5FAE' } },
          standardSuccess: { backgroundColor: '#D8EBDD', color: '#14502B', '& .MuiAlert-icon': { color: RENK.yesil } },
          standardWarning: { backgroundColor: '#F7E7C4', color: '#6B4100', '& .MuiAlert-icon': { color: '#9A6200' } },
          standardError: { backgroundColor: '#F6DAD7', color: '#7E1F19', '& .MuiAlert-icon': { color: '#B3261E' } },
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 8, boxShadow: '0 24px 60px rgba(10,12,16,.35)' } } },
      MuiDialogTitle: { styleOverrides: { root: { fontFamily: FONT.baslik, fontWeight: 700, fontSize: '1.65rem', lineHeight: 1.15, padding: '16px 24px' } } },
      MuiDialogContent: { styleOverrides: { root: { '.MuiDialogTitle-root + &': { paddingTop: 20 } } } },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            backgroundColor: RENK.yuzeyKoyu,
            borderTop: `1px solid ${RENK.cizgi}`,
            padding: '12px 24px',
            gap: 8,
            '& .MuiButton-text': { border: `1px solid ${RENK.kirmizi}`, backgroundColor: RENK.yuzey, '&:hover': { backgroundColor: '#FBEAE7' } },
          },
        },
      },
      MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: RENK.murekkep, fontSize: 12.5 } } },
      MuiDivider: { styleOverrides: { root: { borderColor: RENK.cizgi } } },
    },
  });
