import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { PendingAttachment, formatFileSize, preparePdf, preparePhoto, MAX_ATTACHMENT_BYTES } from '../services/api/attachments';

export const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_BYTES;
export type PickedAttachment = PendingAttachment;

export class AttachmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentValidationError';
  }
}

export { formatFileSize };

export const pickImageAttachment = async (source: 'camera' | 'library'): Promise<PickedAttachment | null> => {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AttachmentValidationError(source === 'camera'
      ? 'Permesso fotocamera non concesso. Puoi scegliere una foto dalla galleria o un PDF.'
      : 'Permesso galleria non concesso. Puoi scattare una foto o scegliere un PDF.');
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  try {
    return await preparePhoto(result.assets[0]);
  } catch (error) {
    throw new AttachmentValidationError(error instanceof Error ? error.message : 'Non è stato possibile preparare la fotografia.');
  }
};

export const pickPdfAttachment = async (): Promise<PickedAttachment | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    if (__DEV__) {
      console.info('[Allegati PDF] picker annullato o nessun file selezionato', {
        canceled: result.canceled,
      });
    }
    return null;
  }

  const asset = result.assets[0];
  if (__DEV__) {
    console.info('[Allegati PDF] asset restituito dal picker:', {
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
      uriScheme: asset.uri ? asset.uri.split(':', 1)[0] : 'none',
    });
  }

  try {
    return await preparePdf(asset.uri, asset.name, asset.mimeType, asset.size);
  } catch (error) {
    if (__DEV__) {
      console.error('[Allegati PDF] eccezione durante preparePdf:', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    throw new AttachmentValidationError(error instanceof Error ? error.message : 'Il documento PDF non è valido o non è leggibile.');
  }
};
