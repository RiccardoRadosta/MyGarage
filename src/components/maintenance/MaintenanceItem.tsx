import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CalendarDays, ChevronRight, Gauge, Paperclip, Wrench } from 'lucide-react-native';
import { AppColors, appRadius, appShadows, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';
import { MaintenanceRecord } from '../../types';
import { formatCurrency, formatDate, formatMileage } from '../../utils/maintenance';

export type MaintenanceItemProps = {
  record: MaintenanceRecord;
  onPress: () => void;
  vehicle?: {
    brand: string;
    model: string;
    plate?: string;
  };
  style?: StyleProp<ViewStyle>;
};

export const MaintenanceItem: React.FC<MaintenanceItemProps> = ({ record, onPress, vehicle, style }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  const secondaryText =
    record.customDescription && record.customDescription !== record.type
      ? record.customDescription
      : record.notes?.trim()
        ? record.notes.trim()
        : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vehicle ? `${vehicle.brand} ${vehicle.model}, ` : ''}${record.type}, ${formatCurrency(record.cost)}${record.hasAttachment ? ', con allegato' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {/* 1. Riga Veicolo (quando passato come prop, es. Home o Attività) */}
      {vehicle ? (
        <View style={styles.vehicleRow}>
          <Text style={styles.vehicleName} numberOfLines={1}>
            {vehicle.brand} {vehicle.model}
          </Text>
          {vehicle.plate ? (
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{vehicle.plate}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 2. Intestazione Intervento: Tipologia a sinistra e Data a destra */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Wrench size={14} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.typeText} numberOfLines={1}>
            {record.type}
          </Text>
        </View>

        <View style={styles.dateBlock}>
          <CalendarDays size={13} color={colors.muted} strokeWidth={2} />
          <Text style={styles.dateText}>{formatDate(record.date)}</Text>
        </View>
      </View>

      {/* 3. Eventuale descrizione o nota secondaria */}
      {secondaryText ? (
        <Text style={styles.secondaryText} numberOfLines={1}>
          {secondaryText}
        </Text>
      ) : null}

      {/* Divisore orizzontale discreto */}
      <View style={styles.divider} />

      {/* 4. Riga Numerica: Chilometraggio e Costo affiancati in 2 colonne bilanciate */}
      <View style={styles.numbersRow}>
        {/* Colonna Chilometraggio (sinistra, flex: 1) */}
        <View style={styles.mileageCol}>
          <Gauge size={14} color={colors.muted} strokeWidth={2} />
          <Text
            style={styles.mileageText}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMileage(record.mileage)}
          </Text>
        </View>

        {/* Colonna Costo e Freccia (destra, flex: 1) */}
        <View style={styles.costCol}>
          <Text
            style={styles.costText}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(record.cost)}
          </Text>
          <ChevronRight size={14} color={colors.muted} strokeWidth={2.2} />
        </View>
      </View>

      {/* 5. Area Allegato (renderizzata solo se l'allegato è presente) */}
      {record.hasAttachment ? (
        <View style={styles.attachmentBadge}>
          <Paperclip size={11} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.attachmentText}>Allegato disponibile</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: appRadius.lg,
      borderWidth: 1,
      marginBottom: appSpacing.sm,
      paddingHorizontal: appSpacing.md - 2,
      paddingVertical: appSpacing.sm + 2,
      ...appShadows.subtle,
    },
    pressed: {
      backgroundColor: colors.primarySoft,
    },
    /* 1. Riga Veicolo */
    vehicleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginBottom: 6,
    },
    vehicleName: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.primary,
      flex: 1,
    },
    plateBadge: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: appRadius.xs,
    },
    plateText: {
      fontSize: 10,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.text,
      letterSpacing: 0.6,
    },

    /* 2. Intestazione */
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.xs,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: appRadius.sm,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeText: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.text,
      flex: 1,
    },
    dateBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    },
    dateText: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: 'Manrope_600SemiBold',
    },

    /* 3. Testo secondario / Note */
    secondaryText: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: 'Manrope_500Medium',
      marginTop: 4,
      marginLeft: 36,
    },

    /* Divisore */
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
      opacity: 0.7,
    },

    /* 4. Riga Numerica (Km e Costo affiancati 50/50) */
    numbersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: appSpacing.sm,
    },
    mileageCol: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    mileageText: {
      fontSize: 13,
      fontFamily: 'Manrope_600SemiBold',
      color: colors.text,
      flex: 1,
    },
    costCol: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 5,
    },
    costText: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Manrope_800ExtraBold',
      color: colors.primary,
      textAlign: 'right',
    },

    /* 5. Badge Allegato */
    attachmentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: appRadius.xs,
      marginTop: 8,
    },
    attachmentText: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
      color: colors.primary,
      letterSpacing: 0.3,
    },
  });
