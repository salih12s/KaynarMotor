import React, { useState, useEffect, type ChangeEvent } from 'react';
import { hataMesaji } from '../../shared/api/istemci';
import { IslemDugmesi } from '../../shared/ui';
import { useOnay } from '../../shared/ui';
import { Box, Typography, Button, Alert, CircularProgress, Divider } from '@mui/material';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import { satisBelgeService } from './motorApi';
import { tarihYaz } from '../../shared/utils/bicim';
import type { SatisBelgesi } from '../../shared/tipler';

const BELGE_UZANTILARI = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
const MAX_BELGE_BOYUT = 10 * 1024 * 1024; // sunucu limitiyle aynı
const boyutYaz = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const BELGE_ACIKLAMA = 'PDF, Word, Excel, JPG veya PNG (dosya başına en fazla 10 MB).';

export type BelgeDosyasi = Pick<SatisBelgesi, 'id' | 'mime' | 'dosya_adi'>;

export const belgeOnizlenebilir = (b: Pick<SatisBelgesi, 'mime'>) => b.mime === 'application/pdf' || b.mime.startsWith('image/');

// PDF/görsel yeni sekmede açılır, diğerleri indirilir. Sekme tıklamayla eşzamanlı açılır (açılır pencere engeli olmasın).
// Açılamazsa hata fırlatır.
export const belgeAc = async (b: BelgeDosyasi, goster: boolean) => {
  const sekme = goster && belgeOnizlenebilir(b) ? window.open('', '_blank') : null;
  try {
    const res = await satisBelgeService.download(b.id);
    const url = URL.createObjectURL(new Blob([res.data], { type: b.mime }));
    if (sekme) sekme.location.href = url;
    else {
      const a = document.createElement('a');
      a.href = url;
      a.download = b.dosya_adi;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (sekme) sekme.close();
    throw e;
  }
};

// Satışa sözleşme vb. dosya ekleme (PDF/Word/Excel/görsel). Zorunlu değil, etiket yok: ad + yüklenme tarihi.
// Kayıtlı bir satış için kullanılır: dosya seçildiği anda yüklenir.
interface BelgeMesaji {
  sev: 'error' | 'success';
  text: string;
}

export const BelgeBolumu = ({ motorId }: { motorId: number }) => {
  const onay = useOnay();
  const [belgeler, setBelgeler] = useState<SatisBelgesi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [islemId, setIslemId] = useState<number | null>(null);
  const [mesaj, setMesaj] = useState<BelgeMesaji | null>(null);

  const yukle = async () => {
    try {
      const res = await satisBelgeService.list(motorId);
      setBelgeler(res.data);
    } catch {
      setMesaj({ sev: 'error', text: 'Belgeler yüklenemedi' });
    }
  };

  useEffect(() => {
    let aktif = true;
    satisBelgeService
      .list(motorId)
      .then((res) => {
        if (aktif) setBelgeler(res.data);
      })
      .catch(() => {
        if (aktif) setMesaj({ sev: 'error', text: 'Belgeler yüklenemedi' });
      });
    return () => {
      aktif = false;
    };
  }, [motorId]);

  const dosyaSec = async (e: ChangeEvent<HTMLInputElement>) => {
    const dosyalar = Array.from(e.target.files || []);
    e.target.value = '';
    if (dosyalar.length === 0) return;
    setYukleniyor(true);
    setMesaj(null);
    const hatalar: string[] = [];
    let basarili = 0;
    for (const f of dosyalar) {
      if (f.size > MAX_BELGE_BOYUT) {
        hatalar.push(`${f.name}: 10 MB'dan büyük`);
        continue;
      }
      try {
        await satisBelgeService.upload(motorId, f);
        basarili++;
      } catch (err) {
        hatalar.push(`${f.name}: ${hataMesaji(err, 'yüklenemedi')}`);
      }
    }
    await yukle();
    setYukleniyor(false);
    if (hatalar.length) setMesaj({ sev: 'error', text: hatalar.join(' • ') + (basarili ? ` (${basarili} dosya yüklendi)` : '') });
    else setMesaj({ sev: 'success', text: `${basarili} dosya yüklendi` });
  };

  const ac = async (b: SatisBelgesi, goster: boolean) => {
    setIslemId(b.id);
    try {
      await belgeAc(b, goster);
    } catch {
      setMesaj({ sev: 'error', text: 'Belge açılamadı' });
    }
    setIslemId(null);
  };

  const sil = async (b: SatisBelgesi) => {
    if (!(await onay(`"${b.dosya_adi}" silinsin mi?`))) return;
    setIslemId(b.id);
    try {
      await satisBelgeService.delete(b.id);
      await yukle();
    } catch (err) {
      setMesaj({ sev: 'error', text: hataMesaji(err, 'Silinemedi') });
    }
    setIslemId(null);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ flexGrow: 1 }}>
          Belgeler ({belgeler.length})
        </Typography>
        <Button
          size="small"
          variant="outlined"
          component="label"
          disabled={yukleniyor}
          startIcon={yukleniyor ? <CircularProgress size={16} /> : <AttachFileIcon />}
        >
          {yukleniyor ? 'Yükleniyor…' : 'Belge Ekle'}
          <input type="file" hidden multiple accept={BELGE_UZANTILARI} onChange={dosyaSec} />
        </Button>
      </Box>
      <Divider sx={{ my: 1 }} />
      {mesaj && (
        <Alert severity={mesaj.sev} onClose={() => setMesaj(null)} sx={{ mb: 1 }}>
          {mesaj.text}
        </Alert>
      )}
      {belgeler.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Henüz belge eklenmedi. {BELGE_ACIKLAMA}
        </Typography>
      ) : (
        belgeler.map((b) => (
          <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <DescriptionIcon color="action" />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="500" noWrap title={b.dosya_adi}>
                {b.dosya_adi}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {boyutYaz(b.boyut)} • {tarihYaz(b.created_at)}
                {b.yukleyen_adi ? ` • ${b.yukleyen_adi}` : ''}
              </Typography>
            </Box>
            {islemId === b.id ? (
              <CircularProgress size={20} />
            ) : (
              <>
                {belgeOnizlenebilir(b) && <IslemDugmesi tur="goz" onClick={() => ac(b, true)} title="Görüntüle" />}
                <IslemDugmesi tur="indir" onClick={() => ac(b, false)} title="İndir" />
                <IslemDugmesi tur="sil" onClick={() => sil(b)} title="Sil" />
              </>
            )}
          </Box>
        ))
      )}
    </Box>
  );
};

