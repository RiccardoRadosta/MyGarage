import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CarFront, Plus } from 'lucide-react-native';
import { ScreenShell } from '../../components/common/ScreenShell';
import { ActionButton } from '../../components/common/ActionButton';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { useApp } from '../../store/AppContext';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any>;

export const GarageScreen: React.FC<Props> = ({ navigation }) => {
  const { vehicles, maintenanceRecords } = useApp();
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <ScreenShell>
      {/* Intestazione */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>IL MIO GARAGE</Text>
        <View style={styles.headerRow}>
          <View style={styles.titleWithCount}>
            <Text style={styles.title}>I tuoi veicoli</Text>
            {vehicles.length > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{vehicles.length}</Text>
              </View>
            ) : null}
          </View>
          <ActionButton
            title="Aggiungi"
            size="compact"
            icon={<Plus size={14} color={colors.white} strokeWidth={2.4} />}
            onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })}
          />
        </View>
        <Text style={styles.subtitle}>
          Gestisci il tuo parco veicoli, monitora chilometraggi e storico interventi.
        </Text>
      </View>

      {/* Barra riepilogo elenco */}
      <View style={styles.overviewBar}>
        <Text style={styles.overviewLabel}>PARCO VEICOLI</Text>
        <Text style={styles.overviewCount}>
          {vehicles.length} {vehicles.length === 1 ? 'veicolo registrato' : 'veicoli registrati'}
        </Text>
      </View>

      {/* Elenco veicoli o Stato vuoto */}
      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <CarFront size={32} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Il tuo garage è vuoto</Text>
          <Text style={styles.emptySubtitle}>
            Aggiungi la tua prima auto, moto o furgone per iniziare a monitorare manutenzioni, scadenze e costi.
          </Text>
          <ActionButton
            title="Aggiungi il primo veicolo"
            icon={<Plus size={16} color={colors.white} strokeWidth={2.4} />}
            onPress={() => navigation.navigate('VehicleForm', { mode: 'create' })}
          />
        </View>
      ) : (
        <View style={styles.vehiclesList}>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              records={maintenanceRecords}
              onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })}
            />
          ))}
        </View>
      )}
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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    titleWithCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: appSpacing.xs,
    },
    title: {
      ...appTypography.display,
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
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
    subtitle: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.muted,
      marginTop: 4,
      lineHeight: 18,
    },
    overviewBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: appSpacing.xs,
      marginBottom: appSpacing.md,
      marginTop: 2,
    },
    overviewLabel: {
      ...appTypography.eyebrow,
      color: colors.muted,
      fontSize: 10,
      letterSpacing: 0.8,
    },
    overviewCount: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'Manrope_700Bold',
    },
    vehiclesList: {
      marginBottom: appSpacing.md,
    },
    emptyState: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      paddingVertical: appSpacing.xxl,
      paddingHorizontal: appSpacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: appSpacing.md,
      ...appShadows.subtle,
    },
    emptyIconWrap: {
      width: 60,
      height: 60,
      borderRadius: appRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: appSpacing.md,
    },
    emptyTitle: {
      ...appTypography.title,
      fontSize: 17,
      color: colors.text,
      marginBottom: 4,
    },
    emptySubtitle: {
      ...appTypography.body,
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: appSpacing.lg,
      paddingHorizontal: appSpacing.md,
    },
  });
