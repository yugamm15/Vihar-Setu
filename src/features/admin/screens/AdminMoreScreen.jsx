import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
  Alert,
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
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { ROLES } from '../../../core/constants/roles';
import { t } from '../../../core/localization/i18n';

export const AdminMoreScreen = () => {
  const { user, profile, role, logout } = useAuthStore();
  const [activeModal, setActiveModal] = useState(null); // 'REPORTS' | 'USERS' | 'LOGS' | 'LOGOUT' | 'SETTINGS' | 'HELP' | 'ABOUT'

  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const handleLogout = async () => {
    setActiveModal(null);
    await logout();
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
            onPress={() => setActiveModal('REPORTS')}
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
            onPress={() => setActiveModal('USERS')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <UsersGroupIcon size={20} color={colors.statusSafe} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Users & Sevaks Directory</Text>
              <Text style={styles.menuSub}>Manage verified Sevaks and admin accounts</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => setActiveModal('LOGS')}
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
            onPress={() => setActiveModal('SETTINGS')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <SettingsGearIcon size={20} color="#1976D2" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Settings & Alert Thresholds</Text>
              <Text style={styles.menuSub}>Route deviation limits, notification sounds</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => setActiveModal('SECURITY')}
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
            onPress={() => setActiveModal('HELP')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FBE9E7' }]}>
              <Text style={{ fontSize: 16 }}>❓</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help & Support Guidelines</Text>
              <Text style={styles.menuSub}>Admin hotline & emergency response manual</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => setActiveModal('ABOUT')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.softCream }]}>
              <Text style={{ fontSize: 16 }}>ℹ️</Text>
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
          onPress={() => setActiveModal('LOGOUT')}
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
              <Text style={styles.modalTitle}>📊 Reports & Analytics</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticBox}>
                  <Text style={styles.analyticNum}>42</Text>
                  <Text style={styles.analyticLabel}>Vihars Completed</Text>
                </View>
                <View style={styles.analyticBox}>
                  <Text style={styles.analyticNum}>18</Text>
                  <Text style={styles.analyticLabel}>Active Sevaks</Text>
                </View>
                <View style={styles.analyticBox}>
                  <Text style={styles.analyticNum}>100%</Text>
                  <Text style={styles.analyticLabel}>Safety Rate</Text>
                </View>
                <View style={styles.analyticBox}>
                  <Text style={styles.analyticNum}>1.8 min</Text>
                  <Text style={styles.analyticLabel}>Avg SOS Response</Text>
                </View>
              </View>

              <Text style={styles.reportSubtitle}>Weekly Summary (Surat Region)</Text>
              <View style={styles.reportSummaryCard}>
                <Text style={styles.reportLine}>• Total Distance Monitored: <Text style={styles.bold}>186.4 km</Text></Text>
                <Text style={styles.reportLine}>• Safe Vihars Concluded: <Text style={styles.bold}>14 routes</Text></Text>
                <Text style={styles.reportLine}>• Deviations Corrected: <Text style={styles.bold}>2 instances</Text></Text>
                <Text style={styles.reportLine}>• Zero Untoward Incidents Reported</Text>
              </View>
            </ScrollView>
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
              <Text style={styles.modalTitle}>👥 Verified Users Directory</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.userDirItem}>
                <View style={styles.userDirAvatar}>
                  <UserIcon size={20} color={colors.warmIvory} />
                </View>
                <View style={styles.userDirInfo}>
                  <Text style={styles.userDirName}>Hetaben Mehta</Text>
                  <Text style={styles.userDirSub}>📍 Adajan, Surat • B+ • Sevika</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.userDirItem}>
                <View style={styles.userDirAvatar}>
                  <UserIcon size={20} color={colors.warmIvory} />
                </View>
                <View style={styles.userDirInfo}>
                  <Text style={styles.userDirName}>Rekhaben Shah</Text>
                  <Text style={styles.userDirSub}>📍 Pal, Surat • B+ • Lead Sevika</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.userDirItem}>
                <View style={styles.userDirAvatar}>
                  <UserIcon size={20} color={colors.warmIvory} />
                </View>
                <View style={styles.userDirInfo}>
                  <Text style={styles.userDirName}>Pravinbhai Shah</Text>
                  <Text style={styles.userDirSub}>📍 Athwa Lines, Surat • O+ • Sevak</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              </View>
            </ScrollView>
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
              <Text style={styles.modalTitle}>📜 Activity & Audit Logs</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.logItem}>
                <Text style={styles.logTime}>Today, 02:15 AM</Text>
                <Text style={styles.logEvent}>
                  ✅ Sevak Approved: Account activated for new volunteer.
                </Text>
              </View>
              <View style={styles.logItem}>
                <Text style={styles.logTime}>Yesterday, 06:45 PM</Text>
                <Text style={styles.logEvent}>
                  🚶 Vihar Concluded: Athwa Lines ➔ Nanpura completed safely.
                </Text>
              </View>
              <View style={styles.logItem}>
                <Text style={styles.logTime}>Yesterday, 07:15 AM</Text>
                <Text style={styles.logEvent}>
                  🚨 SOS Acknowledged & Resolved in 1.4 minutes.
                </Text>
              </View>
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
            <Text style={styles.aboutName}>Vihar Setu</Text>
            <Text style={styles.aboutTagline}>by Jinaarya Vihar Seva</Text>
            <Text style={styles.aboutDesc}>
              A dedicated digital safety & tracking ecosystem for Pujya Sadhviji Bhagwant Vihar Seva across Gujarat.
            </Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 (Production Build)</Text>
            <PrimaryButton
              title="Close"
              onPress={() => setActiveModal(null)}
              variant="saffron"
              style={{ width: '100%', marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={activeModal === 'LOGOUT'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.logoutDialog, shadows.elevated]}>
            <Text style={styles.logoutTitle}>Logout of Super Admin Console?</Text>
            <Text style={styles.logoutSub}>
              Are you sure you want to exit your Super Admin session?
            </Text>

            <View style={styles.logoutBtnRow}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setActiveModal(null)}
                style={styles.logoutBtnHalf}
              />
              <PrimaryButton
                title="Yes, Logout"
                onPress={handleLogout}
                variant="primary"
                style={styles.logoutBtnHalf}
              />
            </View>
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
  closeBtnText: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '700',
    padding: spacing.xs,
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
  userDirItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  userDirAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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
  logItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  logTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  logEvent: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginTop: 2,
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
  },
  aboutTagline: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '700',
    marginBottom: spacing.sm,
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
  logoutDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  logoutTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  logoutSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  logoutBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  logoutBtnHalf: {
    flex: 1,
  },
});
