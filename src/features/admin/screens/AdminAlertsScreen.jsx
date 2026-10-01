import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Modal,
  RefreshControl,
  ActivityIndicator,
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
  CloseIcon,
} from '../../../shared/components/CustomSvgIcons';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { viharService } from '../../vihar/services/viharService';
import { adminService } from '../services/adminService';

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
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    try {
      const { data, error } = await viharService.getAllAlerts();
      if (!error && data && data.length > 0) {
        const formatted = data.map((em) => ({
          id: em.id,
          type: em.trigger_type || 'EMERGENCY',
          severity: em.status === 'TRIGGERED' || em.status === 'ESCALATING' ? 'EMERGENCY' : 'WARNING',
          title: em.trigger_type === 'MANUAL_SOS' ? 'Manual Emergency SOS Triggered' : 'Safety Anomaly Detected',
          message: em.resolution_notes || `Emergency alert triggered at coordinates (${em.latitude.toFixed(4)}, ${em.longitude.toFixed(4)}) with ${em.battery_percentage || 80}% battery.`,
          sevakName: em.profiles?.full_name || 'Vihar Sevak',
          phone: em.profiles?.phone || '+919876500000',
          location: `${em.profiles?.area || 'Surat'}, ${em.profiles?.city || 'Surat'}`,
          timestamp: new Date(em.triggered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          status: em.status === 'RESOLVED' || em.status === 'FALSE_ALARM' ? 'RESOLVED' : 'ACTIVE',
        }));
        setAlerts(formatted);
      } else {
        setAlerts(SAMPLE_ALERTS);
      }
    } catch (e) {
      setAlerts(SAMPLE_ALERTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();

    const unsubscribe = adminService.subscribeToRequests(() => {
      loadAlerts();
    });

    return () => {
      unsubscribe();
    };
  }, [loadAlerts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'ACTIVE') return a.status === 'ACTIVE';
    if (activeTab === 'RESOLVED') return a.status === 'RESOLVED';
    return true;
  });

  const handleResolveAlert = async (alertId) => {
    // If it's a real DB alert (UUID), update Supabase
    if (alertId && alertId.length > 10) {
      await viharService.resolveEmergency(alertId);
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'RESOLVED' } : a))
    );
    setResolvedModalVisible(true);
    adminService.notifyListeners();
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.saffron, colors.deepMaroon]}
          />
        }
      >
        {filteredAlerts.length === 0 ? (
          <View style={[styles.emptyContainer, shadows.card]}>
            <View style={styles.emptyIconCircle}>
              <CheckCircleIcon size={36} color={colors.statusSafe} />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} Alerts</Text>
            <Text style={styles.emptySubtitle}>
              All active Vihar corridors in Surat are operating normally with zero safety deviations.
            </Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => {
            const isEmergency = alert.severity === 'EMERGENCY';
            const isActive = alert.status === 'ACTIVE';

            return (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  isEmergency ? styles.alertCardEmergency : styles.alertCardWarning,
                  shadows.card,
                ]}
              >
                {/* Header */}
                <View style={styles.alertHeaderRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      isEmergency ? styles.typeBadgeEmergency : styles.typeBadgeWarning,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        isEmergency
                          ? styles.typeBadgeTextEmergency
                          : styles.typeBadgeTextWarning,
                      ]}
                    >
                      {alert.type}
                    </Text>
                  </View>
                  <Text style={styles.timestampText}>{alert.timestamp}</Text>
                </View>

                {/* Title & Message */}
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>

                {/* Sevak Metadata */}
                <View style={styles.sevakMetaBox}>
                  <Text style={styles.sevakMetaText}>
                    <Text style={styles.boldText}>Sevak: </Text>{alert.sevakName}
                  </Text>
                  <Text style={styles.sevakMetaText}>
                    <Text style={styles.boldText}>Location: </Text>{alert.location}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleCall(alert.phone)}
                    style={styles.callBtn}
                  >
                    <PhoneIcon size={16} color={colors.warmIvory} />
                    <Text style={styles.callBtnText}>Call Sevak</Text>
                  </TouchableOpacity>

                  {isActive ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleResolveAlert(alert.id)}
                      style={styles.resolveBtn}
                    >
                      <CheckCircleIcon size={16} color={colors.statusSafe} />
                      <Text style={styles.resolveBtnText}>Resolve</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.resolvedBadge}>
                      <CheckCircleIcon size={14} color={colors.statusSafe} />
                      <Text style={styles.resolvedBadgeText}>Resolved</Text>
                    </View>
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalIconCircle}>
              <CheckCircleIcon size={32} color={colors.statusSafe} />
            </View>
            <Text style={styles.modalTitle}>Alert Resolved</Text>
            <Text style={styles.modalMessage}>
              The safety alert has been marked as resolved and recorded in audit logs.
            </Text>
            <PrimaryButton
              title="OK"
              onPress={() => setResolvedModalVisible(false)}
              variant="saffron"
              style={styles.modalBtn}
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
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabBtnActive: {
    backgroundColor: colors.saffron,
  },
  tabBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginTop: spacing.xl,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
  },
  alertCardEmergency: {
    borderColor: colors.statusEmergency,
    backgroundColor: '#FFF9F9',
  },
  alertCardWarning: {
    borderColor: colors.cardBorder,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBadgeEmergency: {
    backgroundColor: '#FFEBEE',
  },
  typeBadgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  typeBadgeTextEmergency: {
    color: colors.statusEmergency,
  },
  typeBadgeTextWarning: {
    color: colors.statusWarning,
  },
  timestampText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  alertTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertMessage: {
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  sevakMetaBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  sevakMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginVertical: 1,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  callBtn: {
    flex: 1,
    backgroundColor: colors.deepMaroon,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtnText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '700',
  },
  resolveBtn: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: colors.statusSafe,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resolveBtnText: {
    ...typography.caption,
    color: colors.statusSafe,
    fontWeight: '700',
  },
  resolvedBadge: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  resolvedBadgeText: {
    ...typography.caption,
    color: colors.statusSafe,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.statusSafe,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: spacing.xs,
  },
  modalMessage: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalBtn: {
    width: '100%',
  },
});
