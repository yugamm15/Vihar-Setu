import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { ShieldIcon, LogoutIcon } from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../hooks/useAuthStore';

export const AccountDisabledScreen = ({ status = 'DISABLED' }) => {
  const { profile, checkStatus, logout } = useAuthStore();
  const [checking, setChecking] = useState(false);

  const isRejected = status === 'REJECTED';

  const handleCheckAgain = async () => {
    setChecking(true);
    const freshStatus = await checkStatus();
    setChecking(false);

    if (freshStatus === 'ACTIVE') {
      Alert.alert(
        'Account Re-activated',
        'Your account has been reactivated. You may now proceed into the application.'
      );
    } else {
      Alert.alert(
        'Account Status',
        `Your account status is currently ${freshStatus}. Please contact your regional administrator.`
      );
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Jinaarya Vihar Setu"
        subtitle="Account Access Notification"
        showLogo
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, shadows.md]}>
          <View style={styles.iconContainer}>
            <ShieldIcon size={44} color={isRejected ? colors.secondary : colors.statusEmergency} />
          </View>

          <Text style={styles.title}>
            {isRejected ? 'Registration Not Approved' : 'Account Access Suspended'}
          </Text>

          <Text style={styles.description}>
            {isRejected
              ? 'Your volunteer registration could not be approved at this time. If you feel this was a mistake, please speak with your regional safety administrator or submit a new inquiry.'
              : 'Your account access has been suspended by a platform administrator in accordance with Vihar safety and administrative guidelines.'}
          </Text>

          {profile && (
            <View style={styles.profileBox}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Registered Name:</Text>
                <Text style={styles.rowValue}>{profile.full_name || 'Volunteer'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Mobile Number:</Text>
                <Text style={styles.rowValue}>{profile.phone || '—'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Regional Area:</Text>
                <Text style={styles.rowValue}>{profile.area || profile.city || 'Surat'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Status Code:</Text>
                <Text style={[styles.rowValue, styles.statusBadge]}>{status}</Text>
              </View>
            </View>
          )}

          <View style={styles.actionsBox}>
            <TouchableOpacity
              style={styles.checkBtn}
              onPress={handleCheckAgain}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.checkBtnText}>Check Status Again</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogoutIcon size={18} color={colors.deepMaroon} />
              <Text style={styles.logoutBtnText}>Log Out & Return to Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Jinaarya Vihar Setu operates strictly under authorized Jain Sangh protocols. All status transitions are recorded immutably in the central security audit log.
          </Text>
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
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '85%',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.deepMaroon,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  profileBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rowValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statusBadge: {
    color: colors.statusEmergency,
    textTransform: 'uppercase',
  },
  actionsBox: {
    width: '100%',
    gap: spacing.sm,
  },
  checkBtn: {
    backgroundColor: colors.deepMaroon,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
  },
  logoutBtnText: {
    ...typography.button,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  footerNote: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  footerNoteText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
