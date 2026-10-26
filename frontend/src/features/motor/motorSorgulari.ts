import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ikinciElMotorService, sifirMotorService } from './motorApi';
import { authService } from '../auth/authApi';

/*
 * Motor ekranlarının (Motor Stok, İkinci El satışlar) ORTAK sunucu verisi.
 * İki ekran aynı anahtarları kullanır: birinde yapılan değişiklik (kayıt, satış, silme) `yenile` ile ikisini birden tazeler,
 * ekranlar arası geçişte liste önbellekten anında görünür.
 */
export const motorAnahtari = {
  hepsi: ['motorlar'],
  liste: ['motorlar', 'liste'],
  istatistik: ['motorlar', 'istatistik'],
  // Sıfır stok "motorlar" altında: satış eklenince/silinince satılan sayaçları da tazelensin
  sifir: ['motorlar', 'sifir'],
  yatirimcilar: ['yatirimcilar'],
};

// Tüm ikinci el motor kayıtları. Sayfa her açılışta tazelenir: başka ekrandaki değişiklik 30 sn beklemeden görünür.
export const useMotorListesi = () =>
  useQuery({
    queryKey: motorAnahtari.liste,
    queryFn: async () => (await ikinciElMotorService.getAll()).data,
    refetchOnMount: 'always',
  });

// Satış sayaçları (toplam satış, kâr...). Liste ile aynı kural: her açılışta tazelenir, `yenile` ile birlikte geçersiz olur.
export const useMotorIstatistik = () =>
  useQuery({
    queryKey: motorAnahtari.istatistik,
    queryFn: async () => (await ikinciElMotorService.getStats()).data,
    refetchOnMount: 'always',
  });

// Sıfır motor stoğu (model listesi). `etkin` false ise istenmez (yatırımcıya kapalı uç).
export const useSifirMotorlar = ({ etkin = true } = {}) =>
  useQuery({
    queryKey: motorAnahtari.sifir,
    queryFn: async () => (await sifirMotorService.getAll()).data,
    enabled: etkin,
    refetchOnMount: 'always',
    retry: false,
  });

// Yatırımcılar (uç yalnızca admin'e açık). `etkin` false ise hiç istenmez; yetkisiz kullanıcıda 403'ü yeniden denemez.
export const useYatirimcilar = ({ etkin = true } = {}) =>
  useQuery({
    queryKey: motorAnahtari.yatirimcilar,
    queryFn: async () => (await authService.getYatirimcilar()).data,
    enabled: etkin,
    retry: false,
  });

// Motor verisini (liste ve istatistik) geçersiz kılar: açık olan ekranlar yeniden çeker.
export const useMotorYenile = () => {
  const istemci = useQueryClient();
  return () => istemci.invalidateQueries({ queryKey: motorAnahtari.hepsi });
};
