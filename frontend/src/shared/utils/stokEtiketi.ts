import JsBarcode from 'jsbarcode';
import { paraYaz, type Sayi } from './bicim';
import { escapeHtml as kacis } from './htmlKacis';
import { bildir } from '../ui/Bildirim';

/** Etiketin ihtiyaç duyduğu stok alanları (aksesuar ve yedek parça stoğu ortak). */
export interface EtiketStogu {
  stok_kodu?: string | null;
  stok_adi?: string | null;
  marka?: string | null;
  satis_fiyati?: Sayi;
}

// Stok etiketi (58x40 mm): üstte "Stok etiketi", ürün adı, marka · stok kodu, barkod, büyük fiyat.
// Aksesuar ve yedek parça stoğu aynı etiketi basar. Barkod yoksa ya da oluşturulamazsa uyarı verir.
export const stokEtiketiYazdir = (stok: EtiketStogu): void => {
  const kod = String(stok.stok_kodu || '').trim();
  if (!kod) {
    bildir('Bu ürünün stok kodu (barkod) yok. Lütfen önce stok kodu girin.', 'uyari');
    return;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, kod, { format: 'CODE128', displayValue: true, fontSize: 16, height: 55, margin: 4, width: 2, font: 'monospace', fontOptions: 'bold' });
  } catch (e) {
    bildir('Barkod oluşturulamadı: ' + (e instanceof Error ? e.message : String(e)));
    return;
  }
  const svgStr = new XMLSerializer().serializeToString(svg);
  const fiyat = '₺' + paraYaz(stok.satis_fiyati);
  const altSatir = [stok.marka, `Stok kodu ${kod}`].filter(Boolean).join(' · ');
  const win = window.open('', '_blank', 'width=420,height=320');
  if (!win) {
    bildir('Yazdırma penceresi açılamadı. Tarayıcı pop-up engelleyicisini kapatın.', 'uyari');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiket - ${kacis(stok.stok_adi)}</title>
    <style>
      @page { size: 58mm 40mm; margin: 1mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; text-align: center; margin: 0; padding: 6px; color: #16181c; }
      .ust { font-size: 10px; color: #5b5f66; }
      .urun { font-size: 14px; font-weight: bold; line-height: 1.2; margin: 2px 0; word-break: break-word; }
      .alt { font-size: 10px; color: #5b5f66; margin-bottom: 2px; }
      .fiyat { font-size: 22px; font-weight: bold; margin-top: 2px; }
      .barcode svg { max-width: 100%; height: auto; }
    </style></head><body>
      <div class="ust">Stok etiketi</div>
      <div class="urun">${kacis(stok.stok_adi)}</div>
      <div class="alt">${kacis(altSatir)}</div>
      <div class="barcode">${svgStr}</div>
      <div class="fiyat">${kacis(fiyat)}</div>
      <script>window.onload=function(){window.focus();window.print();window.onafterprint=function(){window.close();};setTimeout(function(){window.close();},800);};</script>
    </body></html>`);
  win.document.close();
};
