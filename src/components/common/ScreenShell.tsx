import React from 'react';
import { ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { appSpacing } from '../../theme/theme';
import { useAppColors } from '../../theme/ThemeContext';

export type ScreenShellProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
};

export const ScreenShell: React.FC<ScreenShellProps> = ({
  children,
  contentStyle,
  style,
  edges = ['top', 'bottom'],
}) => {
  const colors = useAppColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, style]} edges={edges}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: appSpacing.md,
    paddingTop: appSpacing.lg,
    paddingBottom: appSpacing.xxl,
  },
});
