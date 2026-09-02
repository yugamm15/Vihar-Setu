import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Modal,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import {
  AlertTriangleIcon,
  PhoneIcon,
  CheckCircleIcon,
  ShieldIcon,
} from '../../../shared/components/CustomSvgIcons';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';

const SAMPLE_ALERTS = [
  {
    id: 'alt-001',
    type: 'DEVIATION', // EMERGENCY | DEVIATION | LOW_BATTERY | STATIONARY
    severity: 'WARNING',
    title: 'Route Deviation Detected',
    message: 'Sevak unit is 210m away from planned Surat vihar path near Adajan Gam crossroad.',
    sevakName: 'Hetaben Mehta',
    phone: '+919876500000',
    location: 'Pal Rander Road, Surat',
    timestamp: '5 mins ago',
    status: 'ACTIVE',
  },
  {
    id: 'alt-002',
    type: 'LOW_BATTERY',
    severity: 'WARNING',
    title: 'Low Battery Alert',
    message: 'Sevak device battery dropped below 18% during active tracking.',
    sevakName: 'Pravinbhai Shah',
    phone: '+919812345678',
    location: 'Athwa Lines, Surat',
    timestamp: '22 mins ago',
    status: 'ACTIVE',
  },
  {
    id: 'alt-003',
    type: 'EMERGENCY',
    severity: 'EMERGENCY',
    title: 'Emergency SOS Triggered',
    message: 'Emergency button pressed during morning vihar near Ghod Dod Road.',
    sevakName: 'Rekhaben Shah',
    phone: '+919876543210',
    location: 'City Light Road, Surat',
    timestamp: 'Yesterday, 07:15 AM',
    status: 'RESOLVED',
  },
];

export const AdminAlertsScreen = () => {
  const [alerts, setAlerts] = useState(SAMPLE_ALERTS);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE | RESOLVED | ALL
  const [resolvedModalVisible, setResolvedModalVisible] = useState(false);

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'ACTIVE') return a.status === 'ACTIVE';
    if (activeTab === 'RESOLVED') return a.status === 'RESOLVED';
    return true;
  });

  const handleResolveAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'RESOLVED' } : a))
    );
    setResolvedModalVisible(true);
  };

  const handleCall = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Alerts Center"
        subtitle="Super Admin Safety & Alerts Monitoring"
        showLogo
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('ACTIVE')}
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'ACTIVE' && styles.tabBtnTextActive,
            ]}
          >
            Active ({alerts.filter((a) => a.status === 'ACTIVE').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('RESOLVED')}
          style={[styles.tabBtn, activeTab === 'RESOLVED' && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'RESOLVED' && styles.tabBtnTextActive,
            ]}
          >
            Resolved ({alerts.filter((a) => a.status === 'RESOLVED').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('ALL')}
          style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'ALL' && styles.tabBtnTextActive,
            ]}
          >
            All History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No Active Alerts</Text>
            <Text style={styles.emptySub}>
              All active Vihars in Surat are moving safely within their designated routes.
            </Text>
          </View>
        ) : (
          filteredAlerts.map((item) => {
            const isEmergency = item.severity === 'EMERGENCY';
            const isActive = item.status === 'ACTIVE';

            return (
              <View
                key={item.id}
                style={[
                  styles.alertCard,
                  isEmergency ? styles.alertCardEmergency : styles.alertCardWarning,
                  shadows.card,
                ]}
              >
                <View style={styles.alertHeaderRow}>
                  <View
                    style={[
                      styles.alertTypeBadge,
                      isEmergency ? styles.badgeRed : styles.badgeAmber,
                    ]}
                  >
                    <Text
                      style={[
                        styles.alertTypeText,
                        isEmergency ? styles.badgeTextRed : styles.badgeTextAmber,
                      ]}
                    >
                      {item.type}
                    </Text>
                  </View>
                  <Text style={styles.alertTime}>{item.timestamp}</Text>
                </View>

                <Text style={styles.alertTitle}>{item.title}</Text>
                <Text style={styles.alertMsg}>{item.message}</Text>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailLine}>
                    👤 <Text style={styles.bold}>Sevak:</Text> {item.sevakName}
                  </Text>
                  <Text style={styles.detailLine}>
                    📍 <Text style={styles.bold}>Location:</Text> {item.location}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => handleCall(item.phone)}
                    style={styles.callActionBtn}
                  >
                    <PhoneIcon size={16} color={colors.warmIvory} />
                    <Text style={styles.callActionText}>Call Sevak</Text>
                  </TouchableOpacity>

                  {isActive && (
                    <TouchableOpacity
                      onPress={() => handleResolveAlert(item.id)}
                      style={styles.resolveActionBtn}
                    >
                      <CheckCircleIcon size={16} color={colors.statusSafe} />
                      <Text style={styles.resolveActionText}>Resolve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* RESOLVED FEEDBACK MODAL */}
      <Modal
        visible={resolvedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResolvedModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.feedbackCard, shadows.elevated]}>
            <View style={styles.feedbackIconCircle}>
              <CheckCircleIcon size={32} color={colors.statusSafe} />
            </View>

            <Text style={styles.feedbackTitle}>Alert Resolved</Text>
            <Text style={styles.feedbackMsg}>
              The safety alert has been marked as resolved and recorded in audit logs.
            </Text>

            <PrimaryButton
              title="OK"
              onPress={() => setResolvedModalVisible(false)}
              variant="saffron"
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.saffron,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warmIvory,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  alertCardEmergency: {
    borderColor: colors.statusEmergency,
    backgroundColor: '#FFF8F8',
  },
  alertCardWarning: {
    borderColor: '#FFEEBA',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeRed: {
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
  },
  badgeAmber: {
    backgroundColor: '#FFF3CD',
  },
  alertTypeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextRed: {
    color: colors.statusEmergency,
  },
  badgeTextAmber: {
    color: '#856404',
  },
  alertTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  alertTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.deepMaroon,
    marginTop: 2,
  },
  alertMsg: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  detailsBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  detailLine: {
    ...typography.caption,
    color: colors.textPrimary,
    marginVertical: 2,
  },
  bold: {
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  callActionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.deepMaroon,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  callActionText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '700',
  },
  resolveActionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: colors.statusSafe,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  resolveActionText: {
    ...typography.caption,
    color: colors.statusSafe,
    fontWeight: '700',
  },

  /* MODAL */
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  feedbackIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: colors.statusSafe,
    marginBottom: spacing.md,
  },
  feedbackTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  feedbackMsg: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
});
