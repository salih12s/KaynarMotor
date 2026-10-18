import { useState, useEffect, useCallback, useMemo } from 'react';
import { vitrinService } from '../vitrinApi';
import { ilanAramaUygunMu } from '../ilanArama';

// İlan listesi: sunucudan yükleme, yayında/arşiv görünümü, arama, sıralama (sayı kutusu, ok, sürükle) ve yayın/silme işlemleri.
export const useIlanListesi = ({ kategori, isAdmin, bildir }) => {
  const [urunler, setUrunler] = useState([]);
  const [gorunum, setGorunum] = useState('aktif'); // 'aktif' = yayındakiler, 'arsiv' = yayından kaldırılanlar
  const [arama, setArama] = useState('');
  const [loading, setLoading] = useState(false);
  const [draggedUrunId, setDraggedUrunId] = useState(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [siraTaslaklari, setSiraTaslaklari] = useState({});
  const [siraSavingId, setSiraSavingId] = useState(null);
  const [yayinSavingId, setYayinSavingId] = useState(null);

  // Yayındaki ilanlar sıralanabilir; yayından kaldırılanlar arşivde toplanır (sunucu sırasını korur)
  const aktifler = useMemo(() => urunler.filter(u => u.yayinda), [urunler]);
  const arsivdekiler = useMemo(() => urunler.filter(u => !u.yayinda), [urunler]);
  const arsivGorunumu = gorunum === 'arsiv';
  const gorunenListe = arsivGorunumu ? arsivdekiler : aktifler;
  const digerListe = arsivGorunumu ? aktifler : arsivdekiler;
  const aramaVar = arama.trim() !== '';
  const filtrelenmis = useMemo(
    () => (aramaVar ? gorunenListe.filter(u => ilanAramaUygunMu(u, arama)) : gorunenListe),
    [gorunenListe, arama, aramaVar]
  );
  const digerSonuc = aramaVar ? digerListe.filter(u => ilanAramaUygunMu(u, arama)).length : 0;
  // Arama açıkken liste kısaldığı için "bir yukarı/aşağı" ve sürükle-bırak güvenle yapılamaz
  const siraDegistirilebilir = !arsivGorunumu && !aramaVar;
  // Kartın üstündeki sıra numarası: aramadan bağımsız, yayındaki listedeki gerçek konum
  const siraMap = useMemo(() => new Map(aktifler.map((u, i) => [u.id, i])), [aktifler]);

  const loadUrunler = useCallback(async (sessiz = false) => {
    if (!sessiz) setLoading(true);
    try {
      const res = await vitrinService.getAllAdmin({ kategori });
      setUrunler(res.data);
    } catch { bildir('Ürünler yüklenemedi', 'error'); }
    setLoading(false);
  }, [kategori]);

  useEffect(() => { loadUrunler(); }, [loadUrunler]);
  useEffect(() => {
    setSiraTaslaklari(Object.fromEntries(aktifler.map((urun, index) => [urun.id, String(index + 1)])));
  }, [aktifler]);

  // siraliUrunler: yayındaki ilanların yeni sırası (arşivdekiler listenin sonunda aynen kalır)
  const saveUrunSirasi = async (siraliUrunler) => {
    const onceki = urunler;
    const yeni = siraliUrunler.map((u, index) => ({ ...u, siralama: index }));
    setUrunler([...yeni, ...arsivdekiler]);
    setOrderSaving(true);
    try {
      await vitrinService.reorder(kategori, yeni.map(u => u.id));
      bildir('Anasayfa vitrin sırası kaydedildi');
    } catch {
      setUrunler(onceki);
      bildir('Vitrin sırası kaydedilemedi', 'error');
      loadUrunler();
    } finally {
      setOrderSaving(false);
    }
  };

  const moveUrun = (id, direction) => {
    if (orderSaving || !siraDegistirilebilir) return;
    const from = aktifler.findIndex(u => u.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= aktifler.length) return;
    const yeni = [...aktifler];
    const [moved] = yeni.splice(from, 1);
    yeni.splice(to, 0, moved);
    saveUrunSirasi(yeni);
  };

  const handleUrunDrop = (targetId) => {
    if (orderSaving || !siraDegistirilebilir || draggedUrunId === null || draggedUrunId === targetId) {
      setDraggedUrunId(null);
      return;
    }
    const from = aktifler.findIndex(u => u.id === draggedUrunId);
    const to = aktifler.findIndex(u => u.id === targetId);
    if (from < 0 || to < 0) { setDraggedUrunId(null); return; }
    const yeni = [...aktifler];
    const [moved] = yeni.splice(from, 1);
    yeni.splice(to, 0, moved);
    setDraggedUrunId(null);
    saveUrunSirasi(yeni);
  };

  const handleYayinToggle = async (urun) => {
    if (!isAdmin || yayinSavingId !== null) return;
    const yeniDurum = !urun.yayinda;
    setYayinSavingId(urun.id);
    try {
      const res = await vitrinService.setPublished(urun.id, yeniDurum);
      setUrunler(prev => prev.map(item => item.id === urun.id ? { ...item, yayinda: res.data.yayinda } : item));
      bildir(res.data.yayinda ? 'İlan arşivden çıkarıldı, yayına alındı (listenin sonuna eklendi)' : 'İlan yayından kaldırıldı, arşive taşındı');
      loadUrunler(true); // sunucudaki yeni sıra değerlerini al (ekran titremesin diye sessiz)
    } catch {
      bildir('İlanın yayın durumu değiştirilemedi', 'error');
    } finally {
      setYayinSavingId(null);
    }
  };

  const handleDogrudanSira = async (urun) => {
    if (!isAdmin || orderSaving || siraSavingId !== null) return;
    const yeniSira = Number(siraTaslaklari[urun.id]);
    if (!Number.isInteger(yeniSira) || yeniSira < 1 || yeniSira > aktifler.length) {
      bildir(`Sıra numarası 1 ile ${aktifler.length} arasında olmalı`, 'warning');
      return;
    }

    const mevcutSira = aktifler.findIndex(item => item.id === urun.id) + 1;
    if (mevcutSira === yeniSira) return;

    setSiraSavingId(urun.id);
    setOrderSaving(true);
    try {
      const res = await vitrinService.moveToPosition(urun.id, yeniSira);
      setUrunler(prev => {
        const urunMap = new Map(prev.map(item => [Number(item.id), item]));
        const siraliAktifler = (res.data.urun_ids || []).map((id, index) => ({ ...urunMap.get(Number(id)), siralama: index }));
        return [...siraliAktifler, ...prev.filter(item => !item.yayinda)];
      });
      bildir(`İlan ${res.data.sira}. sıraya taşındı`);
    } catch {
      bildir('İlan sırası değiştirilemedi', 'error');
      loadUrunler();
    } finally {
      setSiraSavingId(null);
      setOrderSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
    try {
      await vitrinService.delete(id);
      bildir('Silindi');
      loadUrunler();
    } catch { bildir('Silinemedi', 'error'); }
  };

  return {
    urunler, loading, gorunum, setGorunum, arama, setArama, aktifler, arsivdekiler, arsivGorunumu, filtrelenmis, digerSonuc, aramaVar,
    siraDegistirilebilir, siraMap, loadUrunler, orderSaving, draggedUrunId, setDraggedUrunId, siraTaslaklari, setSiraTaslaklari,
    siraSavingId, yayinSavingId, moveUrun, handleUrunDrop, handleYayinToggle, handleDogrudanSira, handleDelete,
  };
};
