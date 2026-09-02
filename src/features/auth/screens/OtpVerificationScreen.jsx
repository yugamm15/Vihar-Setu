import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Keyboard,
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
  const scrollViewRef = useRef(null);
  const { email } = route.params || { email: '' };
  const { verifyOtp, requestOtp, isLoading, error } = useAuthStore();

  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [timer, setTimer] = useState(30);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Dynamic Keyboard Listeners
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setLocalError(t('auth.invalid_otp'));
      return;
    }

    const result = await verifyOtp(email, cleanOtp);
    if (!result.success) {
      setLocalError(t('auth.otp_failed'));
      return;
    }

    // If new user with incomplete profile, navigate to Profile Setup
    if (result.isNewUser) {
      navigation.replace('ProfileSetup');
    }
  };

  const handleResend = async () => {
    if (timer === 0) {
      setTimer(30);
      setOtp('');
      await requestOtp(email);
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
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>{t('auth.otp_title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.otp_subtitle')}{' '}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          <CustomTextInput
            label="Verification Code (OTP)"
            placeholder="Enter code from email"
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              if (localError) setLocalError('');
            }}
            keyboardType="number-pad"
            maxLength={8}
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
    lineHeight: 20,
  },
  emailHighlight: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: '700',
  },
  resendRow: {
    alignItems: 'center',
    marginVertical: spacing.md,
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
});
