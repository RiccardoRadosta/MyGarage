import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Battery,
  CalendarDays,
  CircleDollarSign,
  CircleDot,
  ClipboardCheck,
  Cog,
  Disc3,
  Droplet,
  FileText,
  Gauge,
  Info,
  PencilLine,
  Receipt,
  ShieldCheck,
  Trash2,
  Wind,
  Wrench,
} from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { AppDialog, AppDialogOptions } from '../../components/common/AppDialog';
import { AttachmentSection } from '../../components/maintenance/AttachmentSection';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { ApiError } from '../../services/api/ApiClient';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, formatDate, formatMileage } from '../../utils/maintenance';
import { navigateToPremium } from '../../utils/navigationUtils';

type Props = NativeStackScreenProps<any>;

const getMaintenanceIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'cambio olio':
      return Droplet;
    case 'tagliando':
    case 'revisione':
      return ClipboardCheck;
    case 'freni / pastiglie':
    case 'freni':
      return Disc3;
    case 'cambio gomme':
      return CircleDot;
    case 'cambio tergicristalli':
      return Wind;
    case 'batteria':
      return Battery;
    case 'distribuzione':
      return Cog;
    case 'bollo':
      return Receipt;
    case 'assicurazione':
    case 'insurance':
      return ShieldCheck;
    default:
      return Wrench;
  }
};

