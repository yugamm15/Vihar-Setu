import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { NotificationBellButton } from '../../notifications/components/NotificationBellButton';
import {
  ShieldIcon,
  AlertTriangleIcon,
  NavigationIcon,
  UserIcon,
  RequestsIcon,
  MapPinIcon,
  AlertsBellIcon,
  CheckCircleIcon,
  UsersGroupIcon,
} from '../../../shared/components/CustomSvgIcons';
import { adminService } from '../services/adminService';
import { viharService } from '../../vihar/services/viharService';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { t } from '../../../core/localization/i18n';

export const AdminDashboardScreen = ({ navigation }) => {
  const { profile } = useAuthStore();
  const [metrics, setMetrics] = useState({
    totalSevaks: 0,
    pendingRequests: 0,
    activeSevaks: 0,
    totalVihars: 0,
    activeVihars: 0,
    totalThana: 0,
    totalDistanceKm: '0.0',
    safeCount: 0,
    warningCount: 0,
    emergencyCount: 0,
  });
  const [activeViharsList, setActiveViharsList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [metricsData, { data: dbVihars }] = await Promise.all([
        adminService.fetchDashboardMetrics(),
        viharService.getAllActiveVihars(),
      ]);

      if (metricsData) {
        setMetrics(metricsData);
      }

      if (dbVihars && dbVihars.length > 0) {
        const formatted = dbVihars.map((v) => {
          const activeHold = v.vihar_holds?.find((h) => h.status === 'ACTIVE');
          return {
            id: v.id,
            sangha: v.title || 'Pujya Sadhviji Maharaj Saheb',
            source: v.source_name || 'Starting Upashray',
            destination: v.dest_name || 'Designated Upashray',
            leadSevak: v.profiles?.full_name || 'Active Volunteer',
            battery: '92%',
            speed: activeHold ? '0.0 km/h (Hold)' : '4.0 km/h',
            status: activeHold ? SAFETY_STATUS.HOLD : (v.safety_status || SAFETY_STATUS.SAFE),
          };
        });
        setActiveViharsList(formatted);
      } else {
        setActiveViharsList([]);
      }
    } catch (e) {
      console.warn('[AdminDashboard] Error loading dashboard data:', e);
      setActiveViharsList([]);
    }
  }, []);

  useEffect(() => {
    loadData();

    const unsubscribe = adminService.subscribeToRequests(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title={t('app_name')}
        subtitle="Administrator Console • Surat"
        showLogo
        rightElement={<NotificationBellButton />}
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
        showsVerticalScrollIndicator={false}
      >
        {/* Urgent Pending Sevak Approvals Banner */}
        {metrics.pendingRequests > 0 ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RequestsTab')}
            style={[styles.urgentApprovalCard, shadows.card]}
          >
            <View style={styles.urgentHeaderRow}>
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>ACTION REQUIRED</Text>
              </View>
              <Text style={styles.urgentCountText}>
                {metrics.pendingRequests} Pending Approvals
              </Text>
            </View>

            <Text style={styles.urgentTitle}>New Sevak Registration Requests</Text>
            <Text style={styles.urgentSub}>
              New volunteers have submitted profile details and are waiting for your verification to start seva.
            </Text>

            <View style={styles.urgentActionRow}>
              <Text style={styles.urgentActionLink}>Review & Verify Sevaks →</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* ================================================================ */}
        {/* THE 4 PRIMARY SUMMARY BOXES (As in original Vihar Setu design) */}
        {/* ================================================================ */}
        <Text style={styles.sectionHeading}>Vihar Seva Summary</Text>
        <View style={styles.summaryGrid}>
          {/* 1. Total Sevika */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RequestsTab')}
            style={[styles.summaryCard, shadows.card]}
          >
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: '#FFF3E0' }]}>
                <UsersGroupIcon size={20} color={colors.saffronDark} />
              </View>
              <View style={[styles.summaryTag, { backgroundColor: '#FFF8E7' }]}>
                <Text style={[styles.summaryTagText, { color: colors.saffronDark }]}>SEVIKA</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>{metrics.totalSevaks ?? 0}</Text>
            <Text style={styles.summaryTitle}>Total Sevika</Text>
            <View style={styles.summaryFooterRow}>
              <View style={[styles.microDot, { backgroundColor: colors.statusSafe }]} />
              <Text style={styles.summaryFooterText}>
                {metrics.activeSevaks ?? 0} Active • {metrics.pendingRequests ?? 0} Pending
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2. Total Vihar */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('LiveTab')}
            style={[styles.summaryCard, shadows.card]}
          >
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: '#FBE9E7' }]}>
                <NavigationIcon size={20} color={colors.deepMaroon} />
              </View>
              <View style={[styles.summaryTag, { backgroundColor: '#FFF0F0' }]}>
                <Text style={[styles.summaryTagText, { color: colors.deepMaroon }]}>ROUTES</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>{metrics.totalVihars ?? 0}</Text>
            <Text style={styles.summaryTitle}>Total Vihar</Text>
            <View style={styles.summaryFooterRow}>
              <View style={[styles.microDot, { backgroundColor: colors.saffronDark }]} />
              <Text style={styles.summaryFooterText}>
                {metrics.activeVihars ?? activeViharsList.length ?? 0} Ongoing Trips Now
              </Text>
            </View>
          </TouchableOpacity>

          {/* 3. Total Thana */}
          <View style={[styles.summaryCard, shadows.card]}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: '#FFF8E1' }]}>
                <ShieldIcon size={20} color={colors.gold} />
              </View>
              <View style={[styles.summaryTag, { backgroundColor: '#FFFDE7' }]}>
                <Text style={[styles.summaryTagText, { color: colors.gold }]}>SANGHA</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>{metrics.totalThana}</Text>
            <Text style={styles.summaryTitle}>Total Thana</Text>
            <View style={styles.summaryFooterRow}>
              <View style={[styles.microDot, { backgroundColor: colors.statusSafe }]} />
              <Text style={styles.summaryFooterText}>
                Sadhviji Bhagwants
              </Text>
            </View>
          </View>

          {/* 4. Total Distance */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('LiveTab')}
            style={[styles.summaryCard, shadows.card]}
          >
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <MapPinIcon size={20} color={colors.statusSafe} />
              </View>
              <View style={[styles.summaryTag, { backgroundColor: '#E8F8F0' }]}>
                <Text style={[styles.summaryTagText, { color: colors.statusSafe }]}>GPS KM</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>
              {metrics.totalDistanceKm} <Text style={styles.summaryUnit}>km</Text>
            </Text>
            <Text style={styles.summaryTitle}>Total Distance</Text>
            <View style={styles.summaryFooterRow}>
              <View style={[styles.microDot, { backgroundColor: colors.statusSafe }]} />
              <Text style={styles.summaryFooterText}>
                Tracked Corridor Seva
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ================================================================ */}
        {/* LIVE CORRIDOR RADAR STRIP (Link to Live Tab) */}
        {/* ================================================================ */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('LiveTab')}
          style={[styles.radarBannerCard, shadows.card]}
        >
          <View style={styles.radarBannerHeader}>
            <View style={styles.radarPulseWrap}>
              <View style={styles.radarPulseDot} />
              <Text style={styles.radarBannerTitle}>LIVE CORRIDOR RADAR (SURAT)</Text>
            </View>
            <Text style={styles.radarBannerLink}>Open Live Map →</Text>
          </View>

          <View style={styles.statusChipsRow}>
            <View style={[styles.statusChipItem, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.statusChipText, { color: '#2E7D5B' }]}>
                ✓ {metrics.safeCount || activeViharsList.length} Safe
              </Text>
            </View>
            <View style={[styles.statusChipItem, { backgroundColor: '#FFF9E6' }]}>
              <Text style={[styles.statusChipText, { color: '#641C2D' }]}>
                ⏸ 0 Hold
              </Text>
            </View>
            <View style={[styles.statusChipItem, { backgroundColor: '#FFF8E1' }]}>
              <Text style={[styles.statusChipText, { color: '#D99A24' }]}>
                ⚠ {metrics.warningCount || 0} Drift
              </Text>
            </View>
            <View style={[styles.statusChipItem, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.statusChipText, { color: '#B83232' }]}>
                ⚡ {metrics.emergencyCount || 0} SOS
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Action Navigation Buttons */}
        <Text style={styles.sectionHeading}>Administrative Actions</Text>
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('LiveTab')}
            style={[styles.quickCard, shadows.card]}
          >
            <View style={styles.quickIconCircle}>
              <MapPinIcon size={22} color={colors.deepMaroon} />
            </View>
            <Text style={styles.quickTitle}>Live Map</Text>
            <Text style={styles.quickSub}>Monitor routes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('RequestsTab')}
            style={[styles.quickCard, shadows.card]}
          >
            <View style={styles.quickIconCircle}>
              <RequestsIcon size={22} color={colors.deepMaroon} />
            </View>
            <Text style={styles.quickTitle}>Sevak Approvals</Text>
            <Text style={styles.quickSub}>
              {metrics.pendingRequests > 0
                ? `${metrics.pendingRequests} Pending`
                : 'All verified'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AlertsTab')}
            style={[styles.quickCard, shadows.card]}
          >
            <View style={styles.quickIconCircle}>
              <AlertTriangleIcon size={22} color={colors.deepMaroon} />
            </View>
            <Text style={styles.quickTitle}>Alerts Center</Text>
            <Text style={styles.quickSub}>
              {metrics.emergencyCount > 0 ? `${metrics.emergencyCount} Critical` : '0 Critical'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Active Vihars List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Active Ongoing Vihars</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LiveTab')}>
            <Text style={styles.seeAllLink}>View Live Radar →</Text>
          </TouchableOpacity>
        </View>

        {activeViharsList.length === 0 ? (
          <View style={styles.emptyViharBox}>
            <Text style={styles.emptyViharTitle}>No Active Vihars In Corridor</Text>
            <Text style={styles.emptyViharSub}>
              All Sadhviji Bhagwants and Sevaks are currently in Upashrays or at rest.
            </Text>
          </View>
        ) : (
          activeViharsList.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LiveTab')}
              style={[styles.viharCard, shadows.card]}
            >
              <View style={styles.viharHeader}>
                <View style={styles.viharHeaderInfo}>
                  <Text style={styles.viharSangha}>{item.sangha}</Text>
                  <Text style={styles.viharRoute}>
                    {item.source} → {item.destination}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.viharFooter}>
                <Text style={styles.viharSevak}>Lead Sevak: {item.leadSevak}</Text>
                <Text style={styles.viharMetric}>Battery: {item.battery} • {item.speed}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emptyViharBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  emptyViharTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyViharSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  urgentApprovalCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.saffron,
    marginBottom: spacing.lg,
  },
  urgentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  urgentBadge: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  urgentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warmIvory,
    letterSpacing: 0.5,
  },
  urgentCountText: {
    ...typography.caption,
    color: colors.statusEmergency,
    fontWeight: '800',
  },
  urgentTitle: {
    ...typography.bodyLarge,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: 4,
  },
  urgentSub: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  urgentActionRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.3)',
    paddingTop: spacing.xs,
  },
  urgentActionLink: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  sectionHeading: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  seeAllLink: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '800',
  },
  /* The 4 Elevated Primary Summary Boxes */
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  summaryTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.deepMaroon,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: 2,
  },
  summaryUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  summaryTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    fontSize: 12,
    marginTop: 2,
  },
  summaryFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryFooterText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  /* Live Radar Banner */
  radarBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  radarBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  radarPulseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radarPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSafe,
  },
  radarBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepMaroon,
    letterSpacing: 0.5,
  },
  radarBannerLink: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.saffronDark,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusChipItem: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  /* Quick Actions */
  quickActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
    textAlign: 'center',
    fontSize: 11,
  },
  quickSub: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  /* Vihar Cards */
  viharCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  viharHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  viharHeaderInfo: {
    flex: 1,
    marginRight: spacing.xs,
  },
  viharSangha: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '800',
    lineHeight: 20,
  },
  viharRoute: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },
  viharFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.xs,
  },
  viharSevak: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  viharMetric: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '800',
  },
});
