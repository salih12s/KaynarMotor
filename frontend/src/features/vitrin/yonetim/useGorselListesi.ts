import { useState, type ChangeEvent } from 'react';
import { resizeImage } from './gorselIsle';
import type { Bildir } from './tipler';

// Formdaki görsel listesi (base64 data URL; ilki kapak/vitrin fotoğrafı): ekleme, silme, kapak yapma, oklarla ve sürükleyerek
// sıralama. Vitrin ilan formu ve sıfır motor formu aynı listeyi (ve GorselYonetimi bileşenini) kullanır.
export const useGorselListesi = (bildir: Bildir) => {
  const [gorseller, setGorseller] = useState<string[]>([]);
  const [draggedGorselIndex, setDraggedGorselIndex] = useState<number | null>(null);

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    try {
      const resized = await Promise.all(files.map((f) => resizeImage(f)));
      setGorseller((prev) => [...prev, ...resized]);
    } catch {
      bildir('Görsel işlenemedi', 'error');
    }
    e.target.value = '';
  };

  const removeGorsel = (i: number) => setGorseller((prev) => prev.filter((_, idx) => idx !== i));
  const makeKapak = (i: number) =>
    setGorseller((prev) => {
      const arr = [...prev];
      const [g] = arr.splice(i, 1);
      arr.unshift(g);
      return arr;
    });

  const moveGorsel = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= gorseller.length || to >= gorseller.length) return;
    setGorseller((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const handleGorselDrop = (to: number) => {
    if (draggedGorselIndex !== null) moveGorsel(draggedGorselIndex, to);
    setDraggedGorselIndex(null);
  };

  return {
    gorseller,
    setGorseller,
    draggedGorselIndex,
    setDraggedGorselIndex,
    handleFiles,
    removeGorsel,
    makeKapak,
    moveGorsel,
    handleGorselDrop,
  };
};

export type GorselListesi = ReturnType<typeof useGorselListesi>;
