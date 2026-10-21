import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Eye, FileText, Image as ImageIcon, Trash2, X } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { ActionButton } from '../common/ActionButton';
import { AppDialog, AppDialogOptions } from '../common/AppDialog';
import { ApiError, apiClient } from '../../services/api/ApiClient';
import { ApiAttachmentMetadata } from '../../services/api/contracts';
import { attachmentsApi } from '../../services/api/api';
import {
  clearTemporaryAttachment,
  formatFileSize,
  isJpegSignature,
  isPdfSignature,
  MAX_ATTACHMENT_BYTES,
  PendingAttachment,
} from '../../services/api/attachments';
import { pickImageAttachment, pickPdfAttachment } from '../../utils/attachmentUtils';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { useApp } from '../../store/AppContext';

export type AttachmentSectionProps = {
  maintenanceId?: string;
  hasAttachmentInitial?: boolean;
  savingMaintenance?: boolean;
  readOnly?: boolean;
  onPendingUploadChange?: (upload: (() => Promise<boolean>) | null) => void;
  onAttachmentDeleted?: () => void;
};
type Operation = 'camera' | 'gallery' | 'pdf' | 'upload' | 'load' | 'delete' | null;

const errorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.code === 'API_NOT_CONFIGURED') return 'Collega il backend per gestire gli allegati.';
    if (error.code === 'NETWORK_ERROR') return 'Connessione non disponibile. Controlla la rete e riprova.';
    if (error.status === 401) return 'La sessione è scaduta. Accedi di nuovo e riprova.';
    if (error.status === 404) return 'Allegato o intervento non trovato.';
    if (error.status === 413) return 'Il file supera il limite consentito di 5 MB.';
    if (error.status >= 500) return 'Il server non è riuscito a completare l’operazione. Riprova più tardi.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Operazione non riuscita. Riprova.';
};

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'allegato';

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  maintenanceId,
  hasAttachmentInitial,
  savingMaintenance = false,
  readOnly = false,
  onPendingUploadChange,
  onAttachmentDeleted,
}) => {
  const { logout, setMaintenanceAttachmentState } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [metadata, setMetadata] = useState<ApiAttachmentMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(Boolean(hasAttachmentInitial));
  const [selected, setSelected] = useState<PendingAttachment | null>(null);
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const savedUriRef = useRef(savedUri);
  const uploadLockRef = useRef(false);
  savedUriRef.current = savedUri;
  const isFocused = useIsFocused();
  const prevFocusedRef = useRef(isFocused);
  const metadataRef = useRef<ApiAttachmentMetadata | null>(metadata);
  metadataRef.current = metadata;

  const reportError = (title: string, error: unknown) => {
    if (error instanceof ApiError && error.status === 401) void logout();
    setDialog({ title, message: errorMessage(error) });
  };

  const cleanupSavedUri = useCallback((uri: string | null) => {
    if (!uri) return;
    if (Platform.OS === 'web') URL.revokeObjectURL(uri);
    else {
      try { new ExpoFile(uri).delete(); } catch { /* cache cleanup is best effort */ }
    }
  }, []);

  const getSavedUri = useCallback(async (current: ApiAttachmentMetadata) => {
    if (__DEV__) {
      console.info('[Allegati visualizzazione] avvio recupero contenuto salvato', {
        maintenanceId: current.maintenanceId,
        fileName: current.fileName,
        declaredSize: current.fileSize,
        expectedType: current.contentType,
      });
    }

    const downloaded = await attachmentsApi.content(current.maintenanceId);

    if (__DEV__) {
      console.info('[Allegati visualizzazione] contenuto scaricato dal backend', {
        maintenanceId: current.maintenanceId,
        receivedByteLength: downloaded.bytes.byteLength,
        receivedContentType: downloaded.contentType,
      });
    }

    if (downloaded.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error('Il file ricevuto supera il limite previsto di 5 MB.');
    }
    if (downloaded.bytes.byteLength <= 0) {
      throw new Error('Il file ricevuto è vuoto (0 byte). Riprova.');
    }

    // Validazione basata sul contenuto binario (magic numbers)
    const isJpeg = current.contentType === 'image/jpeg';
    const isPdf = current.contentType === 'application/pdf';

    if (isJpeg && !isJpegSignature(downloaded.bytes)) {
      throw new Error('Il contenuto ricevuto non è un’immagine JPEG valida.');
    }
    if (isPdf && !isPdfSignature(downloaded.bytes)) {
      throw new Error('Il contenuto ricevuto non è un PDF valido (firma %PDF- assente).');
    }

    if (Platform.OS === 'web') {
      return URL.createObjectURL(new Blob([downloaded.bytes as unknown as BlobPart], { type: current.contentType }));
    }

    // Normalizziamo il nome file della cache rimuovendo spazi e caratteri speciali per piena compatibilità con FileProvider Android
    const cleanBaseName = (current.fileName || 'allegato')
      .replace(/[\\/:*?"<>|\s()]/g, '_')
      .slice(0, 60) || 'allegato';
    const ext = isPdf ? '.pdf' : '.jpg';
    const normalizedName = cleanBaseName.toLowerCase().endsWith(ext) ? cleanBaseName : `${cleanBaseName}${ext}`;

    const file = new ExpoFile(Paths.cache, `${Date.now()}-${normalizedName}`);
    file.create({ intermediates: true, overwrite: true });
    file.write(downloaded.bytes);

    if (__DEV__) {
      console.info('[Allegati visualizzazione] file cache creato con successo', {
        uri: file.uri,
        uriScheme: file.uri.split(':', 1)[0],
        exists: file.exists,
        fileSize: file.size,
      });
    }

    return file.uri;
  }, []);

  const loadMetadata = useCallback(async () => {
    if (!maintenanceId || !apiClient.isConfigured) {
      setLoadingMetadata(false);
      return;
    }
    setLoadingMetadata(true);
    try {
      const current = await attachmentsApi.metadata(maintenanceId);
      if (!current) {
        setMetadata(null);
        cleanupSavedUri(savedUriRef.current);
        savedUriRef.current = null;
        setSavedUri(null);
        setMaintenanceAttachmentState(maintenanceId, false);
        setLoadingMetadata(false);
        return;
      }

      // Se l'allegato è cambiato (diverso nome file, dimensione o ID), puliamo la cache precedente
      if (
        metadataRef.current?.fileName !== current.fileName ||
        metadataRef.current?.fileSize !== current.fileSize ||
        metadataRef.current?.id !== current.id
      ) {
        cleanupSavedUri(savedUriRef.current);
        savedUriRef.current = null;
        setSavedUri(null);
      }
      metadataRef.current = current;

      setMetadata(current);
      setMaintenanceAttachmentState(maintenanceId, true);
      setLoadingMetadata(false);

      // Se l'allegato è un'immagine JPEG, scarichiamo l'anteprima (thumbnail) in background senza bloccare la schermata
      if (current.contentType === 'image/jpeg') {
        try {
          const uri = await getSavedUri(current);
          setSavedUri(uri);
        } catch (error) {
          if (__DEV__) {
            console.warn('[Allegati visualizzazione] errore nel download dell’anteprima immagine', error);
          }
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setMetadata(null);
        cleanupSavedUri(savedUriRef.current);
        savedUriRef.current = null;
        setSavedUri(null);
        setMaintenanceAttachmentState(maintenanceId, false);
        return;
      }
      reportError('Allegato non disponibile', error);
    } finally {
      setLoadingMetadata(false);
    }
  }, [cleanupSavedUri, getSavedUri, maintenanceId, setMaintenanceAttachmentState]);

  useEffect(() => {
    void loadMetadata();
    return () => {
      cleanupSavedUri(savedUriRef.current);
      savedUriRef.current = null;
    };
  }, [loadMetadata, cleanupSavedUri]);

  useEffect(() => {
    if (readOnly && isFocused && !prevFocusedRef.current) {
      void loadMetadata();
    }
    prevFocusedRef.current = isFocused;
  }, [isFocused, readOnly, loadMetadata]);

  const showSelectionError = (error: unknown) => setDialog({ title: 'File non utilizzabile', message: errorMessage(error) });

  const setPhoto = async (fromCamera: boolean) => {
    if (operation) return;
    const action: Operation = fromCamera ? 'camera' : 'gallery';
    setOperation(action);
    try {
      const prepared = await pickImageAttachment(fromCamera ? 'camera' : 'library');
      if (!prepared) return;
      clearTemporaryAttachment(selected);
      setSelected(prepared);
    } catch (error) {
      showSelectionError(error);
    } finally {
      setOperation(null);
    }
  };

  const choosePdf = async () => {
    if (operation) return;
    setOperation('pdf');
    try {
      const prepared = await pickPdfAttachment();
      if (!prepared) return;
      clearTemporaryAttachment(selected);
      setSelected(prepared);
    } catch (error) {
      showSelectionError(error);
    } finally {
      setOperation(null);
    }
  };

  const upload = async () => {
    if (!maintenanceId || !selected || operation || uploadLockRef.current) return false;
    uploadLockRef.current = true;
    setOperation('upload');
    try {
      const saved = await attachmentsApi.upload(maintenanceId, selected);
      cleanupSavedUri(savedUri);
      setMetadata(saved);
      setSavedUri(selected.previewUri);
      setSelected(null);
      setMaintenanceAttachmentState(maintenanceId, true);
      return true;
    } catch (error) {
      reportError('Caricamento non riuscito', error);
      return false;
    } finally {
      uploadLockRef.current = false;
      setOperation(null);
    }
  };

  const removeSelection = () => {
    clearTemporaryAttachment(selected);
    setSelected(null);
  };

  const deleteSaved = async () => {
    if (!maintenanceId || operation) return;
    setOperation('delete');
    try {
      await attachmentsApi.remove(maintenanceId);
      cleanupSavedUri(savedUri);
      setSavedUri(null);
      setMetadata(null);
      setDialog(null);
      setMaintenanceAttachmentState(maintenanceId, false);
      onAttachmentDeleted?.();
    } catch (error) {
      reportError('Eliminazione non riuscita', error);
    } finally {
      setOperation(null);
    }
  };

  const openSaved = async () => {
    if (operation) return;
    const targetContentType = metadata?.contentType || selected?.type;
    const targetFileName = metadata?.fileName || selected?.name || 'allegato.pdf';
    let uri = savedUri || selected?.previewUri || selected?.uri;

    if (!uri && metadata) {
      setOperation('load');
      try {
        uri = await getSavedUri(metadata);
        setSavedUri(uri);
      } catch (error) {
        if (__DEV__) {
          console.error('[Allegati visualizzazione] recupero URI salvato fallito per openSaved:', error);
        }
        reportError('File non disponibile', error);
        setOperation(null);
        return;
      }
      setOperation(null);
    }

    if (!uri) return;

    if (targetContentType === 'image/jpeg') {
      setImagePreviewVisible(true);
      return;
    }

    try {
      if (Platform.OS === 'web') {
        window.open(uri, '_blank', 'noopener,noreferrer');
        return;
      }

      if (__DEV__) {
        console.info('[Allegati visualizzazione] avvio apertura PDF', {
          uri,
          uriScheme: uri.split(':', 1)[0],
          fileName: targetFileName,
        });
      }

      // Su Android, utilizziamo Intent.ACTION_VIEW con FLAG_GRANT_READ_URI_PERMISSION
      // in modo da aprire direttamente un'app lettore PDF (Google PDF Viewer, Acrobat, Drive)
      // anziché il foglio di condivisione generico.
      if (Platform.OS === 'android') {
        try {
          const contentUri = await LegacyFileSystem.getContentUriAsync(uri);
          if (__DEV__) {
            console.info('[Allegati visualizzazione] avvio IntentLauncher per visualizzazione PDF', { contentUri });
          }
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/pdf',
          });
          return;
        } catch (intentErr) {
          if (__DEV__) {
            console.warn('[Allegati visualizzazione] IntentLauncher ACTION_VIEW non riuscito, provo Sharing.shareAsync:', {
              errorName: intentErr instanceof Error ? intentErr.name : 'UnknownError',
              errorMessage: intentErr instanceof Error ? intentErr.message : String(intentErr),
            });
          }
        }
      }

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (__DEV__) {
        console.info('[Allegati visualizzazione] esito Sharing.isAvailableAsync:', sharingAvailable);
      }

      if (sharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: targetFileName || 'Apri fattura PDF',
          UTI: 'com.adobe.pdf',
        });
        return;
      }

      throw new Error('Questo dispositivo non dispone di un’app per aprire o visualizzare file PDF.');
    } catch (error) {
      if (__DEV__) {
        console.error('[Allegati visualizzazione] errore definitivo apertura PDF', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      reportError('PDF non apribile', error);
    }
  };

  const uploadFromMaintenanceSave = async () => {
    return upload();
  };

  useEffect(() => {
    onPendingUploadChange?.(selected && maintenanceId ? uploadFromMaintenanceSave : null);
    return () => onPendingUploadChange?.(null);
  }, [maintenanceId, onPendingUploadChange, selected]);

  const confirmDelete = () => setDialog({
    tone: 'danger',
    title: 'Eliminare l’allegato?',
    message: 'Verrà eliminato solo il file. I dati dell’intervento resteranno invariati.',
    confirmLabel: 'Elimina allegato',
    onConfirm: () => { void deleteSaved(); },
  });

  const busy = operation !== null || savingMaintenance;
  const backendReady = apiClient.isConfigured;
  const isSavedImage = metadata?.contentType === 'image/jpeg';
  const isSelectedImage = selected?.type === 'image/jpeg';

  // 1. Modalità di sola consultazione (Dettaglio Intervento)
  if (readOnly) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Allegato</Text>

        {loadingMetadata && hasAttachmentInitial ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento allegato in corso...</Text>
          </View>
        ) : metadata ? (
          <View style={styles.savedBlock}>
            {isSavedImage ? (
              savedUri ? (
                <Image source={{ uri: savedUri }} style={styles.thumbnail} resizeMode="cover" />
              ) : (
                <View style={styles.fileIcon}><ImageIcon size={22} color={colors.primary} /></View>
              )
            ) : (
              <View style={styles.fileIcon}><FileText size={22} color={colors.primary} /></View>
            )}
            <View style={styles.fileCopy}>
              <Text numberOfLines={2} style={styles.fileName}>{metadata.fileName}</Text>
              <Text style={styles.fileMeta}>{metadata.contentType === 'application/pdf' ? 'PDF' : 'JPEG'} · {formatFileSize(metadata.fileSize)}</Text>
              <Text style={styles.fileMeta}>Caricato il {new Date(metadata.createdAt).toLocaleDateString('it-IT')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSavedImage ? 'Visualizza foto' : 'Apri PDF'}
              onPress={() => { void openSaved(); }}
              disabled={busy}
              style={styles.iconAction}
            >
              {operation === 'load' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Eye size={20} color={colors.primary} />
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <FileText size={18} color={colors.muted} />
            <Text style={styles.emptyText}>Nessun allegato per questo intervento.</Text>
          </View>
        )}

        <Modal visible={imagePreviewVisible} transparent animationType="fade" onRequestClose={() => setImagePreviewVisible(false)}>
          <View style={styles.previewBackdrop}>
            <Pressable accessibilityRole="button" accessibilityLabel="Chiudi anteprima" onPress={() => setImagePreviewVisible(false)} style={styles.closePreview}>
              <X size={24} color={colors.white} />
            </Pressable>
            {savedUri ? <Image source={{ uri: savedUri }} style={styles.fullImage} resizeMode="contain" /> : null}
          </View>
        </Modal>

        <AppDialog
          visible={dialog !== null}
          title={dialog?.title ?? ''}
          message={dialog?.message ?? ''}
          tone={dialog?.tone}
          confirmLabel={dialog?.confirmLabel}
          cancelLabel={dialog?.cancelLabel}
          onConfirm={dialog?.onConfirm}
          onDismiss={() => setDialog(null)}
        />
      </View>
    );
  }

  // 2. Modalità di modifica/creazione (Massimo 1 allegato per intervento)
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Allegato</Text>
      <Text style={styles.description}>
        È possibile allegare un solo file per intervento (PDF o JPEG, max 5 MB).
      </Text>

      {loadingMetadata && hasAttachmentInitial ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento allegato in corso...</Text>
        </View>
      ) : null}

      {/* Caso A: Allegato già salvato sul backend -> Mostra anteprima e pulsante Elimina */}
      {metadata ? (
        <>
          <View style={styles.savedBlock}>
            {isSavedImage ? (
              savedUri ? (
                <Image source={{ uri: savedUri }} style={styles.thumbnail} resizeMode="cover" />
              ) : (
                <View style={styles.fileIcon}><ImageIcon size={22} color={colors.primary} /></View>
              )
            ) : (
              <View style={styles.fileIcon}><FileText size={22} color={colors.primary} /></View>
            )}
            <View style={styles.fileCopy}>
              <Text numberOfLines={2} style={styles.fileName}>{metadata.fileName}</Text>
              <Text style={styles.fileMeta}>{metadata.contentType === 'application/pdf' ? 'PDF' : 'JPEG'} · {formatFileSize(metadata.fileSize)}</Text>
              <Text style={styles.fileMeta}>Caricato il {new Date(metadata.createdAt).toLocaleDateString('it-IT')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSavedImage ? 'Visualizza foto' : 'Apri PDF'}
              onPress={() => { void openSaved(); }}
              disabled={busy}
              style={styles.iconAction}
            >
              {operation === 'load' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Eye size={20} color={colors.primary} />
              )}
            </Pressable>
          </View>
          <ActionButton
            title="Elimina allegato"
            variant="danger"
            onPress={confirmDelete}
            loading={operation === 'delete'}
            disabled={busy}
            style={styles.deleteButton}
          />
        </>
      ) : null}

      {/* Caso B: Nuovo file selezionato in locale */}
      {selected ? (
        <>
          <View style={styles.selectedBlock}>
            {isSelectedImage ? (
              <Image source={{ uri: selected.previewUri }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.fileIcon}><FileText size={22} color={colors.primary} /></View>
            )}
            <View style={styles.fileCopy}>
              <Text style={styles.stateLabel}>Nuovo file selezionato</Text>
              <Text numberOfLines={2} style={styles.fileName}>{selected.name}</Text>
              <Text style={styles.fileMeta}>{formatFileSize(selected.size)} · {selected.type === 'application/pdf' ? 'PDF' : 'JPEG'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rimuovi selezione"
              onPress={removeSelection}
              disabled={busy}
              style={styles.iconAction}
            >
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>
          {!onPendingUploadChange ? (
            <ActionButton
              title="Carica allegato"
              loading={operation === 'upload'}
              loadingTitle="Caricamento..."
              disabled={!backendReady || !maintenanceId || busy}
              onPress={() => { void upload(); }}
              style={styles.uploadButton}
            />
          ) : (
            <Text style={styles.hint}>L’allegato verrà caricato al salvataggio della manutenzione.</Text>
          )}
        </>
      ) : null}

      {/* Caso C: Nessun allegato presente né selezionato -> compaiono i 3 pulsanti di scelta */}
      {!loadingMetadata && !metadata && !selected ? (
        <>
          <View style={styles.emptyState}>
            <FileText size={18} color={colors.muted} />
            <Text style={styles.emptyText}>Nessun allegato aggiunto.</Text>
          </View>

          {!backendReady ? (
            <Text style={styles.hint}>Il caricamento sarà disponibile quando il backend sarà configurato.</Text>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              title="Scatta una foto"
              variant="secondary"
              onPress={() => { void setPhoto(true); }}
              loading={operation === 'camera'}
              disabled={busy}
              style={styles.actionButton}
            />
            <ActionButton
              title="Scegli dalla galleria"
              variant="secondary"
              onPress={() => { void setPhoto(false); }}
              loading={operation === 'gallery'}
              disabled={busy}
              style={styles.actionButton}
            />
            <ActionButton
              title="Seleziona un PDF"
              variant="secondary"
              onPress={() => { void choosePdf(); }}
              loading={operation === 'pdf'}
              disabled={busy}
              style={styles.actionButton}
            />
          </View>
        </>
      ) : null}

      <Modal visible={imagePreviewVisible} transparent animationType="fade" onRequestClose={() => setImagePreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Chiudi anteprima" onPress={() => setImagePreviewVisible(false)} style={styles.closePreview}>
            <X size={24} color={colors.white} />
          </Pressable>
          {savedUri ? <Image source={{ uri: savedUri }} style={styles.fullImage} resizeMode="contain" /> : null}
        </View>
      </Modal>

      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        tone={dialog?.tone}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm}
        onDismiss={() => setDialog(null)}
      />
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    marginTop: appSpacing.md,
    padding: appSpacing.md,
  },
  heading: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 17 },
  description: { color: colors.muted, fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 18, marginTop: 4 },
  emptyState: { alignItems: 'center', flexDirection: 'row', gap: appSpacing.sm, marginTop: appSpacing.md },
  emptyText: { color: colors.muted, flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 12 },
  loadingBlock: { alignItems: 'center', flexDirection: 'row', gap: appSpacing.sm, marginTop: appSpacing.md, paddingVertical: appSpacing.sm },
  loadingText: { color: colors.muted, fontFamily: 'Manrope_500Medium', fontSize: 12 },
  savedBlock: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: appRadius.sm, flexDirection: 'row', gap: appSpacing.sm, marginTop: appSpacing.md, padding: appSpacing.sm },
  selectedBlock: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.primary, borderRadius: appRadius.sm, borderWidth: 1, flexDirection: 'row', gap: appSpacing.sm, marginTop: appSpacing.md, padding: appSpacing.sm },
  thumbnail: { backgroundColor: colors.border, borderRadius: appRadius.sm, height: 56, width: 56 },
  fileIcon: { alignItems: 'center', backgroundColor: colors.card, borderRadius: appRadius.sm, height: 48, justifyContent: 'center', width: 48 },
  fileCopy: { flex: 1, minWidth: 0 },
  fileName: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 12 },
  fileMeta: { color: colors.muted, fontFamily: 'Manrope_500Medium', fontSize: 10, marginTop: 2 },
  stateLabel: { color: colors.primary, fontFamily: 'Manrope_700Bold', fontSize: 10, marginBottom: 2 },
  iconAction: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  hint: { color: colors.muted, fontFamily: 'Manrope_500Medium', fontSize: 11, lineHeight: 16, marginTop: appSpacing.sm },
  actions: { gap: appSpacing.xs, marginTop: appSpacing.md },
  actionButton: { minHeight: 42, paddingVertical: 9 },
  uploadButton: { marginTop: appSpacing.sm },
  deleteButton: { marginTop: appSpacing.sm },
  savedActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: appSpacing.md, marginTop: appSpacing.md },
  textAction: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingVertical: 5 },
  textActionLabel: { color: colors.primary, fontFamily: 'Manrope_700Bold', fontSize: 12 },
  deleteLabel: { color: colors.danger, fontFamily: 'Manrope_700Bold', fontSize: 12 },
  busyLabel: { color: colors.muted, fontFamily: 'Manrope_500Medium', fontSize: 11, width: '100%' },
  previewBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.94)', flex: 1, justifyContent: 'center', padding: appSpacing.md },
  closePreview: { alignItems: 'center', alignSelf: 'flex-end', height: 48, justifyContent: 'center', width: 48 },
  fullImage: { flex: 1, width: '100%' },
});
