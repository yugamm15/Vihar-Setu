import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { spacing } from '../../../core/theme/spacing';
import { useAuthStore } from '../hooks/useAuthStore';
import { storage } from '../../../core/storage/asyncStorage';
import { t } from '../../../core/localization/i18n';

export const SplashScreen = ({ navigation }) => {
  const { initAuth } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  const navigateNext = async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      // AppNavigator will automatically switch to role dashboard
      return;
    }

    const hasSeenOnboarding = await storage.getItem('has_seen_onboarding');
    if (hasSeenOnboarding) {
      navigation.replace('Login');
    } else {
      navigation.replace('Onboarding');
    }
  };

  useEffect(() => {
    // Subtle entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Check auth and auto-navigate after 1.8 seconds
    const timer = setTimeout(async () => {
      await initAuth();
      await navigateNext();
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={navigateNext}
      style={styles.container}
    >
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
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

        {/* Crisp, Clear, High-Contrast Branding */}
        <Text style={styles.appNameEnglish}>Vihar Setu</Text>
        <Text style={styles.appNameVernacular}>વિહાર સેતુ</Text>
        <Text style={styles.subtitle}>{t('splash.subtitle')}</Text>
        <View style={styles.goldDivider} />
        <Text style={styles.parentName}>જિનાર્ય વિહાર સેવા • Jinaarya Vihar Seva</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.loadingText}>{t('splash.loading_session')}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepMaroon,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emblemWrapper: {
    marginBottom: spacing.lg,
    padding: spacing.xs + 2,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: colors.gold,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  appNameEnglish: {
    ...typography.h1,
    color: colors.warmIvory,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appNameVernacular: {
    fontSize: 22,
    color: '#FCD34D',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.warmIvory,
    opacity: 0.92,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
    fontWeight: '500',
  },
  goldDivider: {
    width: 70,
    height: 3,
    backgroundColor: colors.gold,
    marginVertical: spacing.lg,
    borderRadius: 2,
  },
  parentName: {
    ...typography.caption,
    color: '#FCD34D',
    letterSpacing: 0.8,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.warmIvory,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
});
