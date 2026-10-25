import { useOnay } from '../../../shared/ui';
import { hataMesaji } from '../../../shared/api/istemci';
import { ikinciElMotorService } from '../motorApi';
import { useMotorListesi, useYatirimcilar, useMotorYenile } from '../motorSorgulari';

// Veri gelene kadar her render'da yeni dizi üretilmesin
const BOS = [];

// Motor listesi (sunucudan), yatırımcı listesi (yalnızca admin) ve silme.
export const useMotorStok = ({ user }) => {
  const onay = useOnay();
  const liste = useMotorListesi();
  const yatirimcilar = useYatirimcilar({ etkin: user?.rol === 'admin' });
  const yenile = useMotorYenile();

  const handleDelete = async (id) => {
    if (!(await onay('Bu kaydı silmek istediğinizden emin misiniz?'))) return;
    try {
      await ikinciElMotorService.delete(id);
      yenile();
    } catch (err) {
      alert(hataMesaji(err, 'Hata'));
    }
  };

  return { motorlar: liste.data ?? BOS, yatirimcilar: yatirimcilar.data ?? BOS, yenile, sil: handleDelete };
};
