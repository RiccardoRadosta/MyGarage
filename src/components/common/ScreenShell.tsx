import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

export const ScreenShell: React.FC<{ children: React.ReactNode; contentStyle?: object }> = ({
  children,
  contentStyle,
}) => <ScreenContent children={children} contentStyle={contentStyle} />;

const ScreenContent: React.FC<{ children: React.ReactNode; contentStyle?: object }> = ({ children, contentStyle }) => {
  const colors = useAppColors();
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: appSpacing.md,
      paddingTop: appSpacing.lg,
      paddingBottom: appSpacing.xxl,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentStyle]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};
