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
            paddingTop: Math.max(insets.top + 16, 44),
            paddingBottom: spacing.xxl + 8,
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
        <Text style={styles.bannerTitleEnglish}>Vihar Setu</Text>
        <Text style={styles.bannerTitleVernacular}>વિહાર સેતુ</Text>
        <Text style={styles.bannerSubtitle}>જિનાર્ય વિહાર સેવા • Jinaarya Vihar Seva</Text>
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
          <View style={styles.cardHeaderCenter}>
            {isAdminMode && (
              <View style={styles.superBadge}>
                <Text style={styles.superBadgeText}>SUPER ADMIN CONSOLE</Text>
              </View>
            )}

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
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.showPassText}>
                    {showPassword ? 'Hide' : 'Show'}
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
                ? 'Switch to Sevak Email OTP Login'
                : 'Super Admin Password Login'}
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
  bannerTitleEnglish: {
    ...typography.h2,
    color: colors.warmIvory,
    fontSize: 28,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  bannerTitleVernacular: {
    fontSize: 18,
    color: '#FCD34D',
    marginTop: 2,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    ...typography.caption,
    color: colors.warmIvory,
    opacity: 0.9,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
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
  cardHeaderCenter: {
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '800',
  },
  cardSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  superBadge: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  superBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warmIvory,
    letterSpacing: 0.5,
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
