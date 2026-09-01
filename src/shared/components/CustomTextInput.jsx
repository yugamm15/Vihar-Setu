import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius, spacing } from '../../core/theme/spacing';

export const CustomTextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  secureTextEntry = false,
  error = '',
  leftElement = null,
  rightElement = null,
  editable = true,
  style = {},
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {leftElement ? <View style={styles.leftElement}>{leftElement}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.textInput}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs + 2,
  },
  label: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    height: 50,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.inputFocusBorder,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: colors.statusEmergency,
    backgroundColor: '#FFF5F5',
  },
  inputDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.7,
  },
  leftElement: {
    marginRight: spacing.sm,
  },
  rightElement: {
    marginLeft: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.statusEmergency,
    marginTop: 4,
    marginLeft: 2,
  },
});
