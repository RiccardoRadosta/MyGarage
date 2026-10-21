import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppColors, appRadius } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  loading?: boolean;
  loadingTitle?: string;
  disabled?: boolean;
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  style,
  loading = false,
  loadingTitle,
  disabled = false,
}) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.labelRow}>
        {loading ? <ActivityIndicator size="small" color={variant === 'secondary' ? colors.primary : colors.white} /> : null}
        <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>
          {loading ? loadingTitle ?? title : title}
        </Text>
      </View>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  button: {
    borderRadius: appRadius.md,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerStrong,
  },
  pressed: {
    opacity: 0.9,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
  },
  secondaryLabel: {
    color: colors.primary,
  },
});
