// Excel (HTML tablosu olarak .xls) dışa aktarma. excelHtml saf; excelIndir tarayıcıda dosya indirir.
import { bugunYerel } from '../../../shared/utils/tarih';
import { sayiYaz, tarihYaz, type Sayi, type TarihGirdisi } from '../../../shared/utils/bicim';
import type { Motor } from '../../../shared/tipler';

const FORMUL_BASLANGICI = /^[=+\-@\t\r]/;
const SAYI_GIBI = /^[+-]?[\d\s().,-]+$/;

/**
 * Formül enjeksiyonu önlemi: hücre metni `=`, `+`, `-`, `@` (ya da TAB/CR) ile başlarsa Excel bunu FORMÜL sayabilir; alıcı adı gibi serbest metin
 * alanları saldırgan girdisi taşıyabilir. Tehlikeli hücrenin başına tek tırnak konur. Yalnızca rakam/ayraçtan oluşan değerler (telefon
 * "+90 555 111 22 33", negatif tutar "-1.500,00") formül olamaz, olduğu gibi kalır.
 */
export const excelMetni = (v: unknown): string => {
  const s = String(v ?? '');
  return FORMUL_BASLANGICI.test(s) && !SAYI_GIBI.test(s) ? `'${s}` : s;
};

export const excelHtml = (motorlar: Motor[], { canAlis, canKar }: { canAlis: boolean; canKar: boolean }): string => {
  const formatDate = (d: TarihGirdisi) => tarihYaz(d, '');
  const num = (v: Sayi) => sayiYaz(v);
  const headers = [
    'Plaka',
    'Marka',
    'Model',
    'Yıl',
    'KM',
    ...(canAlis ? ['Alım (₺)'] : []),
    'Satış (₺)',
    'Noter Alış (₺)',
    'Noter Satış (₺)',
    ...(canKar ? ['Kâr (₺)'] : []),
    'Satıcı',
    'Alıcı',
    'Alıcı Tel',
    'Ödeme Şekli',
    'Yevmiye No',
    'Satış Tarihi',
  ];
  const escape = (v: unknown) =>
    String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const rowsHtml = motorlar
    .map((m) => {
      const cells: Array<string | number> = [
        m.plaka || '',
        m.marka || '',
        m.model || '',
        m.yil || '',
        m.km ? sayiYaz(m.km) : '',
        ...(canAlis ? [num(m.alis_fiyati)] : []),
        num(m.satis_fiyati),
        num(m.noter_alis),
        num(m.noter_satis),
        ...(canKar ? [num(m.kar)] : []),
        m.satici_adi || '',
        m.alici_adi || '',
        m.alici_telefon || '',
        m.odeme_sekli || '',
        m.yevmiye_no || '',
        formatDate(m.satis_tarihi || m.tarih),
      ];
      return '<tr>' + cells.map((c) => `<td style="border:1px solid #555;padding:8px;font-size:12px;">${escape(excelMetni(c))}</td>`).join('') + '</tr>';
    })
    .join('');
  const headerHtml =
    '<tr>' +
    headers
      .map((h) => `<th style="border:1px solid #333;background:#C62828;color:#fff;padding:10px;font-size:13px;text-align:center;">${escape(h)}</th>`)
      .join('') +
    '</tr>';
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Motor Satış</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table style="border-collapse:collapse;font-family:Arial;">${headerHtml}${rowsHtml}</table></body></html>`;
  return html;
};

export const excelIndir = (html: string): void => {
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = bugunYerel();
  a.href = url;
  a.download = `Motor_Satis_${today}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
