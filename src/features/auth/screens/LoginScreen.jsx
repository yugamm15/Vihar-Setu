import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { useAuthStore } from '../hooks/useAuthStore';
import { t } from '../../../core/localization/i18n';

export const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const { requestOtp, loginWithPassword, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [localError, setLocalError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Dynamic Keyboard Listener
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

  const validateEmail = (val) => {
    const trimmed = val.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return false;
    }
    return trimmed;
  };

  const handleAction = async () => {
    setLocalError('');
    const validEmail = validateEmail(email);
    if (!validEmail) {
      setLocalError(t('auth.invalid_email'));
      return;
    }

    // Password login for Administrator / Super Admin
    if (isAdminMode) {
      if (!password.trim()) {
        setLocalError('Please enter your administrator password.');
        return;
      }

      const success = await loginWithPassword(validEmail, password);
      if (!success) {
        setLocalError('Invalid email or password. Please try again.');
      }
      return;
    }

    // Guard: If in Sevak OTP mode and entered Super Admin email
    if (!isAdminMode && validEmail === 'bhemanibhemani@gmail.com') {
      setLocalError(
        'This email belongs to the Super Admin account. Please switch to "Administrator / Super Admin Login" below, or enter a correct Sevak email address.'
      );
      return;
    }

    // Standard Email OTP request for Sevaks
    const success = await requestOtp(validEmail);
    if (success) {
      navigation.navigate('OtpVerification', { email: validEmail });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* Header Banner */}
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
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.bannerTitle}>{t('app_name')}</Text>
        <Text style={styles.bannerSubtitle}>{t('parent_group')}</Text>
      </View>

      {/* Main Login Card */}
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
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>
                {isAdminMode
                  ? 'Super Admin Login'
                  : t('auth.login_title')}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isAdminMode
                  ? 'Enter your Super Admin credentials to access console'
                  : t('auth.login_subtitle')}
              </Text>
            </View>

            {isAdminMode && (
              <View style={styles.superBadge}>
                <Text style={styles.superBadgeText}>SUPER ADMIN CONSOLE</Text>
              </View>
            )}
          </View>

          {/* Email Input */}
          <CustomTextInput
            label={t('auth.email_label')}
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (localError) setLocalError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={localError || error}
            leftElement={
              <View style={styles.emailIconBadge}>
                <Text style={styles.emailIconText}>✉️</Text>
              </View>
            }
          />

          {/* Password Input (Shown for Admin Mode) */}
          {isAdminMode && (
            <CustomTextInput
              label="Super Admin Password"
              placeholder="Enter password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (localError) setLocalError('');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              leftElement={
                <View style={styles.emailIconBadge}>
                  <Text style={styles.emailIconText}>🔒</Text>
                </View>
              }
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.showPassText}>
                    {showPassword ? 'Hide 👁️' : 'Show 👁️'}
                  </Text>
                </TouchableOpacity>
              }
            />
          )}

          {/* Submit Button */}
          <PrimaryButton
            title={
              isAdminMode
                ? 'Login as Super Admin'
                : t('auth.send_otp')
            }
            onPress={handleAction}
            loading={isLoading}
            variant="saffron"
            style={styles.actionBtn}
          />

          {/* Toggle between Sevak OTP and Super Admin Password Login */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setIsAdminMode(!isAdminMode);
              setLocalError('');
            }}
            style={styles.toggleModeBtn}
          >
            <Text style={styles.toggleModeText}>
              {isAdminMode
                ? '← Switch to Sevak Email OTP Login'
                : '🔑 Super Admin Password Login'}
            </Text>
          </TouchableOpacity>
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
    marginBottom: spacing.xs,
    padding: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    fontWeight: '600',
    letterSpacing: 0.5,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    maxWidth: 240,
  },
  superBadge: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  superBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warmIvory,
    letterSpacing: 0.5,
  },
  emailIconBadge: {
    paddingRight: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: colors.inputBorder,
    marginRight: spacing.xs,
  },
  emailIconText: {
    fontSize: 16,
  },
  showPassText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  toggleModeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  toggleModeText: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '700',
  },
});
