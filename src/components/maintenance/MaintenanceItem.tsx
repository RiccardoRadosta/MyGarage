import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Gauge, Wrench } from 'lucide-react-native';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { MaintenanceRecord } from '../../types';
import { formatCurrency, formatDate, formatMileage } from '../../utils/maintenance';

type MaintenanceItemProps = {
  record: MaintenanceRecord;
  onPress: () => void;
};

export const MaintenanceItem: React.FC<MaintenanceItemProps> = ({ record, onPress }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Wrench size={16} color={colors.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.content}>
        <Text style={styles.type} numberOfLines={1}>{record.type}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <CalendarDays size={13} color={colors.muted} />
            <Text style={styles.metaText}>{formatDate(record.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Gauge size={13} color={colors.muted} />
            <Text style={styles.metaText}>{formatMileage(record.mileage)}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.amount}>{formatCurrency(record.cost)}</Text>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: appRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: appSpacing.sm,
    marginBottom: appSpacing.sm,
    padding: appSpacing.sm,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  iconWrap: {
    alignItems: 'center',
      backgroundColor: colors.primarySoft,
    borderRadius: appRadius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  type: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Manrope_700Bold',
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appSpacing.sm,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
});
