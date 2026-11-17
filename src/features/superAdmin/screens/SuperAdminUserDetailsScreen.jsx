import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { t } from '../../../core/localization/i18n';
import { superAdminUserService } from '../services/superAdminUserService';

const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || '—'}</Text></View>
);

const ActivitySection = ({ title, records, emptyLabel }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {records?.length ? records.map((record) => (
      <View key={record.id} style={styles.activity}>
        <Text style={styles.activityTitle}>{record.action || record.reason || record.status || record.role || title}</Text>
        <Text style={styles.activityDetail}>{record.location_name || record.handover_location_name || record.trigger_type || record.entity || ''}</Text>
        <Text style={styles.activityDate}>{formatDate(record.created_at || record.handover_time || record.triggered_at || record.hold_start || record.joined_at)}</Text>
      </View>
    )) : <Text style={styles.empty}>{emptyLabel}</Text>}
  </View>
);

export const SuperAdminUserDetailsScreen = ({ route, navigation }) => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const userId = route?.params?.userId;

  const loadDetails = useCallback(async () => {
    setIsLoading(true);
    const response = await superAdminUserService.getUserDetails(userId);
    setResult(response);
    setError(response.error?.message || null);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  const runAction = (label, action) => {
    Alert.alert(t('super_admin.management.confirm_title'), `${label}?`, [
      { text: t('super_admin.management.cancel'), style: 'cancel' },
      {
        text: t('super_admin.management.confirm'),
        onPress: async () => {
          setActionLoading(true);
          const response = await action();
          setActionLoading(false);
          if (response.error) {
            Alert.alert(t('super_admin.management.error_title'), response.error.message);
            return;
          }
          await loadDetails();
          Alert.alert(t('super_admin.management.success_title'), t('super_admin.management.saved'));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.user_details.title')} showBack onBack={() => navigation.goBack()} />
      {isLoading ? (
        <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View>
      ) : error ? (
        <View style={styles.state}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileCard}>
            <Text style={styles.name}>{result.data.profile.full_name || t('super_admin.users.unnamed')}</Text>
            <DetailRow label={t('super_admin.user_details.mobile')} value={result.data.profile.phone} />
            <DetailRow label={t('super_admin.user_details.email')} value={result.data.profile.email} />
            <DetailRow label={t('super_admin.user_details.role')} value={result.data.profile.role} />
            <DetailRow label={t('super_admin.user_details.status')} value={result.data.profile.status} />
            {result.data.profile.status === 'REJECTED' && result.data.profile.rejection_reason ? (
              <DetailRow label="Rejection reason" value={result.data.profile.rejection_reason} />
            ) : null}
            <DetailRow label={t('super_admin.user_details.city')} value={result.data.profile.city} />
            <DetailRow label={t('super_admin.user_details.area')} value={result.data.profile.area} />
            <DetailRow label={t('super_admin.user_details.registered')} value={formatDate(result.data.profile.created_at)} />
            <DetailRow label={t('super_admin.user_details.updated')} value={formatDate(result.data.profile.updated_at)} />
          </View>
          <View style={styles.actionRow}>
            {result.data.profile.status === 'PENDING' ? (
              <>
                <TouchableOpacity disabled={actionLoading} style={styles.action} onPress={() => runAction(t('super_admin.user_details.actions.activate'), () => superAdminUserService.approveUser(userId))}>
                  <Text style={styles.actionText}>{t('super_admin.user_details.actions.activate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={actionLoading} style={[styles.action, styles.rejectAction]} onPress={() => runAction('Reject user', () => superAdminUserService.rejectUser(userId, 'Application rejected by Super Administrator'))}>
                  <Text style={[styles.actionText, styles.rejectActionText]}>Reject</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {result.data.profile.status === 'ACTIVE' ? (
              <TouchableOpacity disabled={actionLoading} style={styles.action} onPress={() => runAction(t('super_admin.user_details.actions.disable'), () => superAdminUserService.setUserStatus(userId, 'DISABLED'))}>
                <Text style={styles.actionText}>{t('super_admin.user_details.actions.disable')}</Text>
              </TouchableOpacity>
            ) : null}
            {result.data.profile.status === 'DISABLED' ? (
              <TouchableOpacity disabled={actionLoading} style={styles.action} onPress={() => runAction(t('super_admin.user_details.actions.reactivate'), () => superAdminUserService.setUserStatus(userId, 'ACTIVE'))}>
                <Text style={styles.actionText}>{t('super_admin.user_details.actions.reactivate')}</Text>
              </TouchableOpacity>
            ) : null}
            {result.data.profile.status === 'REJECTED' ? (
              <TouchableOpacity disabled={actionLoading} style={[styles.action, styles.reinstateAction]} onPress={() => runAction('Reinstate and activate user', () => superAdminUserService.reinstateUser(userId))}>
                <Text style={styles.actionText}>Reinstate Account</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {result.errors?.length ? <Text style={styles.partial}>{t('super_admin.user_details.partial_history')}</Text> : null}
          <ActivitySection title={t('super_admin.user_details.vihars')} records={result.data.activity.vihars} emptyLabel={t('super_admin.user_details.no_history')} />
          <ActivitySection title={t('super_admin.user_details.sub_vihars')} records={result.data.activity.subVihars} emptyLabel={t('super_admin.user_details.no_history')} />
          <ActivitySection title={t('super_admin.user_details.holds')} records={result.data.activity.holds} emptyLabel={t('super_admin.user_details.no_history')} />
          <ActivitySection title={t('super_admin.user_details.handovers')} records={result.data.activity.handovers} emptyLabel={t('super_admin.user_details.no_history')} />
          <ActivitySection title={t('super_admin.user_details.emergencies')} records={result.data.activity.emergencies} emptyLabel={t('super_admin.user_details.no_history')} />
          <ActivitySection title={t('super_admin.user_details.audit_logs')} records={result.data.activity.auditLogs} emptyLabel={t('super_admin.user_details.no_history')} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  error: { ...typography.body, color: colors.statusEmergency, textAlign: 'center' },
  profileCard: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg },
  name: { ...typography.h3, color: colors.deepMaroon, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  detailLabel: { ...typography.caption, color: colors.textSecondary, width: '38%' },
  detailValue: { ...typography.caption, color: colors.textPrimary, flex: 1, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { borderWidth: 1, borderColor: colors.deepMaroon, borderRadius: borderRadius.sm, padding: spacing.sm, flex: 1, backgroundColor: colors.cardBackground },
  actionText: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800', textAlign: 'center' },
  rejectAction: { borderColor: '#B3261E', backgroundColor: '#FFF5F5' },
  rejectActionText: { color: '#B3261E' },
  reinstateAction: { borderColor: colors.statusSafe, backgroundColor: '#F0FDF4' },
  partial: { ...typography.caption, color: colors.saffronDark, marginTop: spacing.md },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  activity: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.xs },
  activityTitle: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  activityDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  activityDate: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  empty: { ...typography.caption, color: colors.textSecondary },
});
