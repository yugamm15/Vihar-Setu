import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../core/theme/spacing';
import { AlertTriangleIcon } from './CustomSvgIcons';

export const EmergencyButton = ({
  title = 'SOS EMERGENCY',
  subtitle = 'Press to trigger emergency response',
  onPress,
  disabled = false,
  style = {},
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, !disabled && shadows.prominent, style]}
    >
      <View style={styles.pulseRing} />
      <View style={styles.innerButton}>
        <AlertTriangleIcon size={28} color="#FFFFFF" />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.statusEmergency,
    padding: 4,
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: '#FF8A80',
    opacity: 0.6,
  },
  innerButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#FFCDD2',
    marginTop: 2,
  },
});
