import { useState } from 'react';
import { sonIstek } from '../../../shared/utils/sonIstek';
import { musteriService } from '../../musteriler/musteriApi';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

// Müşteri adı otomatik tamamlama (form ve hızlı satış aynı öneri listesini paylaşır).
export const useMusteriAra = () => {
  const [musteriOptions, setMusteriOptions] = useState([]);

  const searchMusteri = async (query) => {
    if (!query || query.length < 2) { setMusteriOptions([]); return; }
    try { const res = await sonAra(musteriService.search(query)); if (res) setMusteriOptions(res.data); } catch { setMusteriOptions([]); }
  };

  return { musteriOptions, searchMusteri };
};
