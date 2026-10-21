import { Platform } from 'react-native';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import { AttachmentUploadFile } from './api';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type PendingAttachment = AttachmentUploadFile & {
  size: number;
  previewUri: string;
};

export const formatFileSize = (size: number) => size < 1024 * 1024
  ? `${Math.max(1, Math.round(size / 1024))} KB`
  : `${(size / (1024 * 1024)).toFixed(1)} MB`;

const createWebFile = async (uri: string, name: string, type: string) => {
  if (Platform.OS !== 'web') return undefined;
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Non riesco a leggere il file selezionato. Scegline un altro.');
  return new File([await response.blob()], name, { type });
};

const readSignature = async (uri: string, count: number): Promise<Uint8Array> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Non riesco a leggere il file selezionato. Scegline un altro.');
    return new Uint8Array(await response.arrayBuffer()).slice(0, count);
  }

  try {
    const file = new ExpoFile(uri);
    const bytes = await file.bytes();
    return bytes.slice(0, count);
  } catch {
    try {
      const response = await fetch(uri);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer).slice(0, count);
      }
    } catch {
      // ignore and try legacy
    }

    try {
      const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
        encoding: LegacyFileSystem.EncodingType.Base64,
        length: count,
      });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch {
      throw new Error('Il file selezionato non è più disponibile. Scegline un altro.');
    }
  }
};

const getFileSize = async (uri: string): Promise<number> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Non riesco a leggere il file selezionato. Scegline un altro.');
    return (await response.blob()).size;
  }
  try {
    const file = new ExpoFile(uri);
    if (file.exists && typeof file.size === 'number' && file.size > 0) {
      return file.size;
    }
  } catch {
    // fallback to legacy
  }
  try {
    const info = await LegacyFileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number') {
      return info.size;
    }
  } catch {
    // fallback
  }
  throw new Error('Il file selezionato non è più disponibile. Scegline un altro.');
};

type ReadPdfResult = {
  bytes: Uint8Array;
  method: 'ExpoFile.bytes' | 'fetch.arrayBuffer' | 'LegacyFileSystem.readAsStringAsync';
};

const readPdfBytes = async (uri: string): Promise<ReadPdfResult> => {
  let fetchError: unknown;
  let expoFileError: unknown;
  let legacyError: unknown;

  // Tentativo 1: React Native fetch (supporta nativamente content:// e file:// via ContentResolver Android senza restrizioni di sandbox)
  try {
    const response = await fetch(uri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.byteLength > 0) {
        return { bytes, method: 'fetch.arrayBuffer' };
      }
    }
  } catch (err) {
    fetchError = err;
  }

  // Tentativo 2: ExpoFile.bytes() nativo
  try {
    const file = new ExpoFile(uri);
    const bytes = await file.bytes();
    if (bytes && bytes.byteLength > 0) {
      return { bytes, method: 'ExpoFile.bytes' };
    }
  } catch (err) {
    expoFileError = err;
  }

  // Tentativo 3: LegacyFileSystem.readAsStringAsync (base64)
  try {
    const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });
    if (base64) {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      if (bytes.byteLength > 0) {
        return { bytes, method: 'LegacyFileSystem.readAsStringAsync' };
      }
    }
  } catch (err) {
    legacyError = err;
  }

  const detailedCause = [
    fetchError instanceof Error ? `fetch: ${fetchError.message}` : null,
    expoFileError instanceof Error ? `ExpoFile: ${expoFileError.message}` : null,
    legacyError instanceof Error ? `legacy: ${legacyError.message}` : null,
  ].filter(Boolean).join('; ');

  throw new Error(`Impossibile leggere il file PDF (${detailedCause || 'accesso negato o file non trovato'}).`);
};

