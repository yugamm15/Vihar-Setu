import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { t } from '../../../core/localization/i18n';
import { superAdminAdministratorService } from '../services/superAdminAdministratorService';

const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || '—'}</Text></View>
);

export const SuperAdminAdministratorDetailsScreen = ({ route, navigation }) => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const administratorId = route?.params?.administratorId;

  const loadDetails = useCallback(async () => {
    setIsLoading(true);
    const response = await superAdminAdministratorService.getAdministratorDetails(administratorId);
    setResult(response);
    setError(response.error?.message || null);
    setIsLoading(false);
  }, [administratorId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  const updateAdministrator = (changes, label) => {
    Alert.alert(t('super_admin.management.confirm_title'), `${label}?`, [
      { text: t('super_admin.management.cancel'), style: 'cancel' },
      { text: t('super_admin.management.confirm'), onPress: async () => {
        setActionLoading(true);
        const response = await superAdminAdministratorService.updateAdministrator(administratorId, changes);
        setActionLoading(false);
        if (response.error) return Alert.alert(t('super_admin.management.error_title'), response.error.message);
        await loadDetails();
        Alert.alert(t('super_admin.management.success_title'), t('super_admin.management.saved'));
      } },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.administrator_details.title')} showBack onBack={() => navigation.goBack()} />
      {isLoading ? (
        <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View>
      ) : error ? (
        <View style={styles.state}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.name}>{result.data.administrator.full_name || t('super_admin.administrators.unnamed')}</Text>
            <DetailRow label={t('super_admin.administrator_details.mobile')} value={result.data.administrator.phone} />
            <DetailRow label={t('super_admin.administrator_details.email')} value={result.data.administrator.email} />
            <DetailRow label={t('super_admin.administrator_details.status')} value={result.data.administrator.status} />
            <DetailRow label={t('super_admin.administrator_details.city')} value={result.data.administrator.city} />
            <DetailRow label={t('super_admin.administrator_details.area')} value={result.data.administrator.area} />
            <DetailRow label={t('super_admin.administrator_details.assignment')} value={result.data.administrator.assignedArea?.name} />
            <DetailRow label={t('super_admin.administrator_details.registered')} value={formatDate(result.data.administrator.created_at)} />
            <DetailRow label={t('super_admin.administrator_details.updated')} value={formatDate(result.data.administrator.updated_at)} />
          </View>

          <TouchableOpacity disabled={actionLoading} style={styles.action} onPress={() => updateAdministrator({ isActive: !result.data.administrator.isActive }, result.data.administrator.isActive ? t('super_admin.user_details.actions.disable') : t('super_admin.user_details.actions.reactivate'))}>
            <Text style={styles.actionText}>{result.data.administrator.isActive ? t('super_admin.user_details.actions.disable') : t('super_admin.user_details.actions.reactivate')}</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('super_admin.administrator_details.permissions')}</Text>
            {result.data.permissions.length ? result.data.permissions.map((permission) => (
              <TouchableOpacity key={permission.id} style={styles.permissionRow} onPress={() => updateAdministrator({ permissions: { ...result.data.administrator.permissionsSummary, [permission.permission_key]: !permission.is_granted } }, permission.permission_key)}>
                <Text style={styles.permissionKey}>{permission.permission_key}</Text>
                <Text style={[styles.permissionValue, { color: permission.is_granted ? colors.statusSafe : colors.statusEmergency }]}>
                  {permission.is_granted ? t('super_admin.administrator_details.granted') : t('super_admin.administrator_details.not_granted')}
                </Text>
              </TouchableOpacity>
            )) : <Text style={styles.empty}>{t('super_admin.administrator_details.no_permissions')}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('super_admin.administrator_details.audit')}</Text>
            {result.data.auditHistory.length ? result.data.auditHistory.map((record) => (
              <View key={record.id} style={styles.auditRow}>
                <Text style={styles.auditAction}>{record.action || t('super_admin.administrator_details.audit_record')}</Text>
                <Text style={styles.auditEntity}>{record.entity || '—'}</Text>
                <Text style={styles.auditDate}>{formatDate(record.created_at)}</Text>
              </View>
            )) : <Text style={styles.empty}>{t('super_admin.administrator_details.no_audit')}</Text>}
          </View>

          {result.errors?.length ? <Text style={styles.partial}>{t('super_admin.administrator_details.partial_data')}</Text> : null}
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
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg },
  name: { ...typography.h3, color: colors.deepMaroon, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  detailLabel: { ...typography.caption, color: colors.textSecondary, width: '38%' },
  detailValue: { ...typography.caption, color: colors.textPrimary, flex: 1, fontWeight: '700' },
  action: { borderWidth: 1, borderColor: colors.deepMaroon, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.md, backgroundColor: colors.cardBackground },
  actionText: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800', textAlign: 'center' },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  permissionRow: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.xs, flexDirection: 'row', justifyContent: 'space-between' },
  permissionKey: { ...typography.bodySmall, color: colors.textPrimary },
  permissionValue: { ...typography.caption, fontWeight: '800' },
  auditRow: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.xs },
  auditAction: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  auditEntity: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  auditDate: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  empty: { ...typography.caption, color: colors.textSecondary },
  partial: { ...typography.caption, color: colors.saffronDark, marginTop: spacing.md },
});
