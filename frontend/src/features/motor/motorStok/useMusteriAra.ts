import { useState } from 'react';
import { sonIstek } from '../../../shared/utils/sonIstek';
import type { Musteri } from '../../../shared/tipler';
import { musteriService } from '../../musteriler/musteriApi';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

// Müşteri adı otomatik tamamlama (form ve hızlı satış aynı öneri listesini paylaşır).
export const useMusteriAra = () => {
  const [musteriOptions, setMusteriOptions] = useState<Musteri[]>([]);

  const searchMusteri = async (query: string) => {
    if (!query || query.length < 2) {
      setMusteriOptions([]);
      return;
    }
    try {
      const res = await sonAra(musteriService.search(query));
      if (res) setMusteriOptions(res.data);
    } catch {
      setMusteriOptions([]);
    }
  };

  return { musteriOptions, searchMusteri };
};

export type MusteriAramasi = ReturnType<typeof useMusteriAra>;
