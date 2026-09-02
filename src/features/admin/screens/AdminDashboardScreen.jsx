import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
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
} from '../../../shared/components/CustomSvgIcons';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { t } from '../../../core/localization/i18n';

export const AdminDashboardScreen = ({ navigation }) => {
  const { profile } = useAuthStore();
  const [metrics, setMetrics] = useState({
    pendingRequests: 0,
    activeSevaks: 0,
    activeVihars: 3,
    safeCount: 3,
    warningCount: 0,
    emergencyCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const data = await adminService.fetchDashboardMetrics();
    setMetrics(data);
  };

  useEffect(() => {
    loadData();

    // Subscribe to Realtime requests updates
    const unsubscribe = adminService.subscribeToRequests(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
            colors={[colors.saffron]}
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
                🔴 {metrics.pendingRequests} Pending
              </Text>
            </View>

            <Text style={styles.urgentTitle}>New Sevak Registration Requests</Text>
            <Text style={styles.urgentSub}>
              New volunteers have submitted their profile details and are waiting for your approval to start seva.
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
            <Text style={styles.statNumber}>{metrics.activeVihars}</Text>
            <Text style={styles.statLabel}>Active Vihars</Text>
          </View>

          {/* Safe Sevaks */}
          <View style={[styles.statBox, shadows.card]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#D4EDDA' }]}>
              <ShieldIcon size={20} color={colors.statusSafe} />
            </View>
            <Text style={[styles.statNumber, { color: colors.statusSafe }]}>
              {metrics.safeCount}
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
              <Text style={{ fontSize: 18 }}>🚨</Text>
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

        {/* Active Vihar Item 1 */}
        <View style={[styles.viharCard, shadows.card]}>
          <View style={styles.viharHeader}>
            <View style={styles.viharHeaderInfo}>
              <Text style={styles.viharSangha}>
                Pujya Sadhviji Shree Ratnamala Maharaj Saheb
              </Text>
              <Text style={styles.viharRoute}>
                📍 Athwagate Jinalay ➔ Adajan Sangh
              </Text>
            </View>
            <StatusBadge status={SAFETY_STATUS.SAFE} />
          </View>

          <View style={styles.viharFooter}>
            <Text style={styles.viharSevak}>👤 Lead Sevak: Hetaben Mehta</Text>
            <Text style={styles.viharMetric}>🔋 88% • 4.2 km/h</Text>
          </View>
        </View>

        {/* Active Vihar Item 2 */}
        <View style={[styles.viharCard, shadows.card]}>
          <View style={styles.viharHeader}>
            <View style={styles.viharHeaderInfo}>
              <Text style={styles.viharSangha}>
                Pujya Sadhviji Shree Hitaprabha Maharaj Saheb
              </Text>
              <Text style={styles.viharRoute}>
                📍 Ghod Dod Road ➔ Vesu Aradhana Bhavan
              </Text>
            </View>
            <StatusBadge status={SAFETY_STATUS.SAFE} />
          </View>

          <View style={styles.viharFooter}>
            <Text style={styles.viharSevak}>👤 Lead Sevak: Rekhaben Shah</Text>
            <Text style={styles.viharMetric}>🔋 92% • 3.8 km/h</Text>
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
