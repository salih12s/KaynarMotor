import { useState, useEffect } from 'react';
import { ikinciElMotorService } from '../motorApi';
import { authService } from '../../auth/authApi';

// Motor listesi (sunucudan), yatırımcı listesi (yalnızca admin) ve silme.
export const useMotorStok = ({ user }) => {
  const [motorlar, setMotorlar] = useState([]);
  const [yatirimcilar, setYatirimcilar] = useState([]);

  const loadData = async () => {
    try {
      const res = await ikinciElMotorService.getAll();
      setMotorlar(res.data);
    } catch {}
  };

  const loadYatirimcilar = async () => {
    try {
      const res = await authService.getYatirimcilar();
      setYatirimcilar(res.data);
    } catch {}
  };

  useEffect(() => {
    loadData();
    if (user?.rol === 'admin') loadYatirimcilar();
  }, []); // eslint-disable-line

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      await ikinciElMotorService.delete(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata');
    }
  };

  return { motorlar, yatirimcilar, yenile: loadData, sil: handleDelete };
};
