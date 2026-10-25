import QRCode from 'qrcode';
import { hataMesaji } from '../../../shared/api/istemci';
import { escapeHtml } from '../../../shared/utils/htmlKacis';
import type { IsEmriDetayi } from '../../../shared/tipler';
import { servisGecmisiService } from '../servisApi';
import { isEmriYazdirHtml } from '../isEmriYazdir';

// Motorun üzerine yapıştırılacak servis geçmişi QR etiketi — müşteri okutunca
// sadece o plakanın servis geçmişini gösteren halka açık sayfa açılır.
export const printServisQr = async (plaka: string | null | undefined) => {
  const temiz = escapeHtml(
    String(plaka || '')
      .trim()
      .toUpperCase(),
  );
  if (!temiz) {
    alert('Bu iş emrinde plaka kayıtlı değil. QR oluşturmak için önce plaka girin.');
    return;
  }
  try {
    const res = await servisGecmisiService.getQrToken(temiz);
    const url = `${window.location.origin}/s/${res.data.token}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 400, errorCorrectionLevel: 'M' });
    const win = window.open('', '_blank', 'width=420,height=340');
    if (!win) {
      alert('Yazdırma penceresi açılamadı. Tarayıcı pop-up engelleyicisini kapatın.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Servis QR - ${temiz}</title>
      <style>
        @page { size: 58mm 40mm; margin: 1mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .qr img { width: 30mm; height: 30mm; display: block; }
        .info { text-align: center; }
        .marka { font-size: 11px; font-weight: bold; letter-spacing: 0.5px; }
        .plaka { position: relative; font-size: 16px; font-weight: bold; letter-spacing: 1px; margin: 3px 0; border: 1.5px solid #000; border-radius: 4px; padding: 2px 6px 2px 16px; display: inline-block; }
        .plaka::before { content: 'TR'; position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: #1F4FA0; color: #fff; font-size: 5px; letter-spacing: 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .not { font-size: 8.5px; line-height: 1.25; }
      </style></head><body>
        <div class="qr"><img src="${dataUrl}" alt="QR" /></div>
        <div class="info">
          <div class="marka">KAYNAR MOTOR</div>
          <div class="plaka">${temiz}</div>
          <div class="not">Servis geçmişiniz için<br/>QR kodu okutun</div>
        </div>
        <script>window.onload=function(){window.focus();window.print();window.onafterprint=function(){window.close();};setTimeout(function(){window.close();},800);};</script>
      </body></html>`);
    win.document.close();
  } catch (err) {
    alert(hataMesaji(err, 'QR oluşturulamadı'));
  }
};

export const printIsEmri = (data: IsEmriDetayi | null | undefined) => {
  if (!data) return;
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Yazdırma penceresi açılamadı. Tarayıcı pop-up engelleyicisini kapatın.');
    return;
  }
  win.document.write(isEmriYazdirHtml(data));
  win.document.close();
  win.focus();
  win.print();
};
