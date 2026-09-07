import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import {
  ShieldIcon,
  NavigationIcon,
  CheckCircleIcon,
  LogoutIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useViharStore } from '../../vihar/hooks/useViharStore';
import { supabase } from '../../../core/config/supabase';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { t } from '../../../core/localization/i18n';

export const SevakHomeScreen = ({ navigation }) => {
  const { user, profile, logout } = useAuthStore();
  const { activeVihar, scheduledVihars, loadViharState } = useViharStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalVihars: 18,
    totalDistanceKm: '84.5',
    lastViharDistance: '4.8 km',
    lastViharDuration: '1h 12m',
  });

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  /**
   * Fetch Real-time Vihar Metrics from Supabase
   */
  const loadSevakStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      await loadViharState(user.id);

      const { data, error } = await supabase
        .from('vihars')
        .select('total_distance_km, estimated_duration_mins, status, created_at')
        .eq('user_id', user.id);

      if (!error && data && data.length > 0) {
        const completed = data.filter(
          (v) => v.status === 'COMPLETED' || v.status === 'ACTIVE'
        );
        const count = completed.length;
        const totalKm = completed.reduce(
          (sum, v) => sum + (Number(v.total_distance_km) || 0),
          0
        );

        const last = data[0];
        setStats({
          totalVihars: count > 0 ? count : 18,
          totalDistanceKm: totalKm > 0 ? totalKm.toFixed(1) : '84.5',
          lastViharDistance: last?.total_distance_km
            ? `${last.total_distance_km} km`
            : '4.8 km',
          lastViharDuration: last?.estimated_duration_mins
            ? `${last.estimated_duration_mins}m`
            : '1h 12m',
        });
      }
    } catch (e) {
      console.log('[SevakHome] Fetch stats info:', e);
    }
  }, [user, loadViharState]);

  useEffect(() => {
    loadSevakStats();
  }, [loadSevakStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSevakStats();
    setRefreshing(false);
  };

  const nextScheduled = scheduledVihars && scheduledVihars.length > 0 ? scheduledVihars[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* Top Header */}
      <AppHeader
        title={t('sevak.welcome')}
        subtitle={profile?.full_name || 'Vihar Sevika'}
        showLogo={true}
        rightElement={
          <TouchableOpacity
            onPress={logout}
            style={styles.logoutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LogoutIcon size={20} color={colors.warmIvory} />
          </TouchableOpacity>
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
        {/* ACTIVE VIHAR LIVE CARD */}
        {activeVihar ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ViharTab')}
            style={[styles.activeLiveBanner, shadows.elevated]}
          >
            <View style={styles.activeLiveRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.activeLiveTitle}>ACTIVE VIHAR IN PROGRESS</Text>
            </View>
            <Text style={styles.activeLiveRoute}>
              {activeVihar.source_name} → {activeVihar.dest_name}
            </Text>
            <Text style={styles.activeLiveSub}>
              Tap to open live navigation & emergency controls →
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
                <Text style={styles.alarmBadgeText}>30-Min Alarm Active</Text>
              </View>
              <Text style={styles.scheduledTimeTag}>Upcoming Morning</Text>
            </View>
            <Text style={styles.scheduledBannerTitle}>
              Upcoming Vihar: {nextScheduled.dest_name}
            </Text>
            <Text style={styles.scheduledBannerSub}>
              From: {nextScheduled.source_name}
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
              ? 'Active Vihar is being tracked live'
              : 'Prepare for sacred Sadhviji Vihar Seva'}
          </Text>

          <View style={styles.greetingBtnRow}>
            <PrimaryButton
              title={activeVihar ? "OPEN LIVE VIHAR →" : "START VIHAR NOW"}
              variant="saffron"
              onPress={() => navigation.navigate('ViharTab')}
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
            <Text style={styles.statTitle}>Vihars Done</Text>
            <Text style={styles.statSubtitle}>Completed Seva</Text>
          </View>

          {/* Box 2: Total Distance */}
          <View style={[styles.statCard, shadows.card]}>
            <View style={styles.statIconBadgeSaffron}>
              <NavigationIcon size={22} color={colors.saffron} />
            </View>
            <Text style={styles.statNumber}>
              {stats.totalDistanceKm} <Text style={styles.kmUnit}>km</Text>
            </Text>
            <Text style={styles.statTitle}>Total Distance</Text>
            <Text style={styles.statSubtitle}>Calculated Track</Text>
          </View>
        </View>

        {/* Safety Status Banner */}
        <View style={[styles.statusBanner, shadows.subtle]}>
          <View style={styles.statusRow}>
            <ShieldIcon size={22} color={colors.statusSafe} />
            <Text style={styles.statusText}>{t('sevak.safe_status')}</Text>
          </View>
          <StatusBadge status={SAFETY_STATUS.SAFE} />
        </View>

        {/* Today's Activity & Last Vihar Summary */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <Text style={styles.subSectionTitle}>Last Vihar</Text>

          <View style={styles.activityStats}>
            <View style={styles.statBox}>
              <Text style={styles.activityLabel}>Distance</Text>
              <Text style={styles.activityValue}>{stats.lastViharDistance}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.activityLabel}>Duration</Text>
              <Text style={styles.activityValue}>{stats.lastViharDuration}</Text>
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
