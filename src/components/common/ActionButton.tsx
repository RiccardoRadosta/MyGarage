import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppColors, appRadius } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

export type ActionButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'regular' | 'compact';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  loadingTitle?: string;
  disabled?: boolean;
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  fullWidth = false,
  style,
  loading = false,
  loadingTitle,
  disabled = false,
}) => {
  const colors = useAppColors();
  const styles = createStyles(colors);

  const isCompact = size === 'compact';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        isCompact && styles.buttonCompact,
        fullWidth && styles.fullWidth,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.labelRow}>
        {loading ? (
          <ActivityIndicator size="small" color={variant === 'secondary' ? colors.primary : colors.white} />
        ) : (
          icon ?? null
        )}
        <Text
          style={[
            styles.label,
            isCompact && styles.labelCompact,
            variant === 'secondary' && styles.secondaryLabel,
          ]}
        >
          {loading ? (loadingTitle ?? title) : title}
        </Text>
      </View>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    button: {
      borderRadius: appRadius.md,
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonCompact: {
      minHeight: 38,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    fullWidth: {
      width: '100%',
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
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.5,
    },
    labelRow: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    label: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 15,
      fontFamily: 'Manrope_700Bold',
    },
    labelCompact: {
      fontSize: 13,
    },
    secondaryLabel: {
      color: colors.primary,
    },
  });
