import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import {
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  LogoutIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { t } from '../../../core/localization/i18n';

export const AdminDashboardScreen = ({ navigation }) => {
  const { profile, logout } = useAuthStore();

  // Mock active Vihars telemetry stream for Admin oversight
  const activeSevaks = [
    {
      id: '1',
      name: 'Rekhaben Shah',
      route: 'Palitana ➔ Songadh',
      status: SAFETY_STATUS.SAFE,
      battery: 84,
      speed: '4.2 km/h',
      lastUpdate: '1 min ago',
      emergencyContact: '+919812345678',
    },
    {
      id: '2',
      name: 'Geetaben Mehta',
      route: 'Vallabhipur ➔ Sihor',
      status: SAFETY_STATUS.WARNING,
      battery: 42,
      speed: '0.0 km/h (Stationary 12m)',
      lastUpdate: '2 mins ago',
      emergencyContact: '+919823456789',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* App Header */}
      <AppHeader
        title={t('admin.dashboard_title')}
        subtitle={profile?.full_name || 'Admin Coordinator'}
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* KPI Stat Cards Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, shadows.subtle]}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>{t('admin.active_vihars')}</Text>
          </View>
          <View style={[styles.statCard, shadows.subtle, { borderColor: '#C8E6C9' }]}>
            <Text style={[styles.statNumber, { color: colors.statusSafe }]}>1</Text>
            <Text style={styles.statLabel}>{t('admin.safe_count')}</Text>
          </View>
          <View style={[styles.statCard, shadows.subtle, { borderColor: '#FFE082' }]}>
            <Text style={[styles.statNumber, { color: colors.statusWarning }]}>1</Text>
            <Text style={styles.statLabel}>{t('admin.warning_count')}</Text>
          </View>
          <View style={[styles.statCard, shadows.subtle, { borderColor: '#FFCDD2' }]}>
            <Text style={[styles.statNumber, { color: colors.statusEmergency }]}>0</Text>
            <Text style={styles.statLabel}>{t('admin.emergency_count')}</Text>
          </View>
        </View>

        {/* Live Sevak Tracking Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Vihar Sevak Telemetry</Text>
          <TouchableOpacity onPress={() => alert('Open Full GIS Map (Phase 13/22)')}>
            <Text style={styles.viewMapLink}>{t('admin.live_map')} ➔</Text>
          </TouchableOpacity>
        </View>

        {activeSevaks.map((sevak) => (
          <View key={sevak.id} style={[styles.sevakCard, shadows.card]}>
            <View style={styles.sevakHeader}>
              <View>
                <Text style={styles.sevakName}>{sevak.name}</Text>
                <Text style={styles.sevakRoute}>{sevak.route}</Text>
              </View>
              <StatusBadge status={sevak.status} />
            </View>

            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryText}>⚡ Battery: {sevak.battery}%</Text>
              <Text style={styles.telemetryText}>🏃 Speed: {sevak.speed}</Text>
              <Text style={styles.telemetryText}>🕒 {sevak.lastUpdate}</Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => alert(`Calling ${sevak.emergencyContact}...`)}
              >
                <PhoneIcon size={16} color={colors.deepMaroon} />
                <Text style={styles.callBtnText}>Call Contact</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.monitorBtn}
                onPress={() => alert(`Opening Live GPS stream for ${sevak.name}`)}
              >
                <MapPinIcon size={16} color="#FFFFFF" />
                <Text style={styles.monitorBtnText}>Live Track</Text>
              </TouchableOpacity>
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
  logoutBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  statNumber: {
    ...typography.h2,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  viewMapLink: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '700',
  },
  sevakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  sevakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sevakName: {
    ...typography.h4,
    color: colors.deepMaroon,
  },
  sevakRoute: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.softCream,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.sm,
  },
  telemetryText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#FFFFFF',
  },
  callBtnText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  monitorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron,
  },
  monitorBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
