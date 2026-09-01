import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import {
  JainEmblemIcon,
  ShieldIcon,
  AlertTriangleIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../hooks/useAuthStore';
import { storage } from '../../../core/storage/asyncStorage';
import { t } from '../../../core/localization/i18n';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
];

export const OnboardingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { changeLanguage, language } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = [
    {
      id: '1',
      icon: <JainEmblemIcon size={84} color={colors.gold} secondaryColor={colors.deepMaroon} />,
      title: t('onboarding.slide1_title'),
      desc: t('onboarding.slide1_desc'),
    },
    {
      id: '2',
      icon: <AlertTriangleIcon size={74} color={colors.saffron} />,
      title: t('onboarding.slide2_title'),
      desc: t('onboarding.slide2_desc'),
    },
    {
      id: '3',
      icon: <ShieldIcon size={74} color={colors.statusSafe} />,
      title: t('onboarding.slide3_title'),
      desc: t('onboarding.slide3_desc'),
    },
  ];

  const handleLanguageSelect = async (langCode) => {
    await changeLanguage(langCode);
  };

  const handleScroll = (event) => {
    const slideIdx = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(slideIdx);
  };

  const handleGetStarted = async () => {
    await storage.setItem('has_seen_onboarding', true);
    navigation.replace('Login');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) }]}>
      <StatusBar backgroundColor={colors.warmIvory} barStyle="dark-content" />

      {/* Slides Carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <View style={[styles.iconCard, shadows.card]}>
              {slide.icon}
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDesc}>{slide.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              activeIndex === i ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>

      {/* Bottom Section: Language Selection + Get Started */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {/* Language Selector placed comfortably at bottom */}
        <View style={styles.langSection}>
          <Text style={styles.langHeaderTitle}>{t('onboarding.select_language')}:</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map((item) => {
              const isSelected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.8}
                  onPress={() => handleLanguageSelect(item.code)}
                  style={[styles.langChip, isSelected && styles.langChipActive]}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      isSelected && styles.langChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <PrimaryButton
          title={t('onboarding.get_started')}
          onPress={handleGetStarted}
          variant="saffron"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
    justifyContent: 'space-between',
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: 'center',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconCard: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  slideTitle: {
    ...typography.h2,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  slideDesc: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.saffron,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: colors.cardBorder,
  },
  footer: {
    paddingHorizontal: spacing.xl,
  },
  langSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  langHeaderTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  langRow: {
    flexDirection: 'row',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    width: '100%',
  },
  langChip: {
    flex: 1,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: colors.deepMaroon,
  },
  langChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  langChipTextActive: {
    color: colors.warmIvory,
  },
});
