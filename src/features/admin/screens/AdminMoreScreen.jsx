import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import {
  UserIcon,
  ReportsChartIcon,
  UsersGroupIcon,
  AlertsBellIcon,
  SettingsGearIcon,
  ShieldIcon,
  LogsFileIcon,
  LogoutIcon,
  CheckCircleIcon,
  HelpCircleIcon,
  InfoIcon,
  CloseIcon,
  PhoneIcon,
  NavigationIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useAlertStore } from '../../../shared/hooks/useAlertStore';
import { adminService } from '../services/adminService';
import { ROLES } from '../../../core/constants/roles';

export const AdminMoreScreen = () => {
  const { user, profile, role, logout } = useAuthStore();
  const { showAlert } = useAlertStore();

  const [activeModal, setActiveModal] = useState(null); // 'REPORTS' | 'USERS' | 'LOGS' | 'SETTINGS' | 'SECURITY' | 'HELP' | 'ABOUT'

  // Reports state
  const [reportsData, setReportsData] = useState({
    viharsCompleted: 42,
    totalKmCovered: '186.4',
    activeSevaksCount: 18,
    safetyRate: '100%',
    avgResponseTime: '1.4 min',
  });
  const [reportsLoading, setReportsLoading] = useState(false);

  // Users directory state
  const [usersList, setUsersList] = useState([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Settings state
  const [deviationThreshold, setDeviationThreshold] = useState('50m');
  const [gpsFrequency, setGpsFrequency] = useState('5s');
  const [chimesEnabled, setChimesEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    const data = await adminService.fetchSystemReports();
    setReportsData(data);
    setReportsLoading(false);
  }, []);

  const loadUsersDirectory = useCallback(async (query = '') => {
    setUsersLoading(true);
    const { data } = await adminService.fetchUsersDirectory(query);
    setUsersList(data || []);
    setUsersLoading(false);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    const { data } = await adminService.fetchAuditLogs();
    setAuditLogs(data || []);
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    if (activeModal === 'REPORTS') {
      loadReports();
    } else if (activeModal === 'USERS') {
      loadUsersDirectory(usersSearch);
    } else if (activeModal === 'LOGS') {
      loadAuditLogs();
    }
  }, [activeModal, loadReports, loadUsersDirectory, loadAuditLogs, usersSearch]);

  const handleOpenModal = (modalName) => {
    setActiveModal(modalName);
  };

  const handleCallUser = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleLogout = () => {
    showAlert({
      type: 'CONFIRM',
      title: 'Logout Super Admin',
      message: 'Are you sure you want to end your Super Admin session on this device?',
      confirmText: 'Yes, Logout',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Super Admin Console"
        subtitle="Control & System Operations"
        showLogo
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, shadows.card]}>
          <View style={styles.avatarGlowRing}>
            <View style={styles.avatarCircle}>
              <UserIcon size={38} color={colors.warmIvory} />
            </View>
          </View>

          <Text style={styles.userName}>{profile?.full_name || 'Admin Officer'}</Text>
          <Text style={styles.userEmail}>{profile?.email || user?.email || '—'}</Text>

          <View style={styles.roleBadge}>
            <CheckCircleIcon size={14} color={colors.gold} />
            <Text style={styles.roleBadgeText}>
              {isSuperAdmin ? 'SUPER ADMINISTRATOR' : 'ADMINISTRATOR'}
            </Text>
          </View>
        </View>

        {/* Section 1: Core Operations */}
        <Text style={styles.sectionHeader}>Operations & Management</Text>
        <View style={[styles.menuCard, shadows.card]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenModal('REPORTS')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF8E7' }]}>
              <ReportsChartIcon size={20} color={colors.saffronDark} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Reports & Analytics</Text>
              <Text style={styles.menuSub}>Vihar metrics, safety stats & response times</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenModal('USERS')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <UsersGroupIcon size={20} color={colors.statusSafe} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Users & Sevaks Directory</Text>
              <Text style={styles.menuSub}>Live directory of verified volunteers</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenModal('LOGS')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#F3E5F5' }]}>
              <LogsFileIcon size={20} color="#7B1FA2" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Activity & Audit Logs</Text>
              <Text style={styles.menuSub}>Timeline of approvals, alerts & system events</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Preferences & Security */}
        <Text style={styles.sectionHeader}>Preferences & Security</Text>
        <View style={[styles.menuCard, shadows.card]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenModal('SETTINGS')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <SettingsGearIcon size={20} color="#1976D2" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Settings & Alert Thresholds</Text>
              <Text style={styles.menuSub}>Route deviation limits, telemetry sounds</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenModal('SECURITY')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <ShieldIcon size={20} color="#E65100" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Privacy & Security</Text>
              <Text style={styles.menuSub}>Database encryption & session protections</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Support & About */}
        <Text style={styles.sectionHeader}>Support & Organization</Text>
        <View style={[styles.menuCard, shadows.card]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenModal('HELP')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FBE9E7' }]}>
              <HelpCircleIcon size={20} color={colors.saffronDark} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help & Support Guidelines</Text>
              <Text style={styles.menuSub}>Admin hotline & emergency response manual</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenModal('ABOUT')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.softCream }]}>
              <InfoIcon size={20} color={colors.deepMaroon} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>About Vihar Setu</Text>
              <Text style={styles.menuSub}>Jinaarya Vihar Seva • v1.0.0</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          style={[styles.logoutCard, shadows.card]}
        >
          <LogoutIcon size={20} color={colors.statusEmergency} />
          <Text style={styles.logoutText}>Logout Super Admin Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* REPORTS MODAL */}
      <Modal
        visible={activeModal === 'REPORTS'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reports & Analytics</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            {reportsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.saffron} />
                <Text style={styles.loadingText}>Compiling system analytics...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticNum}>{reportsData.viharsCompleted}</Text>
                    <Text style={styles.analyticLabel}>Vihars Completed</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticNum}>{reportsData.activeSevaksCount}</Text>
                    <Text style={styles.analyticLabel}>Active Sevaks</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticNum, { color: colors.statusSafe }]}>{reportsData.safetyRate}</Text>
                    <Text style={styles.analyticLabel}>Safety Rate</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticNum, { color: colors.saffronDark }]}>{reportsData.avgResponseTime}</Text>
                    <Text style={styles.analyticLabel}>Avg SOS Response</Text>
                  </View>
                </View>

                <Text style={styles.reportSubtitle}>Surat Regional Summary</Text>
                <View style={styles.reportSummaryCard}>
                  <Text style={styles.reportLine}>
                    • Total Distance Monitored: <Text style={styles.bold}>{reportsData.totalKmCovered} km</Text>
                  </Text>
                  <Text style={styles.reportLine}>
                    • Completed Vihar Routes: <Text style={styles.bold}>{reportsData.viharsCompleted} journeys</Text>
                  </Text>
                  <Text style={styles.reportLine}>
                    • Active Verified Volunteers: <Text style={styles.bold}>{reportsData.activeSevaksCount} sevaks</Text>
                  </Text>
                  <Text style={styles.reportLine}>
                    • Safety Rating: <Text style={styles.bold}>{reportsData.safetyRate} zero untoward incidents</Text>
                  </Text>
                </View>

                <PrimaryButton
                  title="Close Analytics"
                  onPress={() => setActiveModal(null)}
                  variant="saffron"
                  style={{ marginTop: spacing.lg }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* USERS DIRECTORY MODAL */}
      <Modal
        visible={activeModal === 'USERS'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verified Users Directory</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <TextInput
                placeholder="Search by name, phone, area..."
                placeholderTextColor={colors.textMuted}
                value={usersSearch}
                onChangeText={(text) => {
                  setUsersSearch(text);
                  loadUsersDirectory(text);
                }}
                style={styles.searchInput}
              />
            </View>

            {usersLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.saffron} />
                <Text style={styles.loadingText}>Loading Sevaks directory...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                {usersList.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No registered Sevaks match your search.</Text>
                  </View>
                ) : (
                  usersList.map((item) => (
                    <View key={item.id} style={styles.userDirItem}>
                      <View style={styles.userDirAvatar}>
                        <UserIcon size={20} color={colors.warmIvory} />
                      </View>
                      <View style={styles.userDirInfo}>
                        <Text style={styles.userDirName}>{item.full_name || 'Sevak'}</Text>
                        <Text style={styles.userDirSub}>
                          {item.area ? `${item.area}, ` : ''}{item.city || 'Surat'} • {item.blood_group || 'B+'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCallUser(item.phone)}
                        style={styles.phoneActionBtn}
                      >
                        <PhoneIcon size={16} color={colors.deepMaroon} />
                      </TouchableOpacity>
                      <View style={[styles.activePill, item.status === 'PENDING' && styles.pendingPill]}>
                        <Text style={[styles.activePillText, item.status === 'PENDING' && styles.pendingPillText]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* AUDIT LOGS MODAL */}
      <Modal
        visible={activeModal === 'LOGS'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity & Audit Logs</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            {logsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.saffron} />
                <Text style={styles.loadingText}>Fetching database audit trail...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                {auditLogs.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No recent activity logs recorded.</Text>
                  </View>
                ) : (
                  auditLogs.map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <View style={styles.logHeaderRow}>
                        <Text style={styles.logTime}>{formatDate(log.timestamp)}</Text>
                        <Text style={[
                          styles.logTypeTag,
                          log.type === 'EMERGENCY' ? styles.logTypeEmergency : styles.logTypeSafe,
                        ]}>
                          {log.type}
                        </Text>
                      </View>
                      <Text style={styles.logTitleText}>{log.title}</Text>
                      <Text style={styles.logEvent}>{log.detail}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* SETTINGS & THRESHOLDS MODAL */}
      <Modal
        visible={activeModal === 'SETTINGS'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings & Thresholds</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.settingSectionLabel}>Route Deviation Limit</Text>
              <View style={styles.chipsRow}>
                {['30m', '50m (Standard)', '100m'].map((th) => (
                  <TouchableOpacity
                    key={th}
                    onPress={() => setDeviationThreshold(th)}
                    style={[styles.thresholdChip, deviationThreshold === th && styles.thresholdChipActive]}
                  >
                    <Text style={[styles.thresholdChipText, deviationThreshold === th && styles.thresholdChipTextActive]}>
                      {th}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingSectionLabel}>GPS Telemetry Frequency</Text>
              <View style={styles.chipsRow}>
                {['3s (High)', '5s (Normal)', '10s (Eco)'].map((fr) => (
                  <TouchableOpacity
                    key={fr}
                    onPress={() => setGpsFrequency(fr)}
                    style={[styles.thresholdChip, gpsFrequency === fr && styles.thresholdChipActive]}
                  >
                    <Text style={[styles.thresholdChipText, gpsFrequency === fr && styles.thresholdChipTextActive]}>
                      {fr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Emergency Audio Chimes</Text>
                  <Text style={styles.switchSub}>Play loud sacred alarm during SOS triggers</Text>
                </View>
                <Switch
                  value={chimesEnabled}
                  onValueChange={setChimesEnabled}
                  trackColor={{ false: '#DDD', true: colors.saffron }}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Haptic Feedback Vibration</Text>
                  <Text style={styles.switchSub}>Vibrate phone during alerts and check-ins</Text>
                </View>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={{ false: '#DDD', true: colors.saffron }}
                />
              </View>

              <PrimaryButton
                title="Save Settings"
                onPress={() => {
                  setActiveModal(null);
                  showAlert({
                    type: 'SUCCESS',
                    title: 'Settings Saved',
                    message: 'Admin telemetry thresholds and notification preferences updated.',
                  });
                }}
                variant="saffron"
                style={{ marginTop: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PRIVACY & SECURITY MODAL */}
      <Modal
        visible={activeModal === 'SECURITY'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy & Security Center</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.securityBox}>
                <ShieldIcon size={28} color={colors.statusSafe} />
                <Text style={styles.securityTitle}>Database Row-Level Security (RLS)</Text>
                <Text style={styles.securityDesc}>
                  Active. Only verified administrators have read/write access to Sevak coordinates and emergency telemetry.
                </Text>
              </View>

              <View style={styles.securityBox}>
                <NavigationIcon size={28} color={colors.saffronDark} />
                <Text style={styles.securityTitle}>Encrypted Telemetry Channels</Text>
                <Text style={styles.securityDesc}>
                  All GPS pings, routes, and emergency broadcast signals are encrypted via SSL/TLS during transit.
                </Text>
              </View>

              <View style={styles.securityBox}>
                <CheckCircleIcon size={28} color="#1976D2" />
                <Text style={styles.securityTitle}>Session & Role Protection</Text>
                <Text style={styles.securityDesc}>
                  Supabase JWT authentication tokens are securely persisted in encrypted storage and refreshed automatically.
                </Text>
              </View>

              <PrimaryButton
                title="Got It"
                onPress={() => setActiveModal(null)}
                variant="saffron"
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HELP & GUIDELINES MODAL */}
      <Modal
        visible={activeModal === 'HELP'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Escalation Guidelines</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.guidelineCard}>
                <Text style={styles.guideNumber}>1</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>Emergency SOS Escalation</Text>
                  <Text style={styles.guideText}>
                    Upon receiving an SOS alert, immediately tap "Call Sevak" to confirm nature of incident. If medical help is required, coordinate with the nearest Jain hospital.
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineCard}>
                <Text style={styles.guideNumber}>2</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>Route Deviations Beyond 50m</Text>
                  <Text style={styles.guideText}>
                    Deviations alert administrators if the Sevak group moves 50m outside the planned corridor for more than 2 minutes.
                  </Text>
                </View>
              </View>

              <View style={styles.helplineBox}>
                <Text style={styles.helplineTitle}>Surat Vihar Emergency Central Desk</Text>
                <TouchableOpacity
                  style={styles.callNowBtn}
                  onPress={() => Linking.openURL('tel:+919876500000')}
                >
                  <PhoneIcon size={18} color="#FFFFFF" />
                  <Text style={styles.callNowText}>Call Central Helpdesk (+91 98765 00000)</Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton
                title="Close"
                onPress={() => setActiveModal(null)}
                variant="saffron"
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ABOUT MODAL */}
      <Modal
        visible={activeModal === 'ABOUT'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.aboutDialog, shadows.elevated]}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
            <Text style={styles.aboutName}>જિનાર્ય વિહાર સેતુ (Vihar Setu)</Text>
            <Text style={styles.aboutTagline}>by Jinaarya Vihar Seva Group, Surat</Text>
            <Text style={styles.aboutDesc}>
              A dedicated digital safety & tracking ecosystem for Pujya Sadhviji Bhagwant Vihar Seva across Gujarat.
            </Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 (Production Build)</Text>
            <Text style={styles.aboutCredits}>Developers: Yugam Kothari & Jainish Patel</Text>
            <PrimaryButton
              title="Close"
              onPress={() => setActiveModal(null)}
              variant="saffron"
              style={{ width: '100%', marginTop: spacing.md }}
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  avatarGlowRing: {
    padding: 3,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.xs,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginTop: 2,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warmIvory,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  menuSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  menuArrow: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: spacing.sm,
  },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(189, 44, 44, 0.2)',
    marginBottom: spacing.xl,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.statusEmergency,
    fontWeight: '700',
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalLoading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  modalScroll: {
    paddingBottom: spacing.xxl,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  analyticBox: {
    width: '48%',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  analyticNum: {
    ...typography.h2,
    color: colors.deepMaroon,
  },
  analyticLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reportSubtitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
    marginBottom: spacing.xs,
  },
  reportSummaryCard: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reportLine: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginVertical: 3,
  },
  bold: {
    fontWeight: '700',
  },
  searchBar: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  searchInput: {
    paddingVertical: 8,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  emptyBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  userDirItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.xs,
  },
  userDirAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  userDirInfo: {
    flex: 1,
  },
  userDirName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  userDirSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  phoneActionBtn: {
    padding: spacing.xs,
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  activePill: {
    backgroundColor: '#D4EDDA',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#155724',
  },
  pendingPill: {
    backgroundColor: '#FFF3CD',
  },
  pendingPillText: {
    color: '#856404',
  },
  logItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  logTypeTag: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
  },
  logTypeEmergency: {
    backgroundColor: '#FFEBEE',
    color: colors.statusEmergency,
  },
  logTypeSafe: {
    backgroundColor: '#E8F5E9',
    color: colors.statusSafe,
  },
  logTitleText: {
    ...typography.bodySmall,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: 2,
  },
  logEvent: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  settingSectionLabel: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  thresholdChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  thresholdChipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  thresholdChipText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  thresholdChipTextActive: {
    color: colors.warmIvory,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  switchSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  securityBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  securityTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  securityDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  guidelineCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  guideNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.saffron,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 12,
  },
  guideTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    marginBottom: 2,
  },
  guideText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  helplineBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: spacing.sm,
  },
  helplineTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  callNowBtn: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  callNowText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '700',
  },
  aboutDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.xs,
  },
  aboutName: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
  },
  aboutTagline: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  aboutDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  aboutVersion: {
    ...typography.caption,
    color: colors.textMuted,
  },
  aboutCredits: {
    fontSize: 11,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: 4,
  },
});
