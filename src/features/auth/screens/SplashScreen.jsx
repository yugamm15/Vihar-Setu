import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { spacing } from '../../../core/theme/spacing';
import { JainEmblemIcon } from '../../../shared/components/CustomSvgIcons';
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
          <JainEmblemIcon size={110} color={colors.gold} secondaryColor={colors.warmIvory} />
        </View>

        <Text style={styles.appName}>{t('splash.title')}</Text>
        <Text style={styles.subtitle}>{t('splash.subtitle')}</Text>
        <View style={styles.goldDivider} />
        <Text style={styles.parentName}>{t('parent_group')}</Text>
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
  },
  emblemWrapper: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: 9999,
    backgroundColor: 'rgba(201, 164, 76, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 164, 76, 0.3)',
  },
  appName: {
    ...typography.h1,
    color: colors.warmIvory,
    fontSize: 30,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.goldLight,
    marginTop: spacing.xs + 2,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  goldDivider: {
    width: 60,
    height: 2.5,
    backgroundColor: colors.gold,
    marginVertical: spacing.lg,
    borderRadius: 2,
  },
  parentName: {
    ...typography.caption,
    color: colors.goldMuted,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.goldMuted,
  },
});
