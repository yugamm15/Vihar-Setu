import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius, spacing } from '../../core/theme/spacing';
import { SAFETY_STATUS } from '../../core/constants/safetyStatus';

export const StatusBadge = ({ status = SAFETY_STATUS.SAFE, customLabel = null, style = {} }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case SAFETY_STATUS.SAFE:
        return {
          bg: colors.statusSafeBg,
          text: colors.statusSafe,
          label: customLabel || 'SAFE',
        };
      case SAFETY_STATUS.WARNING:
        return {
          bg: colors.statusWarningBg,
          text: colors.statusWarning,
          label: customLabel || 'WARNING',
        };
      case SAFETY_STATUS.EMERGENCY:
        return {
          bg: colors.statusEmergencyBg,
          text: colors.statusEmergency,
          label: customLabel || 'EMERGENCY',
        };
      case SAFETY_STATUS.OFFLINE:
      default:
        return {
          bg: colors.statusOfflineBg,
          text: colors.statusOffline,
          label: customLabel || 'OFFLINE',
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: badge.text }]} />
      <Text style={[styles.text, { color: badge.text }]}>{badge.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    ...typography.statusBadge,
  },
});
