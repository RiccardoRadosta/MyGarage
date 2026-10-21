import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { AppColors, appRadius, appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type ScreenContextHeaderProps = {
  label: string;
  onBack: () => void;
};

export const ScreenContextHeader: React.FC<ScreenContextHeaderProps> = ({ label, onBack }) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Torna alla schermata precedente"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <ArrowLeft size={17} color={colors.primary} />
        <Text style={styles.backLabel}>Indietro</Text>
      </Pressable>
      <Text style={styles.contextLabel}>{label}</Text>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: appSpacing.md,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: appRadius.sm,
    flexDirection: 'row',
    gap: appSpacing.xs,
    minHeight: 40,
    paddingHorizontal: appSpacing.xs,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  backLabel: {
    color: colors.primary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  contextLabel: {
    color: colors.muted,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },
});