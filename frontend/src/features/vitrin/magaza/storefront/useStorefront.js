import { useState, useEffect, useCallback, useMemo } from 'react';
import { vitrinService } from '../../vitrinApi';
import { KATEGORILER, SEGMENTLER, HIZMET_KATEGORILER, MOTOR_DURUMLARI } from '../../vitrinSabitleri';
import { ilanAramaUygunMu } from '../../ilanArama';
import { iletisimKisileri } from '../../VitrinOrtak';
import { sonIstek } from '../../../../shared/utils/sonIstek';
import { MOTOR_DURUM_BASLIK } from './kategoriSabitleri';

// Filtre hızlı değişirken eski isteğin yanıtı yenisinin üzerine yazmasın
const sonUrun = sonIstek();

// Mağaza sayfasının tüm durumu ve işlemleri: giriş/kategori, Sıfır-İkinci El seçimi, süzgeçler, ilan ve iletişim yükleme, mobil menü,
// taksit penceresi. `geriDonus`: detaydan dönüşte taşınan süzgeç durumu; `navigate`: ilan detayına gitmek için.
export const useStorefront = ({ geriDonus, navigate }) => {
  // Giriş (video) ekranı mı yoksa kategori listesi mi gösteriliyor
  const [intro, setIntro] = useState(!geriDonus);

  const [tab, setTab] = useState(geriDonus?.tab ?? 0);
  const kategori = KATEGORILER[tab].key;
  const isMotor = kategori === 'motor';
  const isHizmet = HIZMET_KATEGORILER.includes(kategori);

  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [iletisim, setIletisim] = useState({});
  const [segmentler, setSegmentler] = useState(SEGMENTLER);

  // filtreler (motor) — önce Sıfır / İkinci El seçilir, sonra marka/segment ile daraltılır
  const [motorDurumu, setMotorDurumu] = useState(geriDonus?.motorDurumu || '');
  const [marka, setMarka] = useState(geriDonus?.marka || '');
  const [markalar, setMarkalar] = useState([]);
  const [segment, setSegment] = useState(geriDonus?.segment || '');
  const [ccMax, setCcMax] = useState(geriDonus?.ccMax || '');
  const [kmMax, setKmMax] = useState(geriDonus?.kmMax || '');
  const [q, setQ] = useState(geriDonus?.q || '');

  // mobil menü (hamburger) aç/kapa
  const [mobilMenu, setMobilMenu] = useState(false);

  // Taksit hesaplama penceresi (giriş gerektirmez)
  const [taksitOpen, setTaksitOpen] = useState(false);

  const loadIletisim = useCallback(async () => {
    try {
      const res = await vitrinService.getIletisim();
      const map = {};
      res.data.forEach(r => { map[r.kategori] = r; });
      setIletisim(map);
    } catch { /* sessiz */ }
  }, []);

  const loadUrunler = useCallback(async () => {
    setLoading(true);
    try {
      const params = { kategori };
      if (isMotor) {
        params.durum = motorDurumu;
        if (marka) params.marka = marka;
        if (segment) params.segment = segment;
        if (ccMax) params.cc_max = ccMax;
        if (kmMax) params.km_max = kmMax;
      }
      // İsimle arama (q) sunucuya gitmez: yüklenen liste üzerinde anında, Türkçe karakter farkı gözetmeden süzülür
      const res = await sonUrun(vitrinService.getAll(params));
      if (!res) return; // filtre bu arada değişti: eski yanıt yok sayılır, yükleniyor göstergesini yeni istek kapatır
      setUrunler(res.data);
    } catch { setUrunler([]); }
    setLoading(false);
  }, [kategori, isMotor, motorDurumu, marka, segment, ccMax, kmMax]);

  const gorunenUrunler = useMemo(() => urunler.filter(u => ilanAramaUygunMu(u, q)), [urunler, q]);
  const aramaVar = q.trim() !== '';

  useEffect(() => { loadIletisim(); }, [loadIletisim]);

  // dinamik segmentleri yükle
  useEffect(() => {
    vitrinService.getSegmentler()
      .then(res => { if (res.data?.length) setSegmentler(res.data.map(s => s.ad)); })
      .catch(() => { /* varsayılan listede kalır */ });
  }, []);

  // Seçilen durumdaki (sıfır / ikinci el) yayındaki ilanların markaları — admin ne marka girdiyse o listelenir
  useEffect(() => {
    if (!isMotor || !motorDurumu) { setMarkalar([]); return; }
    let active = true;
    vitrinService.getMarkalar(motorDurumu)
      .then(res => { if (active) setMarkalar(res.data.map(m => m.marka)); })
      .catch(() => { if (active) setMarkalar([]); });
    return () => { active = false; };
  }, [isMotor, motorDurumu]);

  // Dar ekranda filtre paneli aç/kapa; masaüstünde hep açık
  const [filtreAcik, setFiltreAcik] = useState(false);
  const aktifFiltreSayisi = [marka, segment, ccMax, kmMax].filter(Boolean).length;
  const filtreleriTemizle = () => { setMarka(''); setSegment(''); setCcMax(''); setKmMax(''); };

  // Sıfır / İkinci El seçilmeden motor listesi gösterilmez
  const durumSecimi = isMotor && !motorDurumu;

  // Seçim ekranındaki iki karo için: o türde kaç ilan var ve arka plana hangi fotoğraf konacak
  const [durumOzet, setDurumOzet] = useState({});
  useEffect(() => {
    if (intro || !durumSecimi) return undefined;
    let active = true;
    Promise.all(MOTOR_DURUMLARI.map(d =>
      vitrinService.getAll({ kategori: 'motor', durum: d.key }).then(res => [d.key, res.data]).catch(() => [d.key, []])
    )).then(sonuclar => {
      if (!active) return;
      const ozet = {};
      sonuclar.forEach(([key, liste]) => {
        ozet[key] = { adet: liste.length, kapak: liste.find(u => u.kapak_gorsel_id)?.kapak_gorsel_id || null };
      });
      setDurumOzet(ozet);
    });
    return () => { active = false; };
  }, [intro, durumSecimi]);

  // filtre değişince (kısa debounce ile) yükle — giriş ekranındayken yükleme yapma
  useEffect(() => {
    if (intro || durumSecimi) return;
    const t = setTimeout(loadUrunler, 250);
    return () => clearTimeout(t);
  }, [loadUrunler, intro, durumSecimi]);

  // sekme değişince filtreleri sıfırla + eski listeyi anında temizle (yumuşak geçiş)
  const handleTab = (v) => {
    setTab(v);
    setMotorDurumu(''); setMarka('');
    setSegment(''); setCcMax(''); setKmMax(''); setQ('');
    setUrunler([]); setLoading(true);
  };

  // Sıfır / İkinci El değişince marka ve km filtreleri o türe ait olmayabilir → sıfırla
  const secMotorDurumu = (d) => {
    if (d === motorDurumu) return;
    setMotorDurumu(d); setMarka(''); setKmMax('');
    setUrunler([]); setLoading(true);
    window.scrollTo(0, 0);
  };

  // Giriş ekranından bir kategoriye gir
  const enterKategori = (i) => { handleTab(i); setIntro(false); window.scrollTo(0, 0); };
  const goHome = () => { setIntro(true); setUrunler([]); };

  const openDetay = (u) => {
    navigate(`/ilan/${u.id}`, { state: { storefront: { tab, motorDurumu, marka, segment, ccMax, kmMax, q } } });
  };

  const curIletisim = iletisim[kategori];
  const kisiler = iletisimKisileri(curIletisim);
  const sayfaBasligi = isMotor ? MOTOR_DURUM_BASLIK[motorDurumu] : KATEGORILER[tab].label;

  return {
    intro, tab, kategori, isMotor, isHizmet, urunler, loading, segmentler, motorDurumu, marka, setMarka, markalar, segment, setSegment,
    ccMax, setCcMax, kmMax, setKmMax, q, setQ, mobilMenu, setMobilMenu, taksitOpen, setTaksitOpen, gorunenUrunler, aramaVar, filtreAcik,
    setFiltreAcik, aktifFiltreSayisi, filtreleriTemizle, durumSecimi, durumOzet, handleTab, secMotorDurumu, enterKategori, goHome, openDetay,
    curIletisim, kisiler, sayfaBasligi,
  };
};
