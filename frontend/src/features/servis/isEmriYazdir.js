import { escapeHtml as e } from '../../shared/utils/htmlKacis';

// İş emri yazdırma sayfasının HTML'ini üretir (saf fonksiyon: pencere açmaz, yazdırmaz).
// Serbest metin alanlarının TAMAMI kaçışlanır; bkz. htmlKacis.js.
export const isEmriYazdirHtml = (data) => {
  const parcalar = data.parcalar || [];
  const toplamFiyat = parcalar.reduce((t, p) => t + parseFloat(p.toplam_fiyat || 0), 0);
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('tr-TR') : '-');
  const durumLabel = (d) => (d === 'tamamlandi' ? 'Tamamlandı' : d === 'devam_ediyor' ? 'Devam Ediyor' : 'Beklemede');

  const parcaRows = parcalar.map((p) => {
    const pSatis = parseFloat(p.toplam_fiyat || 0);
    return `<tr>
      <td style="padding:6px;border:1px solid #ddd">${e(p.takilan_parca)}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${e(p.adet)}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">₺${parseFloat(p.birim_fiyat || 0).toLocaleString('tr-TR')}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">₺${pSatis.toLocaleString('tr-TR')}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>İş Emri #${e(data.fis_no)}</title>
  <style>
    body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:15px;font-size:12px;color:#333}
    h2{text-align:center;margin:0 0 5px;color:#C62828}
    .header{text-align:center;margin-bottom:15px;border-bottom:2px solid #C62828;padding-bottom:10px}
    .section{margin-bottom:12px}
    .section-title{font-weight:bold;color:#C62828;font-size:13px;margin-bottom:5px;border-bottom:1px solid #eee;padding-bottom:3px}
    .info-grid{display:flex;gap:20px;margin-bottom:12px}
    .info-box{flex:1}
    .info-row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dotted #eee}
    .info-row .label{color:#666}
    .info-row .value{font-weight:500}
    table{width:100%;border-collapse:collapse;margin-top:5px}
    th{background:#C62828;color:white;padding:6px;text-align:left;font-size:11px}
    td{font-size:11px}
    .total-box{text-align:right;margin-top:8px;font-size:13px;font-weight:bold}
    .footer{margin-top:30px;display:flex;justify-content:space-between}
    .sign-box{text-align:center;width:45%}
    .sign-line{border-top:1px solid #333;margin-top:40px;padding-top:5px}
    @page{size:A4;margin:10mm}
  </style></head><body>
  <div class="header">
    <h2>KAYNAR MOTOR - İŞ EMRİ</h2>
    <div>Fiş No: <strong>#${e(data.fis_no)}</strong> | Tarih: ${formatDate(data.created_at)}</div>
  </div>
  <div class="info-grid">
    <div class="info-box">
      <div class="section-title">Müşteri Bilgileri</div>
      <div class="info-row"><span class="label">Ad Soyad:</span><span class="value">${e(data.musteri_ad_soyad || '-')}</span></div>
      <div class="info-row"><span class="label">Telefon:</span><span class="value">${e(data.telefon || '-')}</span></div>
      <div class="info-row"><span class="label">Adres:</span><span class="value">${e(data.adres || '-')}</span></div>
      <div class="info-row"><span class="label">KM:</span><span class="value">${e(data.km || '-')}</span></div>
    </div>
    <div class="info-box">
      <div class="section-title">Araç Bilgileri</div>
      <div class="info-row"><span class="label">Plaka:</span><span class="value">${e(data.plaka || '-')}</span></div>
      <div class="info-row"><span class="label">Marka:</span><span class="value">${e(data.marka || '-')}</span></div>
      <div class="info-row"><span class="label">Model/Tip:</span><span class="value">${e(data.model_tip || '-')}</span></div>
      <div class="info-row"><span class="label">Durum:</span><span class="value">${durumLabel(data.durum)}</span></div>
      <div class="info-row"><span class="label">Kaydı Açan:</span><span class="value">${e(data.olusturan_kisi || '-')}</span></div>
    </div>
    <div class="info-box">
      <div class="section-title">Tarih ve Teslim</div>
      <div class="info-row"><span class="label">Oluşturma:</span><span class="value">${formatDate(data.created_at)}</span></div>
      <div class="info-row"><span class="label">Tah. Teslim:</span><span class="value">${formatDate(data.tahmini_teslim_tarihi)}</span></div>
      <div class="info-row"><span class="label">Teslim Tarihi:</span><span class="value">${formatDate(data.teslim_tarihi)}</span></div>
      <div class="info-row"><span class="label">Teslim Alan:</span><span class="value">${e(data.teslim_alan_ad_soyad || '-')}</span></div>
      <div class="info-row"><span class="label">Teslim Eden:</span><span class="value">${e(data.teslim_eden_teknisyen || '-')}</span></div>
    </div>
  </div>
  ${data.ariza_sikayetler ? `<div class="section"><div class="section-title">Arıza / Şikayetler</div><div>${e(data.ariza_sikayetler)}</div></div>` : ''}
  ${data.aciklama ? `<div class="section"><div class="section-title">Açıklama</div><div>${e(data.aciklama)}</div></div>` : ''}
  <div class="section">
    <div class="section-title">Parçalar ve İşçilik</div>
    ${parcalar.length > 0 ? `
      <table><thead><tr>
        <th>Takılan Parça</th><th style="text-align:center">Adet</th><th style="text-align:right">Birim Fiyat</th><th style="text-align:right">Toplam</th>
      </tr></thead><tbody>${parcaRows}</tbody></table>
      <div class="total-box">Toplam: ₺${toplamFiyat.toLocaleString('tr-TR')}</div>
    ` : '<div style="text-align:center;color:#999;padding:10px">Parça kaydı yok</div>'}
  </div>
  ${data.odeme_detaylari ? `<div class="section"><div class="section-title">Ödeme Detayları</div><div>${e(data.odeme_detaylari)}</div></div>` : ''}
  <div class="footer">
    <div class="sign-box"><div class="sign-line">Teslim Eden</div></div>
    <div class="sign-box"><div class="sign-line">Teslim Alan</div></div>
  </div>
  </body></html>`;
};
