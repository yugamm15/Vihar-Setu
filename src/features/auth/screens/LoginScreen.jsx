import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { JainEmblemIcon } from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../hooks/useAuthStore';
import { t } from '../../../core/localization/i18n';

export const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { requestOtp, isLoading, error } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (num) => {
    const cleaned = num.replace(/[^0-9]/g, '');
    if (cleaned.length !== 10) {
      return false;
    }
    return cleaned;
  };

  const handleSendOtp = async () => {
    setPhoneError('');
    const validNumber = validatePhone(phoneNumber);
    if (!validNumber) {
      setPhoneError(t('auth.invalid_phone'));
      return;
    }

    const fullPhone = `+91${validNumber}`;
    const success = await requestOtp(fullPhone);

    if (success) {
      navigation.navigate('OtpVerification', { phone: fullPhone });
    }
  };

  const handleQuickFill = (testNum) => {
    setPhoneNumber(testNum);
    setPhoneError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* Header Banner with Safe Area & generous padding */}
      <View
        style={[
          styles.topBanner,
          {
            paddingTop: Math.max(insets.top + 20, 52),
            paddingBottom: spacing.xxl,
          },
        ]}
      >
        <View style={styles.emblemWrapper}>
          <JainEmblemIcon size={68} color={colors.gold} secondaryColor={colors.warmIvory} />
        </View>
        <Text style={styles.bannerTitle}>{t('app_name')}</Text>
        <Text style={styles.bannerSubtitle}>{t('parent_group')}</Text>
      </View>

      {/* Main Login Card */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardTitle}>{t('auth.login_title')}</Text>
          <Text style={styles.cardSubtitle}>{t('auth.login_subtitle')}</Text>

          <CustomTextInput
            label={t('auth.phone_label')}
            placeholder={t('auth.phone_placeholder')}
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (phoneError) setPhoneError('');
            }}
            keyboardType="number-pad"
            maxLength={10}
            error={phoneError || error}
            leftElement={
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
            }
          />

          <PrimaryButton
            title={t('auth.send_otp')}
            onPress={handleSendOtp}
            loading={isLoading}
            variant="saffron"
            style={styles.actionBtn}
          />

          {/* Quick Demo Test Buttons */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Quick Test Credentials:</Text>
            <View style={styles.demoChipsRow}>
              <TouchableOpacity
                onPress={() => handleQuickFill('9876543210')}
                style={styles.demoChip}
              >
                <Text style={styles.demoChipText}>Sevak (9876543210)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickFill('9876543211')}
                style={styles.demoChip}
              >
                <Text style={styles.demoChipText}>Admin (9876543211)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickFill('9876543212')}
                style={styles.demoChip}
              >
                <Text style={styles.demoChipText}>Super Admin (9876543212)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  topBanner: {
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
  },
  emblemWrapper: {
    marginBottom: spacing.sm,
    padding: spacing.xs + 2,
    borderRadius: 9999,
    backgroundColor: 'rgba(201, 164, 76, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 164, 76, 0.35)',
  },
  bannerTitle: {
    ...typography.h2,
    color: colors.warmIvory,
    fontSize: 24,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  bannerSubtitle: {
    ...typography.caption,
    color: colors.goldLight,
    marginTop: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginTop: -spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  countryCodeBadge: {
    paddingRight: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: colors.inputBorder,
    marginRight: spacing.xs,
  },
  countryCodeText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  demoBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  demoTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  demoChipsRow: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  demoChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  demoChipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
