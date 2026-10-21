import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Gauge, Wrench } from 'lucide-react-native';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { MaintenanceRecord, Vehicle } from '../../types';
import { formatDate, formatMileage, getLastMaintenance } from '../../utils/maintenance';
import { VehicleIconView } from './VehicleIconView';

type VehicleCardProps = {
  vehicle: Vehicle;
  onPress: () => void;
  records: MaintenanceRecord[];
};

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onPress, records }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);
  const lastMaintenance = getLastMaintenance(vehicle.id, records);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.brand} ${vehicle.model}, ${vehicle.plate}, ${formatMileage(vehicle.mileage)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <VehicleIconView icon={vehicle.icon} size={22} color={colors.primary} />
        </View>
        <View style={styles.vehicleCopy}>
          <Text style={styles.modelName}>
            {vehicle.brand} {vehicle.model}
          </Text>
          <Text style={styles.metaText}>
            {vehicle.year}{lastMaintenance ? ` · Ultimo intervento ${formatDate(lastMaintenance.date)}` : ' · Nessun intervento'}
          </Text>
        </View>
        <View style={styles.plateBadge}>
          <Text style={styles.plateText}>{vehicle.plate}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Gauge size={16} color={colors.primary} strokeWidth={1.8} />
          <Text style={styles.mileageText}>{formatMileage(vehicle.mileage)}</Text>
        </View>
        <View style={styles.statItem}>
          <Wrench size={14} color={colors.muted} strokeWidth={1.8} />
          <Text style={styles.statText} numberOfLines={1}>
            {lastMaintenance ? lastMaintenance.type : 'Nessun intervento'}
          </Text>
        </View>
        <ChevronRight size={17} color={colors.muted} />
      </View>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: appRadius.md,
    padding: appSpacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: appSpacing.md,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: appSpacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: appRadius.sm,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: appSpacing.md,
  },
  vehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope_800ExtraBold',
  },
  metaText: {
      color: colors.muted,
    fontSize: 12,
    marginTop: 3,
    fontFamily: 'Manrope_500Medium',
  },
  plateBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: appRadius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: appSpacing.xs,
  },
  plateText: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: appSpacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appSpacing.xs,
    minWidth: 0,
  },
  mileageText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  statText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
});
