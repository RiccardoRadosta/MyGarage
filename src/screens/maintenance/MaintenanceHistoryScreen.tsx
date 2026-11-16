import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CircleDollarSign, Plus, Wrench } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { ScreenContextHeader } from '../../components/common/ScreenContextHeader';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const MaintenanceHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleId } = route.params ?? {};
  const { vehicles, maintenanceRecords } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const records = [...maintenanceRecords]
    .filter((record) => record.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSpent = records.reduce((sum, r) => sum + r.cost, 0);

  return (
    <ScreenShell>
      {/* Intestazione di contesto */}
      <ScreenContextHeader label="STORICO VEICOLO" onBack={() => navigation.goBack()} />

      {/* 1. Hero Card: Identità Veicolo */}
      {vehicle ? (
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <VehicleIconView icon={vehicle.icon} size={26} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text style={styles.heroSubtitle}>
                {vehicle.year ? `Anno ${vehicle.year}` : 'Veicolo registrato'}
              </Text>
            </View>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{vehicle.plate || 'SENZA TARGA'}</Text>
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>Storico manutenzioni</Text>
      )}

      {/* 2. Pannello Riepilogativo a due metriche bilanciate */}
      <View style={styles.summaryPanel}>
        <View style={styles.summaryBlock}>
          <View style={styles.metricHeaderRow}>
            <View style={styles.metricIconWrap}>
              <Wrench size={14} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1}>
              Interventi registrati
            </Text>
          </View>
          <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
            {records.length} {records.length === 1 ? 'intervento' : 'interventi'}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryBlock}>
          <View style={styles.metricHeaderRow}>
            <View style={styles.metricIconWrap}>
              <CircleDollarSign size={14} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.summaryLabel} numberOfLines={1}>
              Spesa complessiva
            </Text>
          </View>
          <Text
            style={[styles.summaryValue, styles.summaryHighlight]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(totalSpent)}
          </Text>
        </View>
      </View>

      {/* 3. Pulsante Principale: Nuovo Intervento (visibile solo se ci sono già record, per non duplicare la CTA dello stato vuoto) */}
      {records.length > 0 ? (
        <ActionButton
          title="Nuovo intervento"
          icon={<Plus size={18} color={colors.white} strokeWidth={2.4} />}
          onPress={() => navigation.navigate('MaintenanceForm', { vehicleId, mode: 'create' })}
          style={styles.mainActionButton}
        />
      ) : null}

      {/* 4. Intestazione dell'Elenco */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Elenco interventi</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>{records.length}</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>
          Tocca un intervento per visualizzare dettagli, note e allegati
        </Text>
      </View>

      {/* 5. Lista Manutenzioni o 6. Stato Vuoto */}
      {records.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Wrench size={28} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Nessun intervento registrato</Text>
          <Text style={styles.emptySubtitle}>
            Non sono ancora presenti interventi per questo veicolo. Registra il primo tagliando o spesa per iniziare a monitorare lo storico.
          </Text>
          <ActionButton
            title="Aggiungi il primo intervento"
            size="compact"
            icon={<Plus size={15} color={colors.white} strokeWidth={2.4} />}
            onPress={() => navigation.navigate('MaintenanceForm', { vehicleId, mode: 'create' })}
            style={styles.emptyActionButton}
          />
        </View>
      ) : (
        <View style={styles.recordsList}>
          {records.map((record) => (
            <MaintenanceItem
              key={record.id}
              record={record}
              onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })}
            />
          ))}
        </View>
      )}
    </ScreenShell>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    title: {
      ...appTypography.title,
      color: colors.text,
      marginTop: appSpacing.sm,
      marginBottom: appSpacing.md,
    },
    /* 1. Hero Card Veicolo */
    heroCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginTop: appSpacing.xs,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    heroRow: {
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
      minWidth: 0,
      paddingRight: appSpacing.xs,
    },
    heroTitle: {
      ...appTypography.cardTitle,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.text,
    },
    heroSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    plateBadge: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: appRadius.sm,
      borderWidth: 1.5,
      paddingHorizontal: appSpacing.sm,
      paddingVertical: 3,
      alignSelf: 'center',
    },
    plateText: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },

    /* 2. Pannello Riepilogativo a due metriche */
    summaryPanel: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    summaryBlock: {
      flex: 1,
      justifyContent: 'center',
    },
    metricHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    metricIconWrap: {
      width: 24,
      height: 24,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryLabel: {
      color: colors.muted,
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 11,
      flex: 1,
    },
    summaryValue: {
      color: colors.text,
      fontFamily: 'Manrope_800ExtraBold',
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 22,
    },
    summaryHighlight: {
      color: colors.primary,
    },
    summaryDivider: {
      width: 1,
      height: 38,
      backgroundColor: colors.border,
      marginHorizontal: appSpacing.sm,
    },

    /* 3. Pulsante Principale */
    mainActionButton: {
      marginBottom: appSpacing.lg,
    },

    /* 4. Intestazione dell'Elenco */
    sectionHeader: {
      marginBottom: appSpacing.sm,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
      marginBottom: 3,
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
    sectionSubtitle: {
      ...appTypography.caption,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
    },

    /* 5. Lista Manutenzioni */
    recordsList: {
      marginBottom: appSpacing.lg,
    },

    /* 6. Stato Vuoto */
    emptyCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.xl,
      alignItems: 'center',
      marginTop: appSpacing.xs,
      marginBottom: appSpacing.lg,
      ...appShadows.subtle,
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: appSpacing.sm,
    },
    emptyTitle: {
      ...appTypography.cardTitle,
      color: colors.text,
      fontSize: 16,
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
    emptyActionButton: {
      minWidth: 180,
    },
  });