export const preparePhoto = async (asset: ImagePickerAsset): Promise<PendingAttachment> => {
  if (!asset.uri) throw new Error('La foto selezionata non è disponibile. Riprova.');

  const maxSide = 2000;
  const longestSide = Math.max(asset.width, asset.height);
  const resize = longestSide > maxSide
    ? { width: Math.round(asset.width * maxSide / longestSide), height: Math.round(asset.height * maxSide / longestSide) }
    : undefined;
  const actions = resize ? [{ resize }] : [];
  const name = `foto-intervento-${Date.now()}.jpg`;
  let resultUri: string | undefined;
  try {
    let result = await manipulateAsync(asset.uri, actions, { compress: 0.88, format: SaveFormat.JPEG });
    resultUri = result.uri;
    let size = await getFileSize(result.uri);

    if (size > MAX_ATTACHMENT_BYTES) {
      try { new ExpoFile(result.uri).delete(); } catch { /* cache cleanup is best effort */ }
      result = await manipulateAsync(asset.uri, actions, { compress: 0.74, format: SaveFormat.JPEG });
      resultUri = result.uri;
      size = await getFileSize(result.uri);
    }
    if (size > MAX_ATTACHMENT_BYTES) {
      throw new Error('La foto supera i 5 MB anche dopo l’ottimizzazione. Prova con un’immagine diversa.');
    }

    const signature = await readSignature(result.uri, 3);
    if (signature[0] !== 0xff || signature[1] !== 0xd8 || signature[2] !== 0xff) {
      throw new Error('Non è stato possibile convertire la foto in JPEG. Riprova con un’altra immagine.');
    }

    return {
      uri: result.uri,
      previewUri: result.uri,
      name,
      type: 'image/jpeg',
      size,
      webFile: await createWebFile(result.uri, name, 'image/jpeg'),
    };
  } catch (error) {
    if (resultUri) {
      try {
        if (Platform.OS === 'web') {
          if (resultUri.startsWith('blob:')) URL.revokeObjectURL(resultUri);
        } else new ExpoFile(resultUri).delete();
      } catch { /* cache cleanup is best effort */ }
    }
    throw error;
  }
};

export const preparePdf = async (uri: string, name: string, mimeType?: string, reportedSize?: number): Promise<PendingAttachment> => {
  const rawName = name?.trim() || 'documento.pdf';
  const normalizedName = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
  const isPdfExtension = normalizedName.toLowerCase().endsWith('.pdf');
  const isPdfMime = mimeType === 'application/pdf' || mimeType === 'application/x-pdf';
  if (!isPdfExtension && !isPdfMime) {
    throw new Error('Seleziona un documento PDF valido.');
  }

  let targetFile: ExpoFile | null = null;
  let targetUri = uri;

  try {
    // 1. Lettura dei byte dall'URI sorgente (gestisce content://, file:// e blob)
    const { bytes, method: usedMethod } = await readPdfBytes(uri);

    if (__DEV__) {
      console.info('[Allegati PDF] lettura byte completata', {
        method: usedMethod,
        bytesLength: bytes.byteLength,
        declaredSize: reportedSize,
      });
    }

    // 2. Controllo dimensione
    if (!Number.isFinite(bytes.byteLength) || bytes.byteLength <= 0) {
      throw new Error('Il documento selezionato è vuoto (0 byte). Seleziona un altro PDF.');
    }
    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error('Il PDF supera il limite di 5 MB. Selezionane uno più piccolo.');
    }

    // 3. Controllo firma PDF (%PDF-)
    const signatureText = String.fromCharCode(...bytes.slice(0, 5));
    if (!signatureText.startsWith('%PDF-')) {
      if (__DEV__) {
        console.warn('[Allegati PDF] firma non valida:', {
          signatureSlice: signatureText,
        });
      }
      throw new Error('Il file selezionato non contiene un documento PDF valido (firma %PDF- mancante).');
    }

    // 4. Copia controllata nella cache dell'app per native
    if (Platform.OS !== 'web') {
      targetFile = new ExpoFile(Paths.cache, `allegato-intervento-${Date.now()}.pdf`);
      targetFile.create({ intermediates: true, overwrite: true });
      targetFile.write(bytes);
      targetUri = targetFile.uri;

      if (__DEV__) {
        console.info('[Allegati PDF] file cache proprietario creato', {
          targetUriScheme: targetUri.split(':', 1)[0],
          exists: targetFile.exists,
          fileSize: targetFile.size,
        });
      }
    }

    return {
      uri: targetUri,
      previewUri: targetUri,
      name: normalizedName,
      type: 'application/pdf',
      size: bytes.byteLength,
      webFile: await createWebFile(targetUri, normalizedName, 'application/pdf'),
    };
  } catch (error) {
    if (targetFile) {
      try { targetFile.delete(); } catch { /* best effort cleanup */ }
    }
    if (__DEV__) {
      console.error('[Allegati PDF] fallimento preparazione allegato', {
        stage: targetFile ? 'cache-creation-or-validation' : 'byte-reading',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
};

export const clearTemporaryAttachment = (attachment?: PendingAttachment | null) => {
  if (!attachment) return;
  if (Platform.OS === 'web') {
    if (attachment.uri.startsWith('blob:')) URL.revokeObjectURL(attachment.uri);
    return;
  }
  try { new ExpoFile(attachment.uri).delete(); } catch { /* temporary cache cleanup is best effort */ }
};

export const isJpegSignature = (bytes: Uint8Array) =>
  bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export const isPdfSignature = (bytes: Uint8Array) =>
  String.fromCharCode(...bytes.slice(0, 5)).startsWith('%PDF-');
