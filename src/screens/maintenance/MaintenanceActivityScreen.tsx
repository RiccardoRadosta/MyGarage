import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, Plus, Wrench } from 'lucide-react-native';
import { ActionButton } from '../../components/common/ActionButton';
import { MaintenanceItem } from '../../components/maintenance/MaintenanceItem';
import { ScreenShell } from '../../components/common/ScreenShell';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, formatMileage, getRecentMaintenanceRecords } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

export const MaintenanceActivityScreen: React.FC<Props> = ({ navigation }) => {
  const { vehicles, maintenanceRecords } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);
  const records = getRecentMaintenanceRecords(maintenanceRecords);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const visibleRecords = selectedVehicleId
    ? records.filter((record) => record.vehicleId === selectedVehicleId)
    : records;

  const totalSpent = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);

  return (
    <ScreenShell>
      {/* Intestazione */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
        <Text style={styles.title}>Attività</Text>
        <Text style={styles.subtitle}>
          Registra e consulta gli interventi svolti sui tuoi veicoli.
        </Text>
      </View>

      {/* Pannello di riepilogo */}
      <View style={styles.summaryPanel}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>INTERVENTI SVOLTI</Text>
          <Text style={styles.summaryValue}>{maintenanceRecords.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>SPESA COMPLESSIVA</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
        </View>
      </View>

      {/* Sezione Nuovo Intervento */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nuovo intervento</Text>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aggiungi prima un veicolo al garage.</Text>
          <ActionButton
            title="Vai al garage"
            size="compact"
            icon={<ArrowRight size={14} color={colors.white} strokeWidth={2.4} />}
            onPress={() => navigation.navigate('GarageTab')}
          />
        </View>
      ) : (
        <View style={styles.vehiclesGrid}>
          {vehicles.map((vehicle) => (
            <Pressable
              key={vehicle.id}
              accessibilityRole="button"
              accessibilityLabel={`Registra intervento per ${vehicle.brand} ${vehicle.model}`}
              onPress={() => navigation.navigate('MaintenanceForm', { vehicleId: vehicle.id, mode: 'create' })}
              style={({ pressed }) => [styles.vehicleRow, pressed && styles.vehicleRowPressed]}
            >
              <View style={styles.vehicleIcon}>
                <VehicleIconView icon={vehicle.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.vehicleCopy}>
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicle.brand} {vehicle.model}
                </Text>
                <View style={styles.vehicleMetaRow}>
                  <View style={styles.plateTag}>
                    <Text style={styles.plateTagText}>{vehicle.plate}</Text>
                  </View>
                  <Text style={styles.vehicleMileageText}>· {formatMileage(vehicle.mileage)}</Text>
                </View>
              </View>
              <View style={styles.addShortcut}>
                <Plus size={16} color={colors.primary} strokeWidth={2.4} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Sezione Storico Interventi */}
      <View style={[styles.sectionHeader, styles.historyHeader]}>
        <View style={styles.titleWithCount}>
          <Text style={styles.sectionTitle}>Interventi registrati</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{visibleRecords.length}</Text>
          </View>
        </View>
      </View>

      {/* Filtro per veicolo */}
      {vehicles.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <FilterChip
            label="Tutti i veicoli"
            selected={selectedVehicleId === null}
            onPress={() => setSelectedVehicleId(null)}
          />
          {vehicles.map((vehicle) => (
            <FilterChip
              key={vehicle.id}
              label={`${vehicle.brand} ${vehicle.model}`}
              selected={selectedVehicleId === vehicle.id}
              onPress={() => setSelectedVehicleId(vehicle.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Elenco manutenzioni o Stato vuoto */}
      {visibleRecords.length === 0 ? (
        <View style={styles.emptyHistoryCard}>
          <View style={styles.emptyIconWrap}>
            <Wrench size={24} color={colors.muted} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Nessun intervento registrato</Text>
          <Text style={styles.emptySubtitle}>
            {records.length === 0
              ? 'Tocca uno dei tuoi veicoli in alto per registrare il primo intervento di manutenzione.'
              : 'Nessun intervento corrisponde al veicolo selezionato.'}
          </Text>
        </View>
      ) : (
        <View style={styles.activitiesList}>
          {visibleRecords.map((record) => {
            const vehicle = vehicles.find((item) => item.id === record.vehicleId);
            return (
              <MaintenanceItem
                key={record.id}
                record={record}
                vehicle={vehicle ? { brand: vehicle.brand, model: vehicle.model, plate: vehicle.plate } : undefined}
                onPress={() => navigation.navigate('MaintenanceDetail', { maintenanceId: record.id })}
              />
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
};

const FilterChip: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({
  label,
  selected,
  onPress,
}) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      <Text
        numberOfLines={1}
        style={[styles.filterText, selected && styles.filterTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerBlock: {
      marginBottom: appSpacing.md,
    },
    eyebrow: {
      ...appTypography.eyebrow,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    title: {
      ...appTypography.display,
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    subtitle: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
      lineHeight: 18,
    },
    summaryPanel: {
      alignItems: 'center',
      backgroundColor: colors.primaryDark,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(215, 237, 121, 0.16)',
      flexDirection: 'row',
      marginBottom: appSpacing.lg,
      padding: appSpacing.md,
      ...appShadows.card,
    },
    summaryBlock: {
      flex: 1,
      minWidth: 0,
    },
    summaryLabel: {
      ...appTypography.eyebrow,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 0.8,
    },
    summaryValue: {
      color: colors.white,
      fontFamily: 'Manrope_800ExtraBold',
      fontSize: 20,
      fontWeight: '800',
      marginTop: 2,
    },
    summaryDivider: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      height: 36,
      marginHorizontal: appSpacing.md,
      width: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: appSpacing.sm,
      marginTop: appSpacing.xs,
    },
    sectionTitle: {
      ...appTypography.sectionTitle,
      color: colors.text,
      fontSize: 17,
    },
    titleWithCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
    },
    countBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: appRadius.full,
    },
    countBadgeText: {
      ...appTypography.badge,
      color: colors.primary,
      fontSize: 11,
    },
    vehiclesGrid: {
      gap: 0,
      marginBottom: appSpacing.xs,
    },
    vehicleRow: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderColor: colors.border,
      borderWidth: 1,
      flexDirection: 'row',
      gap: appSpacing.sm,
      marginBottom: appSpacing.sm,
      padding: appSpacing.md,
      ...appShadows.subtle,
    },
    vehicleRowPressed: {
      backgroundColor: colors.primarySoft,
    },
    vehicleIcon: {
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: appRadius.md,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    vehicleCopy: {
      flex: 1,
      minWidth: 0,
    },
    vehicleName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    vehicleMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 3,
    },
    plateTag: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: appRadius.xs,
    },
    plateTagText: {
      color: colors.primary,
      fontSize: 10,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 0.5,
    },
    vehicleMileageText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
    },
    addShortcut: {
      width: 32,
      height: 32,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyHeader: {
      marginTop: appSpacing.md,
      marginBottom: appSpacing.sm,
    },
    filters: {
      gap: appSpacing.xs,
      paddingBottom: appSpacing.sm,
      marginBottom: appSpacing.xs,
    },
    filterChip: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.full,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 7,
      ...appShadows.subtle,
    },
    filterChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      color: colors.text,
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 12,
    },
    filterTextSelected: {
      color: colors.white,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    activitiesList: {
      gap: 0,
    },
    emptyCard: {
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderColor: colors.border,
      borderWidth: 1,
      gap: appSpacing.xs,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    emptyHistoryCard: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderColor: colors.border,
      borderWidth: 1,
      paddingVertical: appSpacing.xl,
      paddingHorizontal: appSpacing.lg,
      marginTop: appSpacing.xs,
      marginBottom: appSpacing.md,
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
      ...appTypography.title,
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
    },
    emptySubtitle: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: appSpacing.sm,
    },
    emptyText: {
      ...appTypography.body,
      color: colors.muted,
      fontSize: 13,
      marginBottom: appSpacing.xs,
    },
  });
