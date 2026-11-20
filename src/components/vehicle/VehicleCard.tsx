import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Gauge, Star, Wrench } from 'lucide-react-native';
import { AppColors, appRadius, appShadows, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { MaintenanceRecord, Vehicle } from '../../types';
import { formatDate, formatMileage, getLastMaintenance } from '../../utils/maintenance';
import { useApp } from '../../store/AppContext';
import { VehicleIconView } from './VehicleIconView';

type VehicleCardProps = {
  vehicle: Vehicle;
  onPress: () => void;
  records: MaintenanceRecord[];
  onSetPrimary?: (vehicle: Vehicle) => void | Promise<void>;
};

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onPress, records, onSetPrimary }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);
  const { setPrimaryVehicle, isSettingPrimary } = useApp();
  const [isUpdating, setIsUpdating] = useState(false);
  const lastMaintenance = getLastMaintenance(vehicle.id, records);

  const handlePrimaryPress = async () => {
    if (vehicle.isPrimary || isSettingPrimary || isUpdating) return;
    setIsUpdating(true);
    try {
      if (onSetPrimary) {
        await onSetPrimary(vehicle);
      } else {
        await setPrimaryVehicle(vehicle.id);
      }
    } catch {
      // Gestito dalla schermata padre o silenzioso se già gestito
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.brand} ${vehicle.model}, targa ${vehicle.plate}, chilometraggio ${formatMileage(vehicle.mileage)}${vehicle.isPrimary ? ', veicolo principale' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            vehicle.isPrimary
              ? `${vehicle.brand} ${vehicle.model} è il tuo veicolo principale`
              : `Imposta ${vehicle.brand} ${vehicle.model} come veicolo principale`
          }
          onPress={handlePrimaryPress}
          hitSlop={6}
          style={styles.iconContainer}
        >
          <View style={styles.iconWrap}>
            <VehicleIconView icon={vehicle.icon} size={22} color={colors.primary} />
          </View>
          {vehicle.isPrimary ? (
            <View style={styles.primaryBadgeCorner}>
              {isUpdating ? (
                <ActivityIndicator size={10} color="#F59E0B" />
              ) : (
                <Star size={10} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
              )}
            </View>
          ) : isUpdating ? (
            <View style={styles.primaryBadgeCorner}>
              <ActivityIndicator size={10} color="#F59E0B" />
            </View>
          ) : null}
        </Pressable>

        <View style={styles.vehicleCopy}>
          <Text style={styles.modelName} numberOfLines={1}>
            {vehicle.brand} {vehicle.model}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {vehicle.year ? `Anno ${vehicle.year}` : 'Veicolo'}
            {lastMaintenance ? ` · Ultimo: ${formatDate(lastMaintenance.date)}` : ' · Nessun intervento'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{vehicle.plate}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.mileageBlock}>
          <Gauge size={15} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.mileageValue}>{formatMileage(vehicle.mileage)}</Text>
        </View>

        <View style={styles.maintenanceBlock}>
          <Wrench size={13} color={colors.muted} strokeWidth={1.8} />
          <Text style={styles.maintenanceText} numberOfLines={1}>
            {lastMaintenance ? lastMaintenance.type : 'Nessun intervento'}
          </Text>
        </View>

        <ChevronRight size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      padding: appSpacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: appSpacing.md,
      ...appShadows.subtle,
    },
    pressed: {
      backgroundColor: colors.primarySoft,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: appSpacing.md,
    },
    iconContainer: {
      position: 'relative',
      marginRight: appSpacing.md,
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: appRadius.md,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryBadgeCorner: {
      position: 'absolute',
      bottom: -3,
      right: -3,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: '#F59E0B',
      alignItems: 'center',
      justifyContent: 'center',
      ...appShadows.subtle,
    },
    vehicleCopy: {
      flex: 1,
      minWidth: 0,
      paddingRight: 6,
    },
    modelName: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: -0.2,
    },
    metaText: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
      fontFamily: 'Manrope_500Medium',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    plateBadge: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: appRadius.xs,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'center',
    },
    plateText: {
      color: colors.primary,
      fontSize: 11,
      fontFamily: 'Manrope_800ExtraBold',
      letterSpacing: 0.6,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      gap: appSpacing.sm,
    },
    mileageBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    mileageValue: {
      color: colors.text,
      fontSize: 14,
      fontFamily: 'Manrope_700Bold',
    },
    maintenanceBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minWidth: 0,
      paddingHorizontal: 4,
    },
    maintenanceText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
    },
  });
