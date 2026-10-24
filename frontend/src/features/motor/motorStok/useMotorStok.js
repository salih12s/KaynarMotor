import { ikinciElMotorService } from '../motorApi';
import { useMotorListesi, useYatirimcilar, useMotorYenile } from '../motorSorgulari';

// Veri gelene kadar her render'da yeni dizi üretilmesin
const BOS = [];

// Motor listesi (sunucudan), yatırımcı listesi (yalnızca admin) ve silme.
export const useMotorStok = ({ user }) => {
  const liste = useMotorListesi();
  const yatirimcilar = useYatirimcilar({ etkin: user?.rol === 'admin' });
  const yenile = useMotorYenile();

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      await ikinciElMotorService.delete(id);
      yenile();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata');
    }
  };

  return { motorlar: liste.data ?? BOS, yatirimcilar: yatirimcilar.data ?? BOS, yenile, sil: handleDelete };
};