// Henüz kaydedilmemiş bir satış için: dosyalar seçilir, satış kaydedilince yüklenir.
// (Belge bir satış kaydına bağlıdır; kayıt oluşmadan sunucuya gönderilemez.)
interface BekleyenBelgelerProps {
  dosyalar: File[];
  setDosyalar: (dosyalar: File[]) => void;
  disabled?: boolean;
}

export const BekleyenBelgeler = ({ dosyalar, setDosyalar, disabled }: BekleyenBelgelerProps) => {
  const [uyari, setUyari] = useState('');

  const dosyaSec = (e: ChangeEvent<HTMLInputElement>) => {
    const secilen = Array.from(e.target.files || []);
    e.target.value = '';
    const buyukler = secilen.filter((f) => f.size > MAX_BELGE_BOYUT);
    setUyari(buyukler.length ? `10 MB'dan büyük olduğu için eklenmedi: ${buyukler.map((f) => f.name).join(', ')}` : '');
    // Aynı dosya iki kez seçilirse tek sefer eklenir
    const yeni = secilen.filter((f) => f.size <= MAX_BELGE_BOYUT && !dosyalar.some((d) => d.name === f.name && d.size === f.size));
    if (yeni.length) setDosyalar([...dosyalar, ...yeni]);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ flexGrow: 1 }}>
          Belgeler ({dosyalar.length})
        </Typography>
        <Button size="small" variant="outlined" component="label" disabled={disabled} startIcon={<AttachFileIcon />}>
          Belge Ekle
          <input type="file" hidden multiple accept={BELGE_UZANTILARI} onChange={dosyaSec} />
        </Button>
      </Box>
      <Divider sx={{ my: 1 }} />
      {uyari && (
        <Alert severity="warning" onClose={() => setUyari('')} sx={{ mb: 1 }}>
          {uyari}
        </Alert>
      )}
      {dosyalar.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Ruhsat, sözleşme gibi belgeleri buradan ekleyebilirsiniz. {BELGE_ACIKLAMA}
        </Typography>
      ) : (
        <>
          {dosyalar.map((f, i) => (
            <Box
              key={`${f.name}-${f.size}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <DescriptionIcon color="action" />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight="500" noWrap title={f.name}>
                  {f.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {boyutYaz(f.size)}
                </Typography>
              </Box>
              <IslemDugmesi tur="sil" disabled={disabled} title="Listeden çıkar" onClick={() => setDosyalar(dosyalar.filter((_, idx) => idx !== i))} />
            </Box>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Belgeler kayıt tamamlandığında yüklenir.
          </Typography>
        </>
      )}
    </Box>
  );
};

// Bekleyen dosyaları kaydedilen satışa yükler. Yüklenemeyenlerin açıklamalarını döndürür (boş dizi = hepsi yüklendi).
export const bekleyenBelgeleriYukle = async (motorId: number, dosyalar: File[]): Promise<string[]> => {
  const hatalar: string[] = [];
  for (const f of dosyalar) {
    try {
      await satisBelgeService.upload(motorId, f);
    } catch (err) {
      hatalar.push(`${f.name}: ${hataMesaji(err, 'yüklenemedi')}`);
    }
  }
  return hatalar;
};
