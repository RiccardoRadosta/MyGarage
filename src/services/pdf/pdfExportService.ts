import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { PDFDocument } from 'pdf-lib';
import { MaintenanceRecord, Vehicle } from '../../types';
import { attachmentsApi, maintenancesApi } from '../api/api';
import { apiClient } from '../api/ApiClient';
import { fromApiMaintenance } from '../api/mappers';
import { formatCurrency, formatDate, formatMileage } from '../../utils/maintenance';

export type ExportProgressCallback = (message: string, current?: number, total?: number) => void;

export type AttachmentFailure = {
  maintenanceId: string;
  type: string;
  date: string;
  reason: string;
};

export type GeneratePdfResult = {
  success: boolean;
  filePath: string;
  fileName: string;
  base64: string;
  attachmentFailures: AttachmentFailure[];
};

export type ExportPdfResult = GeneratePdfResult;

export type SavePdfResult =
  | { status: 'saved'; uri: string; fileName: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

type DownloadedAttachment =
  | { kind: 'pdf'; bytes: Uint8Array; fileName?: string }
  | { kind: 'jpeg'; base64DataUri: string; fileName?: string }
  | { kind: 'error'; reason: string };

const escapeHtml = (text?: string | null): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const isPdfBytes = (bytes: Uint8Array): boolean =>
  bytes.length >= 4 &&
  bytes[0] === 0x25 && // %
  bytes[1] === 0x50 && // P
  bytes[2] === 0x44 && // D
  bytes[3] === 0x46;   // F

const isJpegBytes = (bytes: Uint8Array): boolean =>
  bytes.length >= 3 &&
  bytes[0] === 0xff &&
  bytes[1] === 0xd8 &&
  bytes[2] === 0xff;

const isPngBytes = (bytes: Uint8Array): boolean =>
  bytes.length >= 4 &&
  bytes[0] === 0x89 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x4e &&
  bytes[3] === 0x47;

/**
 * Ottimizza un'immagine JPEG se supera gli 800 KB per mantenere contenuto nitido
 * senza appesantire eccessivamente il PDF finale.
 */
const optimizeJpegIfNeeded = async (bytes: Uint8Array, mimeType: string): Promise<string> => {
  const base64Raw = uint8ArrayToBase64(bytes);

  if (bytes.byteLength <= 800 * 1024) {
    return `data:${mimeType};base64,${base64Raw}`;
  }

  try {
    const tempFileUri = `${FileSystem.cacheDirectory || ''}temp_opt_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempFileUri, base64Raw, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const manipulated = await manipulateAsync(
      tempFileUri,
      [{ resize: { width: 1400 } }],
      { compress: 0.82, format: SaveFormat.JPEG, base64: true }
    );

    void FileSystem.deleteAsync(tempFileUri, { idempotent: true });

    if (manipulated.base64) {
      return `data:image/jpeg;base64,${manipulated.base64}`;
    }
  } catch {
    // In caso di errore nel ridimensionamento, usa l'immagine originale
  }

  return `data:${mimeType};base64,${base64Raw}`;
};

/**
 * Scarica e valida l'allegato di una specifica manutenzione.
 */
const fetchRecordAttachment = async (
  recordId: string
): Promise<DownloadedAttachment> => {
  try {
    let fileName = 'allegato';
    try {
      const metadata = await attachmentsApi.metadata(recordId);
      if (metadata?.fileName) fileName = metadata.fileName;
    } catch {
      // Ignora l'errore sui metadati e prosegui con il contenuto binario
    }

    const { bytes, contentType } = await apiClient.requestBinary(
      `/api/v1/maintenances/${encodeURIComponent(recordId)}/attachment/content`
    );

    if (!bytes || bytes.length === 0) {
      return { kind: 'error', reason: 'File vuoto o non disponibile sul server.' };
    }

    const lowerContent = (contentType || '').toLowerCase();

    // Riconoscimento PDF
    if (lowerContent.includes('application/pdf') || isPdfBytes(bytes)) {
      if (!isPdfBytes(bytes)) {
        return { kind: 'error', reason: 'Formato PDF non valido o corrotto.' };
      }
      return { kind: 'pdf', bytes, fileName };
    }

    // Riconoscimento JPEG o PNG
    if (lowerContent.includes('image/jpeg') || lowerContent.includes('image/jpg') || isJpegBytes(bytes)) {
      const base64DataUri = await optimizeJpegIfNeeded(bytes, 'image/jpeg');
      return { kind: 'jpeg', base64DataUri, fileName };
    }

    if (lowerContent.includes('image/png') || isPngBytes(bytes)) {
      const base64DataUri = await optimizeJpegIfNeeded(bytes, 'image/png');
      return { kind: 'jpeg', base64DataUri, fileName };
    }

    return { kind: 'error', reason: `Formato file '${contentType}' non supportato per l'esportazione.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore durante il download.';
    return { kind: 'error', reason: message };
  }
};

/**
 * Costruisce lo stile CSS comune per la stampa in formato A4 con impaginazione chiara,
 * testi di grandi dimensioni e contrasto elevato.
 */
const getCommonCss = () => `
  @page {
    size: A4 portrait;
    margin: 12mm 12mm 14mm 12mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 14px;
    line-height: 1.5;
  }
  .header-card {
    border-bottom: 3px solid #0284c7;
    padding-bottom: 14px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .app-name {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1.5px;
    color: #0284c7;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .doc-title {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    line-height: 1.2;
  }
  .generation-date {
    font-size: 12px;
    color: #64748b;
    text-align: right;
    line-height: 1.4;
  }
  .grid-2 {
    display: flex;
    gap: 16px;
    margin-bottom: 22px;
  }
  .info-panel {
    flex: 1;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 18px;
  }
  .panel-heading {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #0284c7;
    margin-bottom: 8px;
  }
  .vehicle-main {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 6px;
  }
  .vehicle-detail-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13.5px;
    color: #475569;
  }
  .vehicle-detail-row strong {
    color: #0f172a;
  }
  .summary-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .stat-block {
    text-align: left;
  }
  .stat-val {
    font-size: 22px;
    font-weight: 900;
    color: #0f172a;
  }
  .stat-val-highlight {
    color: #0284c7;
  }
  .stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }
  .section-divider {
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #475569;
    margin: 22px 0 14px 0;
    padding-bottom: 6px;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .maintenance-card {
    background: #ffffff;
    border: 2px solid #cbd5e1;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  .maintenance-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    border-bottom: 1.5px solid #f1f5f9;
    padding-bottom: 10px;
  }
  .type-badge {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    font-weight: 800;
    font-size: 16px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1.5px solid #bae6fd;
    letter-spacing: 0.3px;
  }
  .cost-badge {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    padding: 4px 14px;
    border-radius: 8px;
  }
  .maintenance-meta-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 28px;
    margin-bottom: 10px;
    font-size: 14px;
    color: #475569;
  }
  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .meta-item strong {
    color: #0f172a;
    font-weight: 800;
  }
  .notes-box {
    background: #f8fafc;
    border-left: 4px solid #0284c7;
    padding: 10px 14px;
    font-size: 13.5px;
    color: #334155;
    margin-top: 10px;
    border-radius: 0 6px 6px 0;
    line-height: 1.5;
  }
  .notes-title {
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 3px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .attachment-preview {
    margin-top: 14px;
    padding: 12px;
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    page-break-inside: avoid;
  }
  .attachment-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid #e2e8f0;
  }
  .attachment-tag {
    background: #0284c7;
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .attachment-title {
    font-size: 13.5px;
    color: #1e293b;
    font-weight: 600;
  }
  .attachment-image-wrap {
    text-align: center;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
  }
  .attachment-img {
    max-width: 100%;
    max-height: 440px;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 4px;
    display: inline-block;
    vertical-align: middle;
  }
  .attachment-filename {
    font-size: 11.5px;
    color: #64748b;
    margin-top: 6px;
    text-align: right;
    font-style: italic;
  }
  .pdf-notice-box {
    background: #f0fdf4;
    border: 1.5px solid #86efac;
    border-radius: 8px;
    padding: 12px 14px;
    margin-top: 12px;
    text-align: left;
  }
  .pdf-notice-title {
    font-weight: 800;
    color: #166534;
    font-size: 14px;
  }
  .pdf-notice-desc {
    font-size: 12.5px;
    color: #15803d;
    margin-top: 3px;
  }
  .warning-box {
    background: #fffbeb;
    border: 1.5px solid #fde68a;
    border-radius: 8px;
    padding: 10px 14px;
    margin-top: 12px;
    color: #b45309;
    font-size: 13px;
    text-align: left;
  }
  .empty-state {
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 10px;
    padding: 32px;
    text-align: center;
    color: #64748b;
    font-size: 15px;
    margin-top: 24px;
  }
  .footer-meta {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
  }

  /* Stili pagina introduttiva per allegati PDF */
  .separator-wrapper {
    page-break-before: always;
    page-break-after: avoid;
    padding-top: 6mm;
  }
  .separator-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #0284c7;
    padding-bottom: 12px;
  }
  .separator-hero {
    margin: 36px 0 28px 0;
    text-align: center;
  }
  .separator-badge {
    display: inline-block;
    background: #0284c7;
    color: #ffffff;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 6px 18px;
    border-radius: 20px;
    margin-bottom: 14px;
  }
  .separator-main-title {
    font-size: 28px;
    font-weight: 900;
    color: #0f172a;
    margin: 0 0 8px 0;
    letter-spacing: 0.5px;
  }
  .separator-subtitle {
    font-size: 15px;
    color: #64748b;
    margin: 0;
  }
  .separator-card {
    background: #f8fafc;
    border: 2px solid #cbd5e1;
    border-radius: 12px;
    padding: 24px 26px;
    margin-bottom: 24px;
  }
  .separator-type-title {
    font-size: 22px;
    font-weight: 900;
    color: #0284c7;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1.5px solid #e2e8f0;
  }
  .separator-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
    font-size: 14px;
  }
  .separator-info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .separator-label {
    font-size: 11.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .separator-value {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }
  .separator-file-callout {
    background: #ffffff;
    border: 2px dashed #0284c7;
    border-radius: 8px;
    padding: 16px 20px;
    margin-top: 22px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .separator-file-icon {
    font-size: 36px;
    line-height: 1;
  }
  .separator-file-name {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
  }
  .separator-file-notice {
    font-size: 13px;
    color: #64748b;
    margin-top: 4px;
    line-height: 1.4;
  }
  .separator-footer {
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
  }
`;

/**
 * Genera il blocco HTML relativo all'intestazione del documento e ai dati veicolo/riepilogo.
 */
const buildHeaderAndVehicleHtml = (
  vehicle: Vehicle,
  records: MaintenanceRecord[],
  totalCost: number
): string => {
  const generationDate = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <div class="header-card">
      <div>
        <div class="app-name">Il Mio Garage</div>
        <h1 class="doc-title">Storico Manutenzioni</h1>
      </div>
      <div class="generation-date">
        Generato il<br><strong>${escapeHtml(generationDate)}</strong>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-panel">
        <div class="panel-heading">Dati Veicolo</div>
        <div class="vehicle-main">${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</div>
        <div class="vehicle-detail-row">
          <span>Targa: <strong>${escapeHtml(vehicle.plate || '-')}</strong></span>
          <span>Anno: <strong>${vehicle.year ? String(vehicle.year) : '-'}</strong></span>
          <span>Km attuali: <strong>${formatMileage(vehicle.mileage)}</strong></span>
        </div>
      </div>

      <div class="info-panel">
        <div class="panel-heading">Riepilogo Spese</div>
        <div class="summary-stats">
          <div class="stat-block">
            <div class="stat-val">${records.length}</div>
            <div class="stat-label">Interventi totali</div>
          </div>
          <div class="stat-block" style="text-align: right;">
            <div class="stat-val stat-val-highlight">${formatCurrency(totalCost)}</div>
            <div class="stat-label">Spesa complessiva</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-divider">
      <span>Elenco degli interventi eseguiti</span>
      <span>${records.length} registrazioni</span>
    </div>
  `;
};

/**
 * Genera una pagina introduttiva / separatore formale prima di ciascun PDF allegato.
 */
/**
 * Genera il blocco HTML per la copertina dell'allegato PDF.
 * Si avvia su una nuova pagina pulita tramite 'page-break-before: always'.
 */
const buildPdfAttachmentSeparatorBlockHtml = (
  vehicle: Vehicle,
  record: MaintenanceRecord,
  fileName?: string
): string => {
  return `
    <div class="separator-wrapper">
      <div class="separator-top">
        <div class="app-name">IL MIO GARAGE — ALLEGATI UFFICIALI</div>
        <div class="generation-date">Veicolo: <strong>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} (${escapeHtml(vehicle.plate || '-')})</strong></div>
      </div>

      <div class="separator-hero">
        <div class="separator-badge">DOCUMENTO ORIGINALE</div>
        <h1 class="separator-main-title">ALLEGATO DELL'INTERVENTO</h1>
        <p class="separator-subtitle">Scheda descrittiva del documento PDF associato alla manutenzione</p>
      </div>

      <div class="separator-card">
        <div class="separator-type-title">Intervento: ${escapeHtml(record.type)}</div>
        <div class="separator-grid">
          <div class="separator-info-item">
            <span class="separator-label">Data intervento</span>
            <span class="separator-value">${formatDate(record.date)}</span>
          </div>
          <div class="separator-info-item">
            <span class="separator-label">Chilometraggio</span>
            <span class="separator-value">${formatMileage(record.mileage)}</span>
          </div>
          <div class="separator-info-item">
            <span class="separator-label">Importo registrato</span>
            <span class="separator-value">${formatCurrency(record.cost)}</span>
          </div>
          <div class="separator-info-item">
            <span class="separator-label">Veicolo associato</span>
            <span class="separator-value">${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} (${escapeHtml(vehicle.plate || '-')})</span>
          </div>
        </div>

        ${record.notes?.trim() ? `
        <div style="margin-top: 14px; padding-top: 10px; border-top: 1.5px solid #e2e8f0;">
          <div class="separator-label">Note intervento</div>
          <div style="font-size: 13.5px; color: #334155; margin-top: 3px; line-height: 1.4;">${escapeHtml(record.notes)}</div>
        </div>
        ` : ''}

        <div class="separator-file-callout">
          <div class="separator-file-icon">📄</div>
          <div>
            <div class="separator-file-name">${escapeHtml(fileName || 'allegato_manutenzione.pdf')}</div>
            <div class="separator-file-notice">Nelle pagine successive viene riprodotto integralmente il documento PDF originale allegato dall'utente.</div>
          </div>
        </div>
      </div>

      <div class="separator-footer">
        Il Mio Garage • Documentazione digitale per ${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} (${escapeHtml(vehicle.plate || '-')})
      </div>
    </div>
  `;
};

/**
 * Genera l'HTML di una singola scheda manutenzione per la lista principale.
 */
const buildMaintenanceCardHtml = (
  record: MaintenanceRecord,
  attachment?: DownloadedAttachment
): string => {
  let attachmentHtml = '';

  if (attachment) {
    if (attachment.kind === 'jpeg') {
      attachmentHtml = `
        <div class="attachment-preview">
          <div class="attachment-header">
            <span class="attachment-tag">FOTOGRAFIA ALLEGATA</span>
            <span class="attachment-title">Intervento: <strong>${escapeHtml(record.type)}</strong> del <strong>${formatDate(record.date)}</strong></span>
          </div>
          <div class="attachment-image-wrap">
            <img src="${attachment.base64DataUri}" class="attachment-img" alt="Fotografia manutenzione" />
          </div>
          ${attachment.fileName ? `<div class="attachment-filename">File: ${escapeHtml(attachment.fileName)}</div>` : ''}
        </div>
      `;
    } else if (attachment.kind === 'pdf') {
      attachmentHtml = `
        <div class="pdf-notice-box">
          <div class="pdf-notice-title">📄 Documento PDF allegato: ${escapeHtml(attachment.fileName || 'allegato.pdf')}</div>
          <div class="pdf-notice-desc">Il documento completo è inserito a seguire con apposita scheda identificativa «ALLEGATO DELL'INTERVENTO».</div>
        </div>
      `;
    } else if (attachment.kind === 'error') {
      attachmentHtml = `
        <div class="warning-box">
          ⚠️ <strong>Allegato non disponibile:</strong> ${escapeHtml(attachment.reason)}
        </div>
      `;
    }
  }

  return `
    <div class="maintenance-card">
      <div class="maintenance-top">
        <span class="type-badge">${escapeHtml(record.type)}</span>
        <span class="cost-badge">${formatCurrency(record.cost)}</span>
      </div>
      <div class="maintenance-meta-grid">
        <div class="meta-item">📅 Data: <strong>${formatDate(record.date)}</strong></div>
        <div class="meta-item">⏱️ Chilometri: <strong>${formatMileage(record.mileage)}</strong></div>
      </div>
      ${record.notes?.trim() ? `
        <div class="notes-box">
          <div class="notes-title">Note</div>
          <div>${escapeHtml(record.notes)}</div>
        </div>
      ` : ''}
      ${attachmentHtml}
    </div>
  `;
};

/**
 * Genera il file PDF completo dello storico manutenzioni, unendo le schede,
 * le pagine introduttive e gli allegati PDF originali.
 */
export const generateVehicleMaintenanceHistoryPdf = async (
  vehicle: Vehicle,
  fallbackRecords: MaintenanceRecord[],
  onProgress?: ExportProgressCallback
): Promise<GeneratePdfResult> => {
  onProgress?.('Verifica interventi in corso...');

  // 1. Recupero interventi aggiornati (da API se configurata, altrimenti fallback)
  let allRecords: MaintenanceRecord[] = fallbackRecords;
  if (apiClient.isConfigured) {
    try {
      const response = await maintenancesApi.listForVehicle(vehicle.id, { size: 500, sort: 'date,desc' });
      allRecords = response.items.map(fromApiMaintenance);
    } catch {
      allRecords = fallbackRecords;
    }
  }

  // Ordina dal più recente al meno recente
  const sortedRecords = [...allRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalCost = sortedRecords.reduce((sum, item) => sum + item.cost, 0);
  const attachmentFailures: AttachmentFailure[] = [];

  // 2. Download e preparazione degli allegati
  const attachmentsMap = new Map<string, DownloadedAttachment>();
  const recordsWithAttachment = sortedRecords.filter((r) => r.hasAttachment);

  if (recordsWithAttachment.length > 0) {
    for (let i = 0; i < recordsWithAttachment.length; i++) {
      const record = recordsWithAttachment[i];
      onProgress?.(
        `Download allegato ${i + 1} di ${recordsWithAttachment.length}...`,
        i + 1,
        recordsWithAttachment.length
      );

      const downloaded = await fetchRecordAttachment(record.id);
      attachmentsMap.set(record.id, downloaded);

      if (downloaded.kind === 'error') {
        attachmentFailures.push({
          maintenanceId: record.id,
          type: record.type,
          date: record.date,
          reason: downloaded.reason,
        });
      }
    }
  }

  onProgress?.('Composizione del documento PDF...');

  // 3. Generazione e assemblaggio PDF con pdf-lib ed expo-print
  const finalPdfDoc = await PDFDocument.create();

  // Caso speciale: Veicolo senza manutenzioni
  if (sortedRecords.length === 0) {
    const emptyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${getCommonCss()}</style>
      </head>
      <body>
        ${buildHeaderAndVehicleHtml(vehicle, sortedRecords, totalCost)}
        <div class="empty-state">
          Nessun intervento di manutenzione registrato per questo veicolo.
        </div>
        <div class="footer-meta">Documento generato da Il Mio Garage</div>
      </body>
      </html>
    `;

    const printResult = await Print.printToFileAsync({ html: emptyHtml, base64: true });
    const emptyDoc = await PDFDocument.load(base64ToUint8Array(printResult.base64 || ''));
    const copiedPages = await finalPdfDoc.copyPages(emptyDoc, emptyDoc.getPageIndices());
    copiedPages.forEach((p) => finalPdfDoc.addPage(p));
  } else {
    let currentChunkHtml = buildHeaderAndVehicleHtml(vehicle, sortedRecords, totalCost);

    const printAndAppendCurrentChunk = async (htmlContent: string) => {
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${getCommonCss()}</style>
        </head>
        <body>
          ${htmlContent}
          <div class="footer-meta">Documento generato da Il Mio Garage</div>
        </body>
        </html>
      `;

      const printResult = await Print.printToFileAsync({ html: fullHtml, base64: true });
      const chunkDoc = await PDFDocument.load(base64ToUint8Array(printResult.base64 || ''));
      const copied = await finalPdfDoc.copyPages(chunkDoc, chunkDoc.getPageIndices());
      copied.forEach((p) => finalPdfDoc.addPage(p));
    };

    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];
      const attachment = attachmentsMap.get(record.id);

      currentChunkHtml += buildMaintenanceCardHtml(record, attachment);

      if (attachment && attachment.kind === 'pdf') {
        // 1. Accoda la copertina formale dell'allegato al chunk corrente (avviata su pagina pulita)
        currentChunkHtml += buildPdfAttachmentSeparatorBlockHtml(vehicle, record, attachment.fileName);

        // 2. Stampa l'intero segmento (schede + copertina) in una singola operazione fluida
        await printAndAppendCurrentChunk(currentChunkHtml);
        currentChunkHtml = '';

        // 3. Copia e incorpora tutte le pagine originali del PDF allegato senza alterazioni
        try {
          const attachedDoc = await PDFDocument.load(attachment.bytes);
          const copiedPages = await finalPdfDoc.copyPages(attachedDoc, attachedDoc.getPageIndices());
          copiedPages.forEach((page) => finalPdfDoc.addPage(page));
        } catch (pdfErr) {
          attachmentFailures.push({
            maintenanceId: record.id,
            type: record.type,
            date: record.date,
            reason: pdfErr instanceof Error ? pdfErr.message : 'Impossibile leggere le pagine del PDF allegato.',
          });
        }
      }
    }

    // Se ci sono ancora interventi nel buffer finale, stampali
    if (currentChunkHtml.trim().length > 0) {
      await printAndAppendCurrentChunk(currentChunkHtml);
    }
  }

  onProgress?.('Finalizzazione documento...');

  // 4. Salvataggio su file temporaneo cache per preview / condivisione
  const finalPdfBase64 = await finalPdfDoc.saveAsBase64();
  const sanitizedPlate = sanitizeFileName(vehicle.plate || 'VEICOLO');
  const fileName = `storico-manutenzioni-${sanitizedPlate}.pdf`;
  const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const targetUri = `${targetDir}${fileName}`;

  await FileSystem.writeAsStringAsync(targetUri, finalPdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    success: true,
    filePath: targetUri,
    fileName,
    base64: finalPdfBase64,
    attachmentFailures,
  };
};

let cachedDownloadDirectoryUri: string | null = null;

/**
 * Salva il file PDF direttamente nella memoria del dispositivo tramite Android Storage Access Framework (SAF).
 * Tenta prima il salvataggio automatico nella cartella Download già autorizzata in sessione.
 * Se non ancora autorizzata, apre il selettore nativo pre-posizionato direttamente sulla cartella Download.
 * Gestisce l'annullamento pulito dell'utente senza sollevare eccezioni o errori.
 */
export const savePdfToDeviceAsync = async (
  base64Data: string,
  fileName: string
): Promise<SavePdfResult> => {
  try {
    if (Platform.OS === 'android') {
      const { StorageAccessFramework } = FileSystem;
      if (!StorageAccessFramework) {
        return { status: 'error', message: 'Storage Access Framework non disponibile su questo dispositivo.' };
      }

      const sanitizedName = fileName.replace(/\.pdf$/i, '');

      // 1. Tenta il salvataggio automatico se la cartella è già stata autorizzata
      if (cachedDownloadDirectoryUri) {
        try {
          const createdFileUri = await StorageAccessFramework.createFileAsync(
            cachedDownloadDirectoryUri,
            sanitizedName,
            'application/pdf'
          );
          await StorageAccessFramework.writeAsStringAsync(createdFileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return {
            status: 'saved',
            uri: createdFileUri,
            fileName: `${sanitizedName}.pdf`,
          };
        } catch {
          cachedDownloadDirectoryUri = null;
        }
      }

      // 2. Pre-posiziona il selettore sulla cartella Documenti (la cartella Download root è bloccata da Android 11+ per privacy)
      let permissions = null;
      try {
        const initialUri = StorageAccessFramework.getUriForDirectoryInRoot('Documents');
        permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
      } catch {
        // Alcune versioni di Android richiedono il selettore senza initialUri
        try {
          permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        } catch (pickerErr) {
          return {
            status: 'error',
            message: pickerErr instanceof Error ? pickerErr.message : 'Impossibile aprire il selettore di cartella.',
          };
        }
      }

      if (!permissions || !permissions.granted) {
        // L'utente ha annullato la selezione
        return { status: 'cancelled' };
      }

      // Memorizza la directory autorizzata per rendere automatici tutti i download successivi
      cachedDownloadDirectoryUri = permissions.directoryUri;

      const createdFileUri = await StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        sanitizedName,
        'application/pdf'
      );

      await StorageAccessFramework.writeAsStringAsync(createdFileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return {
        status: 'saved',
        uri: createdFileUri,
        fileName: `${sanitizedName}.pdf`,
      };
    } else {
      // Piattaforme diverse da Android (iOS / Web)
      const docUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ''}${fileName}`;
      await FileSystem.writeAsStringAsync(docUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return {
        status: 'saved',
        uri: docUri,
        fileName,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore imprevisto durante il salvataggio.';
    return { status: 'error', message };
  }
};

/**
 * Condivide il file PDF generato tramite la finestra di condivisione nativa del sistema.
 */
export const sharePdfAsync = async (
  filePath: string,
  dialogTitle: string = 'Condividi storico manutenzioni PDF'
): Promise<boolean> => {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
    return true;
  }
  return false;
};

/**
 * Funzione di esportazione unificata che genera il PDF e restituisce i dettagli
 * per il salvataggio o la condivisione.
 */
export const exportVehicleMaintenanceHistoryPdf = async (
  vehicle: Vehicle,
  fallbackRecords: MaintenanceRecord[],
  onProgress?: ExportProgressCallback
): Promise<GeneratePdfResult> => {
  return generateVehicleMaintenanceHistoryPdf(vehicle, fallbackRecords, onProgress);
};
