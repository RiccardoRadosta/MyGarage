import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AppColors, appRadius } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

export type GoogleSignInButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const GOOGLE_ICON = require('../../../assets/branding/google-logo.png');

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  const colors = useAppColors();
  const styles = createStyles(colors);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel="Continua con Google"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        isDisabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Image source={GOOGLE_ICON} style={styles.googleIcon} resizeMode="contain" />
        )}
        <Text style={styles.label}>
          {loading ? 'Accesso in corso...' : 'Continua con Google'}
        </Text>
      </View>
    </Pressable>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    button: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: appRadius.md,
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    pressed: {
      opacity: 0.85,
      backgroundColor: colors.primarySoft,
    },
    disabled: {
      opacity: 0.5,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    googleIcon: {
      width: 20,
      height: 20,
    },
    label: {
      color: colors.text,
      fontFamily: 'Manrope_700Bold',
      fontSize: 15,
      fontWeight: '700',
    },
  });
