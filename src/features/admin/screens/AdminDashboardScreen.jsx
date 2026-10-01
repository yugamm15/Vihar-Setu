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
import {
  ShieldIcon,
  AlertTriangleIcon,
  NavigationIcon,
  UserIcon,
  RequestsIcon,
  MapPinIcon,
  AlertsBellIcon,
  CheckCircleIcon,
} from '../../../shared/components/CustomSvgIcons';
import { adminService } from '../services/adminService';
import { viharService } from '../../vihar/services/viharService';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { t } from '../../../core/localization/i18n';

const DEMO_LIVE_VIHARS = [
  {
    id: 'demo-1',
    sangha: 'Pujya Sadhviji Shree Ratnamala Maharaj Saheb',
    source: 'Athwagate Jinalay',
    destination: 'Adajan Sangh',
    leadSevak: 'Hetaben Mehta',
    battery: '88%',
    speed: '4.2 km/h',
    status: SAFETY_STATUS.SAFE,
  },
  {
    id: 'demo-2',
    sangha: 'Pujya Sadhviji Shree Hitaprabha Maharaj Saheb',
    source: 'Ghod Dod Road',
    destination: 'Vesu Aradhana Bhavan',
    leadSevak: 'Rekhaben Shah',
    battery: '92%',
    speed: '3.8 km/h',
    status: SAFETY_STATUS.SAFE,
  },
];

export const AdminDashboardScreen = ({ navigation }) => {
  const { profile } = useAuthStore();
  const [metrics, setMetrics] = useState({
    pendingRequests: 0,
    activeSevaks: 0,
    activeVihars: 2,
    safeCount: 2,
    warningCount: 0,
    emergencyCount: 0,
  });
  const [activeViharsList, setActiveViharsList] = useState(DEMO_LIVE_VIHARS);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [metricsData, { data: dbVihars }] = await Promise.all([
        adminService.fetchDashboardMetrics(),
        viharService.getAllActiveVihars(),
      ]);

      setMetrics(metricsData);

      if (dbVihars && dbVihars.length > 0) {
        const formatted = dbVihars.map((v) => ({
          id: v.id,
          sangha: v.title || 'Pujya Sadhviji Maharaj Saheb',
          source: v.source_name || 'Starting Upashray',
          destination: v.dest_name || 'Designated Upashray',
          leadSevak: v.profiles?.full_name || 'Active Volunteer',
          battery: '95%',
          speed: '4.0 km/h',
          status: v.safety_status || SAFETY_STATUS.SAFE,
        }));
        setActiveViharsList(formatted);
      } else {
        setActiveViharsList(DEMO_LIVE_VIHARS);
      }
    } catch (e) {
      console.warn('[AdminDashboard] Error loading dashboard data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to Realtime requests updates
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
        subtitle="Super Admin Console • Surat"
        showLogo
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
              New volunteers have submitted their profile details and are waiting for your verification to start seva.
            </Text>

            <View style={styles.urgentActionRow}>
              <Text style={styles.urgentActionLink}>Review & Verify Sevaks →</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Overview Stats 4-Grid */}
        <Text style={styles.sectionHeading}>Vihar Safety Overview</Text>
        <View style={styles.statsGrid}>
          {/* Active Vihars */}
          <View style={[styles.statBox, shadows.card]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFF8E7' }]}>
              <NavigationIcon size={20} color={colors.saffron} />
            </View>
            <Text style={styles.statNumber}>{activeViharsList.length}</Text>
            <Text style={styles.statLabel}>Active Vihars</Text>
          </View>

          {/* Safe Sevaks */}
          <View style={[styles.statBox, shadows.card]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#D4EDDA' }]}>
              <ShieldIcon size={20} color={colors.statusSafe} />
            </View>
            <Text style={[styles.statNumber, { color: colors.statusSafe }]}>
              {metrics.safeCount || activeViharsList.length}
            </Text>
            <Text style={styles.statLabel}>Safe Status</Text>
          </View>

          {/* Deviation Warnings */}
          <View style={[styles.statBox, shadows.card]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFF3CD' }]}>
              <AlertTriangleIcon size={20} color={colors.statusWarning} />
            </View>
            <Text style={[styles.statNumber, { color: colors.saffronDark }]}>
              {metrics.warningCount}
            </Text>
            <Text style={styles.statLabel}>Deviations</Text>
          </View>

          {/* Emergency SOS */}
          <View style={[styles.statBox, shadows.card]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#F8D7DA' }]}>
              <AlertsBellIcon size={20} color={colors.statusEmergency} />
            </View>
            <Text style={[styles.statNumber, { color: colors.statusEmergency }]}>
              {metrics.emergencyCount}
            </Text>
            <Text style={styles.statLabel}>Emergency SOS</Text>
          </View>
        </View>

        {/* Quick Action Shortcuts */}
        <Text style={styles.sectionHeading}>Quick Administration</Text>
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('LiveTab')}
            style={[styles.quickCard, shadows.card]}
          >
            <View style={styles.quickIconCircle}>
              <MapPinIcon size={24} color={colors.deepMaroon} />
            </View>
            <Text style={styles.quickTitle}>Live Map</Text>
            <Text style={styles.quickSub}>Monitor active routes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('RequestsTab')}
            style={[styles.quickCard, shadows.card]}
          >
            <View style={styles.quickIconCircle}>
              <RequestsIcon size={24} color={colors.deepMaroon} />
            </View>
            <Text style={styles.quickTitle}>Sevak Requests</Text>
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
              <AlertTriangleIcon size={24} color={colors.deepMaroon} />
            </View>
            <Text style={styles.quickTitle}>Alerts Center</Text>
            <Text style={styles.quickSub}>0 Critical issues</Text>
          </TouchableOpacity>
        </View>

        {/* Live Active Vihars List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Live Active Vihars (Surat)</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LiveTab')}>
            <Text style={styles.seeAllLink}>View Live Map →</Text>
          </TouchableOpacity>
        </View>

        {activeViharsList.map((item) => (
          <View key={item.id} style={[styles.viharCard, shadows.card]}>
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
          </View>
        ))}
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statNumber: {
    ...typography.h2,
    color: colors.deepMaroon,
    fontSize: 24,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.deepMaroon,
    textAlign: 'center',
  },
  quickSub: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
});
