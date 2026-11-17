import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Linking,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { NotificationBellButton } from '../../notifications/components/NotificationBellButton';
import {
  ShieldIcon,
  NavigationIcon,
  CheckCircleIcon,
  LogoutIcon,
  WomenSafetyShieldIcon,
  PhoneIcon,
  SirenIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useViharStore } from '../../vihar/hooks/useViharStore';
import { supabase } from '../../../core/config/supabase';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { t } from '../../../core/localization/i18n';

const formatViharDuration = (vihar) => {
  const start = vihar.started_at ? new Date(vihar.started_at) : null;
  const end = vihar.completed_at
    ? new Date(vihar.completed_at)
    : vihar.status === 'ACTIVE'
      ? new Date()
      : null;

  if (start && end && end >= start) {
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0 && remainingMinutes === 0 && vihar.status === 'ACTIVE') {
      return '<1m';
    }
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  }

  return vihar.estimated_duration_mins
    ? `${vihar.estimated_duration_mins}m`
    : null;
};

export const SevakHomeScreen = ({ navigation }) => {
  const { user, profile, logout, language } = useAuthStore();
  const { activeVihar, scheduledVihars, loadViharState } = useViharStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalVihars: 0,
    totalDistanceKm: '0.0',
    todayDistance: null,
    todayDuration: null,
    deskPhone: null,
  });
  const [statsError, setStatsError] = useState(null);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return t('home.morning');
    if (hours < 17) return t('home.afternoon');
    return t('home.evening');
  };

  /**
   * Fetch Real-time Vihar Metrics from Supabase
   */
  const loadSevakStats = useCallback(async () => {
    if (!user?.id) return;
    setStatsError(null);
    try {
      await loadViharState(user.id);

      const { data, error } = await supabase
        .from('vihars')
        .select(
        'id, total_distance_km, estimated_duration_mins, status, created_at, started_at, completed_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let deskPhone = null;
      if (profile?.area) {
        const { data: area, error: areaError } = await supabase
          .from('areas')
          .select('admin_phone')
          .eq('name', profile.area)
          .eq('is_active', true)
          .maybeSingle();

        if (areaError) throw areaError;
        deskPhone = area?.admin_phone || null;
      }

      const vihars = data || [];
      const completed = vihars.filter((vihar) => vihar.status === 'COMPLETED');
      const totalKm = completed.reduce(
        (sum, vihar) => sum + (Number(vihar.total_distance_km) || 0),
        0
      );
      const today = new Date();
      const todayVihar =
        (activeVihar?.status === 'ACTIVE' ? activeVihar : null) ||
        vihars.find((vihar) => {
          if (vihar.status !== 'ACTIVE' && vihar.status !== 'COMPLETED') return false;
          const activityDate = vihar.started_at || vihar.completed_at || vihar.created_at;
          if (!activityDate) return false;
          const date = new Date(activityDate);
          return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
          );
        });

      const distanceKm = todayVihar ? Number(todayVihar.total_distance_km) : NaN;

      setStats({
        totalVihars: completed.length,
        totalDistanceKm: totalKm.toFixed(1),
        todayDistance: Number.isFinite(distanceKm) && distanceKm >= 0
          ? `${distanceKm.toFixed(1)} km`
          : null,
        todayDuration: todayVihar ? formatViharDuration(todayVihar) : null,
        deskPhone,
      });
    } catch (e) {
      console.warn('[SevakHome] Fetch stats failed:', e);
      setStatsError('Unable to load your Vihar activity. Pull to retry.');
    }
  }, [user, profile, activeVihar, loadViharState]);

  useFocusEffect(
    useCallback(() => {
      loadSevakStats();
    }, [loadSevakStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSevakStats();
    setRefreshing(false);
  };

  const nextScheduled = scheduledVihars && scheduledVihars.length > 0 ? scheduledVihars[0] : null;
  const safetyStatus = activeVihar?.safety_status || SAFETY_STATUS.SAFE;

  return (
    <View key={language} style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* Top Header */}
      <AppHeader
        title={t('sevak.welcome')}
        subtitle={profile?.full_name || 'Vihar Sevika'}
        showLogo={true}
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <NotificationBellButton />
            <TouchableOpacity
              onPress={logout}
              style={styles.logoutBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <LogoutIcon size={20} color={colors.warmIvory} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.saffron, colors.deepMaroon]}
          />
        }
      >
        {statsError ? <Text style={styles.statsError}>{statsError}</Text> : null}

        {/* ACTIVE VIHAR LIVE CARD */}
        {activeVihar ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ViharTab')}
            style={[styles.activeLiveBanner, shadows.elevated]}
          >
            <View style={styles.activeLiveRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.activeLiveTitle}>{t('home.active_vihar_banner_title')}</Text>
            </View>
            <Text style={styles.activeLiveRoute}>
              {activeVihar.source_name} → {activeVihar.dest_name}
            </Text>
            <Text style={styles.activeLiveSub}>
              {t('home.active_vihar_banner_sub')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* SCHEDULED VIHAR 30-MIN PRE-ALARM BANNER */}
        {!activeVihar && nextScheduled ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ViharTab')}
            style={[styles.scheduledBannerCard, shadows.card]}
          >
            <View style={styles.scheduledBannerHeader}>
              <View style={styles.alarmBadge}>
                <Text style={styles.alarmBadgeText}>{t('home.alarm_active')}</Text>
              </View>
              <Text style={styles.scheduledTimeTag}>{t('home.upcoming_morning')}</Text>
            </View>
            <Text style={styles.scheduledBannerTitle}>
              {t('home.upcoming_vihar')} {nextScheduled.dest_name}
            </Text>
            <Text style={styles.scheduledBannerSub}>
              {t('home.from_source')} {nextScheduled.source_name}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Greeting Banner */}
        <View style={[styles.greetingCard, shadows.card]}>
          <Text style={styles.greetingTitle}>
            {getGreeting()}, {profile?.full_name || 'Sevak'}
          </Text>
          <Text style={styles.greetingSubtitle}>
            {activeVihar
              ? t('home.active_tracking')
              : t('home.prepare')}
          </Text>

          <View style={styles.greetingBtnRow}>
            <PrimaryButton
              title={activeVihar ? t('home.open_live_vihar') : t('home.start_vihar')}
              variant="saffron"
              onPress={() =>
                navigation.navigate('ViharTab', {
                  openCreateMode: activeVihar ? undefined : 'NOW',
                })
              }
              style={styles.startViharBtn}
            />
          </View>
        </View>

        {/* 2 STATS BOXES */}
        <View style={styles.statsRow}>
          {/* Box 1: Total Vihars Done */}
          <View style={[styles.statCard, shadows.card]}>
            <View style={styles.statIconBadgeGold}>
              <CheckCircleIcon size={22} color={colors.gold} />
            </View>
            <Text style={styles.statNumber}>{stats.totalVihars}</Text>
            <Text style={styles.statTitle}>{t('home.vihars_done')}</Text>
            <Text style={styles.statSubtitle}>{t('home.completed_seva')}</Text>
          </View>

          {/* Box 2: Total Distance */}
          <View style={[styles.statCard, shadows.card]}>
            <View style={styles.statIconBadgeSaffron}>
              <NavigationIcon size={22} color={colors.saffron} />
            </View>
            <Text style={styles.statNumber}>
              {stats.totalDistanceKm} <Text style={styles.kmUnit}>km</Text>
            </Text>
            <Text style={styles.statTitle}>{t('home.total_distance')}</Text>
            <Text style={styles.statSubtitle}>{t('home.calculated_track')}</Text>
          </View>
        </View>

        {/* Safety Status Banner */}
        <View style={[styles.statusBanner, shadows.subtle]}>
          <View style={styles.statusRow}>
            <ShieldIcon size={22} color={colors.statusSafe} />
            <Text style={styles.statusText}>
              {safetyStatus === SAFETY_STATUS.SAFE
                ? t('sevak.safe_status')
                : safetyStatus.replace('_', ' ')}
            </Text>
          </View>
          <StatusBadge status={safetyStatus} />
        </View>

        {/* 24x7 Women Safety & Emergency Dials Strip */}
        <View style={[styles.homeSafetyCard, shadows.subtle]}>
          <View style={styles.homeSafetyHeader}>
            <WomenSafetyShieldIcon size={20} color={colors.statusEmergency} />
            <Text style={styles.homeSafetyTitle}>{t('home.women_safety')}</Text>
          </View>
          <Text style={styles.homeSafetySubtitle}>
            {t('home.women_safety_subtitle')}
          </Text>
          <View style={styles.homeHelplineRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL('tel:112')}
              style={[styles.homeHelplineBtn, styles.policeBg]}
            >
              <PhoneIcon size={14} color="#FFFFFF" />
              <Text style={styles.homeHelplineBtnText}>{t('home.police')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL('tel:181')}
              style={[styles.homeHelplineBtn, styles.abhayamBg]}
            >
              <WomenSafetyShieldIcon size={14} color="#FFFFFF" />
              <Text style={styles.homeHelplineBtnText}>{t('home.abhayam')}</Text>
            </TouchableOpacity>

            {stats.deskPhone ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => Linking.openURL(`tel:${stats.deskPhone}`)}
                style={[styles.homeHelplineBtn, styles.deskBg]}
              >
                <PhoneIcon size={14} color="#FFFFFF" />
                <Text style={styles.homeHelplineBtnText}>{t('home.vihar_desk')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>


        {/* Today's Activity & Last Vihar Summary */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>{t('home.todays_activity')}</Text>
          <Text style={styles.subSectionTitle}>
            {stats.todayDistance ? t('sevak.active_vihar') : t('home.no_vihar_today')}
          </Text>

          <View style={styles.activityStats}>
            <View style={styles.statBox}>
              <Text style={styles.activityLabel}>{t('home.distance')}</Text>
              <Text style={styles.activityValue}>{stats.todayDistance || '-'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.activityLabel}>{t('home.duration')}</Text>
              <Text style={styles.activityValue}>{stats.todayDuration || '-'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  logoutBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statsError: {
    ...typography.caption,
    color: colors.statusEmergency,
    marginBottom: spacing.md,
  },
  activeLiveBanner: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 5,
    borderLeftColor: colors.saffron,
  },
  activeLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E676',
  },
  activeLiveTitle: {
    ...typography.caption,
    color: '#00E676',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeLiveRoute: {
    ...typography.bodyMedium,
    color: colors.warmIvory,
    fontWeight: '700',
    marginBottom: 2,
  },
  activeLiveSub: {
    ...typography.caption,
    color: colors.goldLight,
  },
  scheduledBannerCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  scheduledBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alarmBadge: {
    backgroundColor: colors.gold,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  alarmBadgeText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    fontSize: 10,
  },
  scheduledTimeTag: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scheduledBannerTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: 2,
  },
  scheduledBannerSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  greetingCard: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  greetingTitle: {
    ...typography.h2,
    color: colors.warmIvory,
    marginBottom: 4,
  },
  greetingSubtitle: {
    ...typography.bodyMedium,
    color: colors.goldLight,
    marginBottom: spacing.lg,
  },
  greetingBtnRow: {
    gap: spacing.sm,
  },
  startViharBtn: {
    backgroundColor: colors.saffron,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  statIconBadgeGold: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(201, 164, 76, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statIconBadgeSaffron: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(217, 138, 43, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statNumber: {
    ...typography.h2,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 2,
  },
  kmUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statTitle: {
    ...typography.bodySmall,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  statSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  statusBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: colors.statusSafe,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  /* 24x7 WOMEN SAFETY CARD STYLES */
  homeSafetyCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    marginBottom: spacing.lg,
  },
  homeSafetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  homeSafetyTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.statusEmergency,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  homeSafetySubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  homeHelplineRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  homeHelplineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: borderRadius.sm,
  },
  policeBg: {
    backgroundColor: '#B71C1C',
  },
  abhayamBg: {
    backgroundColor: '#4A148C',
  },
  deskBg: {
    backgroundColor: '#E65100',
  },
  homeHelplineBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 2,
  },
  subSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  activityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.cardBorder,
  },
  activityLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  activityValue: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
});
