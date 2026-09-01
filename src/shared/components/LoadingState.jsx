import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';

export const LoadingState = ({ message = 'Loading...', style = {} }) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.saffron} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.warmIvory,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    marginTop: spacing.md,
    fontWeight: '500',
  },
});
