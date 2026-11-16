import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CalendarRange,
  ChevronRight,
  CircleDollarSign,
  FileDown,
  Gauge,
  History,
  PencilLine,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react-native';
import { ActionButton } from '../../components/common/ActionButton';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import {
  formatCurrency,
  formatDate,
  formatMileage,
  getVehicleRecords,
  getVehicleTotalCost,
} from '../../utils/maintenance';
import {
  exportVehicleMaintenanceHistoryPdf,
  savePdfToDeviceAsync,
  sharePdfAsync,
  GeneratePdfResult,
} from '../../services/pdf/pdfExportService';

type Props = NativeStackScreenProps<any>;

export const VehicleDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleId } = route.params ?? {};
  const { vehicles, maintenanceRecords, deleteVehicle } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [dialog, setDialog] = React.useState<AppDialogOptions | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState<string | null>(null);
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  if (!vehicle) {
    return (
      <ScreenShell>
        <Text style={styles.title}>Veicolo non trovato</Text>
      </ScreenShell>
    );
  }

  const records = getVehicleRecords(vehicle.id, maintenanceRecords);
  const totalCost = getVehicleTotalCost(vehicle.id, maintenanceRecords);

  const showPdfReadyDialog = (result: GeneratePdfResult) => {
    const failuresNote =
      result.attachmentFailures.length > 0
        ? `\n\nNota: i seguenti allegati non sono stati inclusi:\n` +
          result.attachmentFailures.map((f) => `• ${f.type} (${formatDate(f.date)}): ${f.reason}`).join('\n')
        : '';

    setDialog({
      tone: 'success',
      title: 'Storico PDF pronto',
      message: `Il documento "${result.fileName}" è pronto (${records.length} interventi inclusi).${failuresNote}\n\nPuoi salvarlo nella memoria del telefono oppure condividerlo subito tramite app.`,
      confirmLabel: 'Salva sul dispositivo',
      secondaryLabel: 'Condividi',
      cancelLabel: undefined,
      onConfirm: () => {
        void handleSaveToDevice(result);
      },
      onSecondary: () => {
        void handleShareFile(result);
      },
    });
  };

  const handleSaveToDevice = async (pdfResult: GeneratePdfResult) => {
    try {
      const saveRes = await savePdfToDeviceAsync(pdfResult.base64, pdfResult.fileName);
      if (saveRes.status === 'saved') {
        setDialog({
          tone: 'success',
          title: 'File salvato sul dispositivo',
          message: `✓ Il documento "${saveRes.fileName}" è stato salvato con successo nella cartella selezionata.\n\nVuoi condividerlo subito anche con un'altra app (es. WhatsApp, Email, Drive)?`,
          confirmLabel: 'Condividi ora',
          secondaryLabel: 'Fine',
          onConfirm: () => {
            void handleShareFile(pdfResult);
          },
          onSecondary: () => {
            setDialog(null);
          },
        });
      } else if (saveRes.status === 'cancelled') {
        showPdfReadyDialog(pdfResult);
      } else if (saveRes.status === 'error') {
        setDialog({
          tone: 'danger',
          title: 'Errore di salvataggio',
          message: saveRes.message,
          confirmLabel: 'Riprova',
          secondaryLabel: 'Condividi invece',
          onConfirm: () => {
            void handleSaveToDevice(pdfResult);
          },
          onSecondary: () => {
            void handleShareFile(pdfResult);
          },
        });
      }
    } catch (err) {
      setDialog({
        tone: 'danger',
        title: 'Errore di salvataggio',
        message: err instanceof Error ? err.message : 'Impossibile completare il salvataggio del file.',
        confirmLabel: 'Chiudi',
      });
    }
  };

  const handleShareFile = async (pdfResult: GeneratePdfResult) => {
    try {
      const success = await sharePdfAsync(
        pdfResult.filePath,
        `Storico manutenzioni ${vehicle.brand} ${vehicle.model} (${vehicle.plate || ''})`
      );
      if (!success) {
        setDialog({
          tone: 'info',
          title: 'Condivisione non disponibile',
          message: 'La funzionalità di condivisione non è supportata su questo dispositivo.',
          confirmLabel: 'Chiudi',
        });
      } else {
        setDialog({
          tone: 'success',
          title: 'Storico PDF',
          message: `Documento "${pdfResult.fileName}".\n\nDesideri salvare anche una copia nella memoria del dispositivo?`,
          confirmLabel: 'Salva sul dispositivo',
          secondaryLabel: 'Fine',
          onConfirm: () => {
            void handleSaveToDevice(pdfResult);
          },
          onSecondary: () => {
            setDialog(null);
          },
        });
      }
    } catch (err) {
      setDialog({
        tone: 'danger',
        title: 'Errore nella condivisione',
        message: err instanceof Error ? err.message : 'Impossibile aprire la finestra di condivisione.',
        confirmLabel: 'Chiudi',
      });
    }
  };

  const handleExportPdf = async () => {
    if (isExporting || !vehicle) return;

    if (records.length === 0) {
      setDialog({
        tone: 'info',
        title: 'Nessuna manutenzione',
        message: 'Non ci sono ancora manutenzioni da esportare. Registra il primo intervento per generare il PDF.',
        confirmLabel: 'Aggiungi manutenzione',
        cancelLabel: 'Chiudi',
        onConfirm: () => {
          navigation.navigate('MaintenanceForm', { vehicleId: vehicle.id, mode: 'create' });
        },
      });
      return;
    }
    setIsExporting(true);
    setExportProgress('Avvio esportazione...');

    try {
      const result = await exportVehicleMaintenanceHistoryPdf(
        vehicle,
        records,
        (step) => setExportProgress(step)
      );

      showPdfReadyDialog(result);
    } catch (error) {
      setDialog({
        tone: 'danger',
        title: 'Esportazione non riuscita',
        message: error instanceof Error ? error.message : 'Si è verificato un errore imprevisto durante la generazione del PDF.',
        confirmLabel: 'Chiudi',
      });
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const removeVehicle = async () => {
    try {
      await deleteVehicle(vehicle.id);
      navigation.goBack();
    } catch (error) {
      setDialog({
        title: 'Eliminazione non riuscita',
        message: error instanceof Error ? error.message : 'Riprova tra poco.',
      });
    }
  };

  const handleDeleteVehicle = () => {
    setDialog({
      tone: 'danger',
      title: 'Elimina veicolo',
      message: 'Vuoi rimuovere questo veicolo e le attività associate? L’operazione non può essere annullata.',
      confirmLabel: 'Elimina',
      onConfirm: () => { void removeVehicle(); },
    });
  };

  return (
    <ScreenShell>
      {/* Intestazione di navigazione */}
      <ScreenContextHeader label="SCHEDA VEICOLO" onBack={() => navigation.goBack()} />

      {/* 1. Hero Card: Identità del Veicolo */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <VehicleIconView icon={vehicle.icon} size={28} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {vehicle.brand} {vehicle.model}
            </Text>
            <Text style={styles.heroSubtitle}>
              {vehicle.year ? `Anno ${vehicle.year}` : 'Veicolo registrato'}
            </Text>
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroBottomRow}>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{vehicle.plate || 'SENZA TARGA'}</Text>
          </View>
          <View style={styles.heroMileageSnippet}>
            <Gauge size={15} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.heroMileageText} numberOfLines={1}>
              {formatMileage(vehicle.mileage)}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Metriche del Veicolo (2 card bilanciate ed equilibrate) */}
      <View style={styles.metricsRow}>
        {/* Ultimo Intervento */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <CalendarRange size={18} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {records[0] ? formatDate(records[0].date) : 'Nessuno'}
          </Text>
          <Text style={styles.metricLabel} numberOfLines={1}>
            Ultimo intervento
          </Text>
        </View>

        {/* Costi Totali */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <CircleDollarSign size={18} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.metricValue, styles.metricHighlight]} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(totalCost)}
          </Text>
          <Text style={styles.metricLabel} numberOfLines={1}>
            Totale spese
          </Text>
        </View>
      </View>

      {/* 3. Gerarchia delle Azioni: Primaria + Azioni Secondarie Affiancate */}
      <View style={styles.actionsBlock}>
        <ActionButton
          title="Aggiungi manutenzione"
          icon={<Plus size={18} color={colors.white} strokeWidth={2.4} />}
          onPress={() => navigation.navigate('MaintenanceForm', { vehicleId: vehicle.id, mode: 'create' })}
          style={styles.primaryActionButton}
        />

        <View style={styles.secondaryActionsRow}>
          <View style={styles.secondaryActionCol}>
            <ActionButton
              title="Aggiorna km"
              variant="secondary"
              icon={<Gauge size={15} color={colors.primary} strokeWidth={2} />}
              onPress={() => navigation.navigate('VehicleForm', { mode: 'mileage', vehicleId: vehicle.id })}
            />
          </View>
          <View style={styles.secondaryActionCol}>
            <ActionButton
              title="Modifica veicolo"
              variant="secondary"
              icon={<PencilLine size={15} color={colors.primary} strokeWidth={2} />}
              onPress={() => navigation.navigate('VehicleForm', { mode: 'edit', vehicleId: vehicle.id })}
            />
          </View>
        </View>
      </View>

      {/* 4. Attività Recenti */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Attività recenti</Text>
          {records.length > 0 ? (
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>{records.length}</Text>
            </View>
          ) : null}
        </View>
        {records.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Vedi tutti i ${records.length} interventi`}
            onPress={() => navigation.navigate('MaintenanceHistory', { vehicleId: vehicle.id })}
            style={({ pressed }) => [styles.seeAllButton, pressed && styles.seeAllButtonPressed]}
            hitSlop={8}
          >
            <Text style={styles.seeAllText}>Vedi tutte</Text>
            <ChevronRight size={14} color={colors.primary} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {records.length > 0 ? (
        <View style={styles.activitiesList}>
          {records.slice(0, 2).map((record) => (
            <MaintenanceItem
              key={record.id}
              record={record}
              onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })}
            />
          ))}
        </View>
      ) : (
        /* Stato vuoto curato ed elegante */
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Wrench size={26} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Nessun intervento registrato</Text>
          <Text style={styles.emptySubtitle}>
            Registra il primo tagliando, cambio olio o spesa per iniziare a costruire lo storico di questo veicolo.
          </Text>
          <ActionButton
            title="Registra primo intervento"
            size="compact"
            icon={<Plus size={15} color={colors.white} strokeWidth={2.4} />}
            onPress={() => navigation.navigate('MaintenanceForm', { vehicleId: vehicle.id, mode: 'create' })}
            style={styles.emptyButton}
          />
        </View>
      )}

      {/* 5. Sezione Storico e Documenti */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Storico e Documenti</Text>
      </View>

      <View style={styles.documentsCard}>
        <View style={styles.documentHeaderRow}>
          <View style={styles.documentIconWrap}>
            <FileDown size={20} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.documentCopy}>
            <Text style={styles.documentTitle}>Archivio documentale</Text>
            <Text style={styles.documentSubtitle}>
              Esporta lo storico completo in formato PDF o consulta l'elenco cronologico degli interventi.
            </Text>
          </View>
        </View>

        <View style={styles.documentButtons}>
          <ActionButton
            title={isExporting ? (exportProgress || 'Generazione PDF...') : 'Esporta storico PDF'}
            variant="secondary"
            icon={<FileDown size={16} color={colors.primary} strokeWidth={2} />}
            loading={isExporting}
            loadingTitle={exportProgress || 'Generazione PDF...'}
            disabled={isExporting}
            onPress={handleExportPdf}
            style={styles.documentActionButton}
          />

          <ActionButton
            title="Apri storico completo"
            variant="secondary"
            icon={<History size={16} color={colors.primary} strokeWidth={2} />}
            onPress={() => navigation.navigate('MaintenanceHistory', { vehicleId: vehicle.id })}
            style={styles.documentActionButton}
          />
        </View>
      </View>

      {/* 6. Gestione ed Eliminazione Veicolo (Zona Cautela separata) */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerEyebrow}>GESTIONE VEICOLO</Text>
        <ActionButton
          title="Elimina veicolo"
          variant="danger"
          icon={<Trash2 size={16} color={colors.danger} strokeWidth={2} />}
          onPress={handleDeleteVehicle}
        />
      </View>

      {/* Dialog Modale per Conferme, Informazioni ed Errori */}
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        tone={dialog?.tone}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        secondaryLabel={dialog?.secondaryLabel}
        onSecondary={dialog?.onSecondary}
        showCloseButton={dialog?.showCloseButton}
        onConfirm={dialog?.onConfirm}
        onDismiss={() => setDialog(null)}
      />
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    title: {
      ...appTypography.title,
      color: colors.text,
      marginVertical: appSpacing.md,
    },
    /* 1. Hero Card Veicolo */
    heroCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      marginTop: appSpacing.xs,
      ...appShadows.subtle,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroIconWrap: {
      width: 56,
      height: 56,
      borderRadius: appRadius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: appSpacing.md,
    },
    heroCopy: {
      flex: 1,
      justifyContent: 'center',
    },
    heroTitle: {
      ...appTypography.heading,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
    },
    heroSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      marginTop: 2,
    },
    heroDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: appSpacing.sm + 2,
    },
    heroBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.xs,
    },
    plateBadge: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: appRadius.sm,
      borderWidth: 1.5,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 3,
    },
    plateText: {
      color: colors.text,
      fontSize: 13,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    heroMileageSnippet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: appRadius.sm,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 4,
    },
    heroMileageText: {
      ...appTypography.caption,
      color: colors.text,
      fontFamily: 'Manrope_700Bold',
      fontSize: 13,
    },

    /* 2. Metriche del Veicolo */
    metricsRow: {
      flexDirection: 'row',
      gap: appSpacing.sm,
      marginBottom: appSpacing.md,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.md,
      borderWidth: 1,
      paddingVertical: appSpacing.md,
      paddingHorizontal: appSpacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      ...appShadows.subtle,
      minHeight: 96,
    },
    metricIconWrap: {
      width: 34,
      height: 34,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    metricValue: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
      textAlign: 'center',
      width: '100%',
    },
    metricHighlight: {
      color: colors.primary,
    },
    metricLabel: {
      fontSize: 11,
      color: colors.muted,
      fontFamily: 'Manrope_600SemiBold',
      textAlign: 'center',
      marginTop: 2,
    },

    /* 3. Azioni */
    actionsBlock: {
      marginBottom: appSpacing.lg,
      gap: appSpacing.xs,
    },
    primaryActionButton: {
      marginBottom: 2,
    },
    secondaryActionsRow: {
      flexDirection: 'row',
      gap: appSpacing.xs,
    },
    secondaryActionCol: {
      flex: 1,
    },

    /* 4. Attività Recenti */
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: appSpacing.sm,
      marginTop: appSpacing.xs,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
    },
    sectionTitle: {
      ...appTypography.sectionTitle,
      color: colors.text,
      fontSize: 17,
      fontFamily: 'Manrope_700Bold',
    },
    counterBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: appRadius.full,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    counterBadgeText: {
      color: colors.primary,
      fontSize: 11,
      fontFamily: 'Manrope_700Bold',
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    seeAllButtonPressed: {
      opacity: 0.6,
    },
    seeAllText: {
      color: colors.primary,
      fontSize: 12,
      fontFamily: 'Manrope_700Bold',
    },
    activitiesList: {
      marginBottom: appSpacing.md,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.lg,
      alignItems: 'center',
      marginBottom: appSpacing.lg,
      ...appShadows.subtle,
    },
    emptyIconWrap: {
      width: 48,
      height: 48,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: appSpacing.sm,
    },
    emptyTitle: {
      ...appTypography.cardTitle,
      color: colors.text,
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 4,
    },
    emptySubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: appSpacing.md,
      maxWidth: 280,
    },
    emptyButton: {
      minWidth: 180,
    },

    /* 5. Storico e Documenti */
    documentsCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginBottom: appSpacing.xl,
      ...appShadows.subtle,
    },
    documentHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      marginBottom: appSpacing.md,
    },
    documentIconWrap: {
      width: 42,
      height: 42,
      borderRadius: appRadius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    documentCopy: {
      flex: 1,
    },
    documentTitle: {
      ...appTypography.cardTitle,
      color: colors.text,
      fontSize: 14,
      fontFamily: 'Manrope_700Bold',
    },
    documentSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 1,
    },
    documentButtons: {
      gap: appSpacing.xs,
    },
    documentActionButton: {
      marginTop: 0,
    },

    /* 6. Gestione Veicolo / Pericolo */
    dangerZone: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingTop: appSpacing.lg,
      marginBottom: appSpacing.xxl,
    },
    dangerEyebrow: {
      ...appTypography.eyebrow,
      color: colors.muted,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: appSpacing.sm,
      marginLeft: 2,
    },
  });