export const MaintenanceDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { maintenanceId } = route.params ?? {};
  const { maintenanceRecords, deleteMaintenance, vehicles, canWriteMaintenanceForVehicle, requiresPrimarySelection, refreshPlan } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);

  const record = maintenanceRecords.find((item) => item.id === maintenanceId);
  const vehicle = vehicles.find((item) => item.id === record?.vehicleId);
  const isWritable = vehicle ? canWriteMaintenanceForVehicle(vehicle.id) : false;

  if (!record) {
    return (
      <ScreenShell>
        <ScreenContextHeader label="DETTAGLIO INTERVENTO" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>Intervento non trovato</Text>
          <Text style={styles.notFoundSubtitle}>
            L'intervento selezionato potrebbe essere stato eliminato o non è più disponibile.
          </Text>
          <ActionButton
            title="Torna indietro"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.notFoundButton}
          />
        </View>
      </ScreenShell>
    );
  }

  const removeMaintenance = async () => {
    try {
      await deleteMaintenance(record.id);
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PRIMARY_VEHICLE_SELECTION_REQUIRED') {
        void refreshPlan();
        setDialog({
          tone: 'info',
          title: 'Scelta obbligatoria',
          message: 'È necessario selezionare prima il veicolo principale.',
          confirmLabel: 'Seleziona veicolo',
          onConfirm: () => {
            setDialog(null);
            navigation.navigate('PrimaryVehicleSelection');
          },
        });
        return;
      }
      if (error instanceof ApiError && error.code === 'UPGRADE_REQUIRED') {
        void refreshPlan();
        setDialog({
          tone: 'info',
          title: 'Funzionalità Premium',
          message: error.message || 'Questa operazione richiede un piano Premium.',
          confirmLabel: 'Scopri Premium',
          cancelLabel: 'Chiudi',
          onConfirm: () => {
            setDialog(null);
            navigateToPremium(navigation);
          },
        });
        return;
      }
      setDialog({
        title: 'Eliminazione non riuscita',
        message: error instanceof Error ? error.message : 'Riprova tra poco.',
      });
    }
  };

  const handleDelete = () => {
    if (!isWritable) {
      setDialog({
        tone: 'info',
        title: 'Operazione non consentita',
        message:
          'Nel piano Free non è consentito eliminare interventi associati a un veicolo secondario.',
        confirmLabel: 'Chiudi',
      });
      return;
    }
    setDialog({
      tone: 'danger',
      title: 'Elimina intervento',
      message: 'Vuoi eliminare questo intervento? L’operazione non può essere annullata.',
      confirmLabel: 'Elimina',
      onConfirm: () => {
        void removeMaintenance();
      },
    });
  };

  const IconComponent = getMaintenanceIcon(record.type);
  const hasCustomDesc =
    Boolean(record.customDescription) && record.customDescription !== record.type;

  return (
    <ScreenShell>
      {/* Intestazione di navigazione */}
      <ScreenContextHeader label="DETTAGLIO INTERVENTO" onBack={() => navigation.goBack()} />

      {/* Intestazione di sezione con eyebrow */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
        <Text style={styles.screenTitle}>Dettaglio intervento</Text>
      </View>

      {/* Avviso Veicolo Secondario in sola consultazione */}
      {!isWritable && !requiresPrimarySelection ? (
        <View style={styles.readOnlyNotice}>
          <View style={styles.readOnlyNoticeIconWrap}>
            <Info size={16} color={colors.primary} />
          </View>
          <Text style={styles.readOnlyNoticeText}>
            Veicolo secondario (Piano Free) — Questo intervento è in sola consultazione. Le modifiche e l'eliminazione sono consentite solo sul veicolo principale.
          </Text>
        </View>
      ) : null}

      {/* 1. Hero Card: Identità Intervento e Veicolo */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <IconComponent size={24} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {record.type}
            </Text>
            {hasCustomDesc ? (
              <Text style={styles.heroCustomDesc} numberOfLines={2}>
                {record.customDescription}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Associazione Veicolo (se presente) */}
        {vehicle ? (
          <>
            <View style={styles.heroDivider} />
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleCopy}>
                <VehicleIconView icon={vehicle.icon} size={18} color={colors.primary} />
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicle.brand} {vehicle.model}
                </Text>
              </View>
              {vehicle.plate ? (
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{vehicle.plate}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </View>

      {/* 2. Metriche dell'Intervento (3 colonne bilanciate e responsive) */}
      <View style={styles.metricsRow}>
        {/* Data */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <CalendarDays size={16} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatDate(record.date)}
          </Text>
          <Text style={styles.metricLabel} numberOfLines={1}>
            Data
          </Text>
        </View>

        {/* Chilometraggio */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Gauge size={16} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMileage(record.mileage)}
          </Text>
          <Text style={styles.metricLabel} numberOfLines={1}>
            Chilometri
          </Text>
        </View>

        {/* Costo */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <CircleDollarSign size={16} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text
            style={[styles.metricValue, styles.metricHighlight]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(record.cost)}
          </Text>
          <Text style={styles.metricLabel} numberOfLines={1}>
            Costo
          </Text>
        </View>
      </View>

      {/* 3. Note e Dettagli (visibile solo se presenti) */}
      {record.notes?.trim() ? (
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <FileText size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.notesTitle}>Note dell'intervento</Text>
          </View>
          <Text style={styles.notesText}>{record.notes.trim()}</Text>
        </View>
      ) : null}

      {/* 4. Allegato PDF / JPEG */}
      <View style={styles.attachmentSectionWrapper}>
        <AttachmentSection
          maintenanceId={record.id}
          hasAttachmentInitial={record.hasAttachment}
          readOnly
        />
      </View>

      {/* 5. Azione Primaria: Modifica Intervento (solo se scrivibile) */}
      {isWritable ? (
        <ActionButton
          title="Modifica intervento"
          icon={<PencilLine size={16} color={colors.white} strokeWidth={2.2} />}
          onPress={() =>
            navigation.navigate('MaintenanceForm', {
              vehicleId: record.vehicleId,
              maintenanceId: record.id,
              mode: 'edit',
            })
          }
          style={styles.primaryActionButton}
        />
      ) : null}

      {/* 6. Gestione / Zona Pericolo: Elimina Intervento (solo se scrivibile) */}
      {isWritable ? (
        <View style={styles.dangerZone}>
          <Text style={styles.dangerEyebrow}>GESTIONE INTERVENTO</Text>
          <ActionButton
            title="Elimina intervento"
            variant="danger"
            icon={<Trash2 size={16} color={colors.danger} strokeWidth={2} />}
            onPress={handleDelete}
          />
        </View>
      ) : null}

      {/* Dialog Modale per Conferme ed Errori */}
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
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    readOnlyNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: appRadius.md,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
    },
    readOnlyNoticeIconWrap: {
      width: 28,
      height: 28,
      borderRadius: appRadius.sm,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readOnlyNoticeText: {
      flex: 1,
      ...appTypography.caption,
      color: colors.text,
      fontSize: 12.5,
      lineHeight: 17,
    },
    headerBlock: {
      marginTop: appSpacing.xs,
      marginBottom: appSpacing.md,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    screenTitle: {
      ...appTypography.display,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },

    /* 1. Hero Card Intervento */
    heroCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroIconWrap: {
      width: 48,
      height: 48,
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
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
    },
    heroCustomDesc: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    heroDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: appSpacing.sm + 2,
    },
    vehicleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.xs,
    },
    vehicleCopy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    vehicleName: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.text,
      flex: 1,
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
      fontSize: 12,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },

    /* 2. Metriche dell'Intervento */
    metricsRow: {
      flexDirection: 'row',
      gap: appSpacing.xs + 2,
      marginBottom: appSpacing.md,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.md,
      borderWidth: 1,
      paddingVertical: appSpacing.sm,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      ...appShadows.subtle,
      minHeight: 88,
    },
    metricIconWrap: {
      width: 28,
      height: 28,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    metricValue: {
      fontSize: 13,
      lineHeight: 18,
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
      fontSize: 10,
      color: colors.muted,
      fontFamily: 'Manrope_600SemiBold',
      textAlign: 'center',
      marginTop: 2,
    },

    /* 3. Note e Dettagli */
    notesCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    notesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: appSpacing.xs + 2,
    },
    notesTitle: {
      ...appTypography.cardTitle,
      color: colors.text,
      fontSize: 14,
      fontFamily: 'Manrope_700Bold',
    },
    notesText: {
      ...appTypography.body,
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },

    /* 4. Allegati Wrapper */
    attachmentSectionWrapper: {
      marginBottom: appSpacing.md,
    },

    /* 5. Azione Primaria */
    primaryActionButton: {
      marginBottom: appSpacing.xl,
    },

    /* 6. Gestione / Zona Pericolo */
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

    /* Stato Not Found */
    notFoundCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.xl,
      alignItems: 'center',
      marginTop: appSpacing.lg,
      ...appShadows.subtle,
    },
    notFoundTitle: {
      ...appTypography.title,
      color: colors.text,
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 6,
    },
    notFoundSubtitle: {
      ...appTypography.body,
      color: colors.muted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: appSpacing.lg,
      maxWidth: 280,
    },
    notFoundButton: {
      minWidth: 160,
    },
  });
