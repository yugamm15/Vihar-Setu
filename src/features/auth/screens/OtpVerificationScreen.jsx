import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useAuthStore } from '../hooks/useAuthStore';
import { t } from '../../../core/localization/i18n';

export const OtpVerificationScreen = ({ route, navigation }) => {
  const { phone } = route.params || { phone: '+919876543210' };
  const { verifyOtp, requestOtp, isLoading, error } = useAuthStore();

  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    setLocalError('');
    if (otp.length < 6) {
      setLocalError(t('auth.invalid_otp'));
      return;
    }

    const result = await verifyOtp(phone, otp);
    if (!result.success) {
      setLocalError(t('auth.otp_failed'));
    }
  };

  const handleResend = async () => {
    if (timer === 0) {
      setTimer(30);
      setOtp('');
      await requestOtp(phone);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title={t('auth.otp_title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{t('auth.otp_title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.otp_subtitle')} {phone}
          </Text>

          <CustomTextInput
            label="6-Digit OTP"
            placeholder="123456"
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              if (localError) setLocalError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            error={localError || error}
            style={styles.otpInput}
          />

          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                {t('auth.resend_in', { seconds: timer })}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                <Text style={styles.resendLink}>{t('auth.resend_code')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <PrimaryButton
            title={t('auth.verify_otp')}
            onPress={handleVerify}
            loading={isLoading}
            variant="saffron"
            style={styles.verifyBtn}
          />

          <View style={styles.demoTipBox}>
            <Text style={styles.demoTipText}>
              ℹ️ {t('auth.demo_mode_tip')} (Code: <Text style={styles.bold}>123456</Text>)
            </Text>
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
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  otpInput: {
    marginVertical: spacing.md,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
  },
  timerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  resendLink: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '700',
  },
  verifyBtn: {
    marginTop: spacing.xs,
  },
  demoTipBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  demoTipText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
    color: colors.deepMaroon,
  },
});
