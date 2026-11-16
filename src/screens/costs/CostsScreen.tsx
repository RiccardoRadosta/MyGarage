import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, ReceiptText, Wallet, Wrench } from 'lucide-react-native';
import { useApp } from '../../store/AppContext';
import { ScreenShell } from '../../components/common/ScreenShell';
import { VehicleIconView } from '../../components/vehicle/VehicleIconView';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { formatCurrency, formatDate, formatMileage, getVehicleRecords, getVehicleTotalCost } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any>;

const formatPercentage = (pct: number): string => {
  if (pct <= 0) return '0%';
  if (pct < 1) return '< 1%';
  return `${Math.round(pct)}%`;
};

export const CostsScreen: React.FC<Props> = ({ navigation }) => {
  const { vehicles, maintenanceRecords, costSummary } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // 1. Reset al riepilogo generale quando il tab Costi perde il focus (cambio tab)
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setSelectedVehicleId(null);
    });
    return unsubscribe;
  }, [navigation]);

  // 2. Intercetta il gesto/tasto Android di ritorno quando si è nel dettaglio del veicolo
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedVehicleId !== null) {
          setSelectedVehicleId(null);
          return true; // Blocca la navigazione di default e torna al riepilogo generale
        }
        return false; // Permette il comportamento standard di navigazione Android
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [selectedVehicleId])
  );

  const currentYear = new Date().getFullYear();

  // Calcolo spesa totale storica generale
  const computedTotalSpent = maintenanceRecords.reduce((sum, item) => sum + (item.cost || 0), 0);
  const totalSpent = costSummary?.totalSpent ?? computedTotalSpent;

  // Calcolo spesa anno corrente generale
  const computedAnnualSpent = maintenanceRecords
    .filter((item) => new Date(item.date).getFullYear() === currentYear)
    .reduce((sum, item) => sum + (item.cost || 0), 0);
  const annualSpent = costSummary?.yearSpent ?? computedAnnualSpent;

  // Calcolo riepilogo per veicolo
  const vehicleCosts = vehicles.map((vehicle) => {
    const total = getVehicleTotalCost(vehicle.id, maintenanceRecords);
    const count = maintenanceRecords.filter((item) => item.vehicleId === vehicle.id).length;
    const percentage = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
    return { vehicle, total, count, percentage };
  }).sort((a, b) => b.total - a.total);

  // Veicolo selezionato per la vista di dettaglio
  const selectedVehicle = selectedVehicleId
    ? vehicles.find((v) => v.id === selectedVehicleId) ?? null
    : null;

  // Dati specifici del veicolo selezionato
  const selectedVehicleRecords = selectedVehicle
    ? getVehicleRecords(selectedVehicle.id, maintenanceRecords)
    : [];

  const selectedVehicleTotal = selectedVehicle
    ? getVehicleTotalCost(selectedVehicle.id, maintenanceRecords)
    : 0;

  const selectedVehicleYearSpent = selectedVehicleRecords
    .filter((r) => new Date(r.date).getFullYear() === currentYear)
    .reduce((sum, r) => sum + (r.cost || 0), 0);

  // Categorie calcolate esclusivamente sui record del veicolo selezionato (100% di copertura)
  const selectedVehicleTypes = selectedVehicle
    ? Array.from(new Set(selectedVehicleRecords.map((r) => r.type)))
        .map((type) => {
          const matching = selectedVehicleRecords.filter((r) => r.type === type);
          const total = matching.reduce((sum, r) => sum + (r.cost || 0), 0);
          const count = matching.length;
          const percentage = selectedVehicleTotal > 0 ? (total / selectedVehicleTotal) * 100 : 0;
          return { type, total, count, percentage };
        })
        .sort((a, b) => b.total - a.total)
    : [];

  // --------------------------------------------------------------------------
  // VISTA B: DETTAGLIO COSTI VEICOLO SELEZIONATO
  // --------------------------------------------------------------------------
  if (selectedVehicle) {
    return (
      <ScreenShell>
        {/* Pulsante Ritorno a Panoramica */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna a tutti i veicoli"
          onPress={() => setSelectedVehicleId(null)}
          style={({ pressed }) => [styles.backRow, pressed && styles.backRowPressed]}
        >
          <ArrowLeft size={16} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.backText}>Tutti i veicoli</Text>
        </Pressable>

        {/* Intestazione Veicolo */}
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>DETTAGLIO COSTI VEICOLO</Text>
          <Text style={styles.title} numberOfLines={1}>
            {selectedVehicle.brand} {selectedVehicle.model}
          </Text>
          <Text style={styles.subtitle}>
            Analisi delle spese e ripartizione per categoria di questo mezzo.
          </Text>
        </View>

        {/* Hero Card Veicolo Selezionato */}
        <View style={styles.costHeroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <VehicleIconView icon={selectedVehicle.icon} size={22} color={colors.accent} strokeWidth={2} />
            </View>
            <View style={styles.heroLabelBlock}>
              <View style={styles.heroVehicleHeader}>
                <Text style={styles.heroLabel}>SPESA TOTALE VEICOLO</Text>
                <View style={styles.heroPlateBadge}>
                  <Text style={styles.heroPlateText}>{selectedVehicle.plate}</Text>
                </View>
              </View>
              <Text style={styles.heroValue}>{formatCurrency(selectedVehicleTotal)}</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          {/* Tre colonne bilanciate e centrate */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBlock}>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                ANNO {currentYear}
              </Text>
              <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(selectedVehicleYearSpent)}
              </Text>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStatBlock}>
              <Text style={styles.heroStatLabel} numberOfLines={1}>
                INTERVENTI
              </Text>
              <Text style={styles.heroStatValue} numberOfLines={1}>
                {selectedVehicleRecords.length}
              </Text>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStatBlock}>
              <Text style={styles.heroStatLabel} numberOfLines={1} adjustsFontSizeToFit>
                CHILOMETRAGGIO
              </Text>
              <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatMileage(selectedVehicle.mileage)}
              </Text>
            </View>
          </View>
        </View>

        {/* Categorie di spesa del veicolo */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorie di spesa</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {selectedVehicleTypes.length} {selectedVehicleTypes.length === 1 ? 'categoria' : 'categorie'}
              </Text>
            </View>
          </View>

          {selectedVehicleTypes.length === 0 ? (
            <View style={styles.emptySection}>
              <Wrench size={20} color={colors.muted} strokeWidth={1.8} />
              <Text style={styles.emptySectionText}>Nessuna spesa registrata per questo veicolo.</Text>
            </View>
          ) : (
            selectedVehicleTypes.map((item, index) => {
              const isLast = index === selectedVehicleTypes.length - 1;
              return (
                <View key={item.type} style={[styles.typeRow, isLast && styles.rowLast]}>
                  <View style={styles.typeTopRow}>
                    <Text style={styles.typeTitle} numberOfLines={1}>{item.type}</Text>
                    <Text style={styles.typeAmount}>{formatCurrency(item.total)}</Text>
                  </View>

                  <View style={styles.typeSubRow}>
                    <Text style={styles.typePercentage}>
                      {formatPercentage(item.percentage)} della spesa veicolo · {item.count} {item.count === 1 ? 'intervento' : 'interventi'}
                    </Text>
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(3, item.percentage))}%` }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Elenco completo manutenzioni del veicolo */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Tutte le manutenzioni del veicolo
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {selectedVehicleRecords.length} {selectedVehicleRecords.length === 1 ? 'registrazione' : 'registrazioni'}
              </Text>
            </View>
          </View>

          {selectedVehicleRecords.length === 0 ? (
            <View style={styles.emptySection}>
              <Wallet size={20} color={colors.muted} strokeWidth={1.8} />
              <Text style={styles.emptySectionText}>Non ci sono manutenzioni registrate per questo mezzo.</Text>
            </View>
          ) : (
            selectedVehicleRecords.map((record, index) => {
              const isLast = index === selectedVehicleRecords.length - 1;
              return (
                <View key={record.id} style={[styles.recentCostRow, isLast && styles.rowLast]}>
                  <View style={styles.recentCostLeft}>
                    <Text style={styles.recentCostType} numberOfLines={1}>{record.type}</Text>
                    <Text style={styles.recentCostMeta}>
                      {formatDate(record.date)} · {formatMileage(record.mileage)}
                    </Text>
                  </View>
                  <Text style={styles.recentCostAmount}>{formatCurrency(record.cost)}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScreenShell>
    );
  }

  // --------------------------------------------------------------------------
  // VISTA A: PANORAMICA GENERALE
  // --------------------------------------------------------------------------
  return (
    <ScreenShell>
      {/* Intestazione */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
        <Text style={styles.title}>Costi</Text>
        <Text style={styles.subtitle}>
          Panoramica delle spese complessive e riepilogo per singolo veicolo.
        </Text>
      </View>

      {/* Hero Card Spesa Complessiva Storica */}
      <View style={styles.costHeroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <ReceiptText size={20} color={colors.accent} strokeWidth={2} />
          </View>
          <View style={styles.heroLabelBlock}>
            <Text style={styles.heroLabel}>SPESA TOTALE REGISTRATA</Text>
            <Text style={styles.heroValue}>{formatCurrency(totalSpent)}</Text>
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatBlock}>
            <Text style={styles.heroStatLabel} numberOfLines={1}>
              ANNO {currentYear}
            </Text>
            <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(annualSpent)}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatBlock}>
            <Text style={styles.heroStatLabel} numberOfLines={1}>
              INTERVENTI
            </Text>
            <Text style={styles.heroStatValue} numberOfLines={1}>
              {maintenanceRecords.length}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatBlock}>
            <Text style={styles.heroStatLabel} numberOfLines={1}>
              VEICOLI
            </Text>
            <Text style={styles.heroStatValue} numberOfLines={1}>
              {vehicles.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Sezione: Spesa per veicolo con selezione interattiva */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>Spesa per veicolo</Text>
            <Text style={styles.sectionSubtitleHint}>Tocca un veicolo per aprire il dettaglio spese e categorie</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {vehicles.length} {vehicles.length === 1 ? 'veicolo' : 'veicoli'}
            </Text>
          </View>
        </View>

        {vehicles.length === 0 ? (
          <View style={styles.emptySection}>
            <Wrench size={20} color={colors.muted} strokeWidth={1.8} />
            <Text style={styles.emptySectionText}>Nessun veicolo presente nel garage.</Text>
          </View>
        ) : (
          vehicleCosts.map((item, index) => {
            const isLast = index === vehicleCosts.length - 1;
            return (
              <Pressable
                key={item.vehicle.id}
                accessibilityRole="button"
                accessibilityLabel={`Dettaglio spese per ${item.vehicle.brand} ${item.vehicle.model}, totale ${formatCurrency(item.total)}`}
                onPress={() => setSelectedVehicleId(item.vehicle.id)}
                style={({ pressed }) => [
                  styles.vehicleCostRow,
                  isLast && styles.rowLast,
                  pressed && styles.vehicleCostRowPressed,
                ]}
              >
                <View style={styles.vehicleIcon}>
                  <VehicleIconView icon={item.vehicle.icon} size={20} color={colors.primary} />
                </View>

                <View style={styles.vehicleCostContent}>
                  <View style={styles.vehicleCostTop}>
                    <Text style={styles.vehicleName} numberOfLines={1}>
                      {item.vehicle.brand} {item.vehicle.model}
                    </Text>
                    <Text style={styles.vehicleAmount}>{formatCurrency(item.total)}</Text>
                  </View>

                  <View style={styles.vehicleMetaRow}>
                    <View style={styles.plateTag}>
                      <Text style={styles.plateTagText}>{item.vehicle.plate}</Text>
                    </View>
                    <Text style={styles.vehiclePercentText}>
                      {formatPercentage(item.percentage)} del totale · {item.count} {item.count === 1 ? 'intervento' : 'interventi'}
                    </Text>
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(3, item.percentage))}%` }]} />
                  </View>
                </View>

                <ChevronRight size={18} color={colors.muted} style={styles.chevron} />
              </Pressable>
            );
          })
        )}
      </View>

      {/* Sezione: Ultime 5 spese registrate */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>Ultime spese registrate</Text>
            <Text style={styles.sectionSubtitleHint}>I 5 interventi più recenti tra tutti i veicoli</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {Math.min(5, maintenanceRecords.length)} registrati
            </Text>
          </View>
        </View>

        {maintenanceRecords.length === 0 ? (
          <View style={styles.emptySection}>
            <Wallet size={20} color={colors.muted} strokeWidth={1.8} />
            <Text style={styles.emptySectionText}>Non hai ancora registrato interventi.</Text>
          </View>
        ) : (
          maintenanceRecords.slice(0, 5).map((record, index) => {
            const vehicle = vehicles.find((item) => item.id === record.vehicleId);
            const isLast = index === Math.min(5, maintenanceRecords.length) - 1;

            return (
              <View key={record.id} style={[styles.recentCostRow, isLast && styles.rowLast]}>
                <View style={styles.recentCostLeft}>
                  <Text style={styles.recentCostType} numberOfLines={1}>{record.type}</Text>
                  <Text style={styles.recentCostMeta} numberOfLines={1}>
                    {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'Veicolo'} · {formatDate(record.date)}
                  </Text>
                </View>
                <Text style={styles.recentCostAmount}>{formatCurrency(record.cost)}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScreenShell>
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
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: appSpacing.sm,
      alignSelf: 'flex-start',
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: appRadius.full,
    },
    backRowPressed: {
      opacity: 0.8,
    },
    backText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    costHeroCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.accent}2E`,
      padding: appSpacing.lg,
      marginBottom: appSpacing.lg,
      ...appShadows.card,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.md,
    },
    heroIconWrap: {
      alignItems: 'center',
      backgroundColor: `${colors.accent}26`,
      borderRadius: appRadius.md,
      height: 46,
      justifyContent: 'center',
      width: 46,
    },
    heroLabelBlock: {
      flex: 1,
    },
    heroVehicleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    heroPlateBadge: {
      borderWidth: 1,
      borderColor: `${colors.accent}4D`,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: appRadius.xs,
    },
    heroPlateText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 0.6,
    },
    heroLabel: {
      ...appTypography.eyebrow,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 0.9,
    },
    heroValue: {
      color: colors.white,
      fontSize: 27,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      marginTop: 2,
      letterSpacing: -0.4,
    },
    heroDivider: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      height: 1,
      marginVertical: appSpacing.md,
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroStatBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    heroStatLabel: {
      ...appTypography.eyebrow,
      color: 'rgba(255, 255, 255, 0.72)',
      fontSize: 9,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    heroStatValue: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      marginTop: 2,
      textAlign: 'center',
    },
    heroStatDivider: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      height: 24,
      width: 1,
      marginHorizontal: 4,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      padding: appSpacing.md,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: appSpacing.md,
      gap: appSpacing.sm,
    },
    sectionHeaderBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: appSpacing.md,
      gap: appSpacing.sm,
    },
    sectionTitleBlock: {
      flex: 1,
      paddingRight: appSpacing.xs,
    },
    sectionTitle: {
      ...appTypography.sectionTitle,
      color: colors.text,
      fontSize: 15,
      flex: 1,
    },
    sectionSubtitleHint: {
      ...appTypography.body,
      color: colors.muted,
      fontSize: 11,
      marginTop: 1,
    },
    countBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: appRadius.full,
      alignSelf: 'flex-start',
    },
    countBadgeText: {
      ...appTypography.badge,
      color: colors.primary,
      fontSize: 11,
    },
    vehicleCostRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingVertical: appSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderRadius: appRadius.sm,
    },
    vehicleCostRowPressed: {
      backgroundColor: colors.primarySoft,
      opacity: 0.9,
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingBottom: 2,
    },
    vehicleIcon: {
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: appRadius.md,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    vehicleCostContent: {
      flex: 1,
    },
    vehicleCostTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    vehicleName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      flex: 1,
      paddingRight: 8,
    },
    vehicleAmount: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
    },
    vehicleMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 3,
      marginBottom: 6,
    },
    plateTag: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: appRadius.xs,
    },
    plateTagText: {
      color: colors.primary,
      fontSize: 10,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 0.4,
    },
    vehiclePercentText: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: 'Manrope_500Medium',
    },
    chevron: {
      marginLeft: 4,
    },
    progressBarTrack: {
      height: 5,
      backgroundColor: colors.primarySoft,
      borderRadius: appRadius.full,
      overflow: 'hidden',
      marginTop: 2,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: appRadius.full,
    },
    typeRow: {
      paddingVertical: appSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    typeTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    typeTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      flex: 1,
      paddingRight: 8,
    },
    typeAmount: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
    },
    typeSubRow: {
      marginTop: 2,
      marginBottom: 5,
    },
    typePercentage: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: 'Manrope_500Medium',
    },
    recentCostRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: appSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    recentCostLeft: {
      flex: 1,
      paddingRight: appSpacing.sm,
    },
    recentCostType: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    recentCostMeta: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 2,
      fontFamily: 'Manrope_500Medium',
    },
    recentCostAmount: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
    },
    emptySection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.sm,
      paddingVertical: appSpacing.sm,
    },
    emptySectionText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
    },
  });
