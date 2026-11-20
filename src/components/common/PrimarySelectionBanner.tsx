import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ArrowRight } from 'lucide-react-native';
import { ActionButton } from './ActionButton';
import { AppColors, appRadius, appShadows, appSpacing, appTypography } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type PrimarySelectionBannerProps = {
  onSelectPress: () => void;
};

export const PrimarySelectionBanner: React.FC<PrimarySelectionBannerProps> = ({ onSelectPress }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={18} color="#F59E0B" strokeWidth={2.2} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Scelta veicolo principale richiesta</Text>
          <Text style={styles.message}>
            Per sbloccare le modifiche e continuare a gestire il tuo garage, seleziona quale veicolo mantenere attivo.
          </Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <ActionButton
          title="Seleziona veicolo principale"
          size="compact"
          icon={<ArrowRight size={14} color={colors.white} strokeWidth={2.4} />}
          onPress={onSelectPress}
        />
      </View>
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: appRadius.lg,
      borderWidth: 1.5,
      borderColor: '#F59E0B',
      padding: appSpacing.md,
      marginBottom: appSpacing.lg,
      ...appShadows.card,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: appSpacing.sm,
      marginBottom: appSpacing.sm,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: appRadius.md,
      backgroundColor: '#F59E0B1A',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      ...appTypography.heading,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    message: {
      ...appTypography.body,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
    actionRow: {
      marginTop: appSpacing.xs,
      alignItems: 'flex-start',
    },
  });
