import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius, spacing } from '../../core/theme/spacing';

export const SecondaryButton = ({
  title,
  onPress,
  disabled = false,
  icon = null,
  style = {},
  textStyle = {},
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.text, disabled && styles.disabledText, textStyle]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  disabled: {
    borderColor: colors.disabled,
    backgroundColor: colors.inputBg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  text: {
    ...typography.button,
    color: colors.deepMaroon,
  },
  disabledText: {
    color: colors.textMuted,
  },
});
