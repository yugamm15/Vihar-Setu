import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminAuditService } from '../services/SuperAdminAuditService';

export const SuperAdminAuditLogDetailsScreen = ({ route, navigation }) => {
  const [result, setResult] = useState(null);
  const load = useCallback(async () => setResult(await superAdminAuditService.getAuditLogDetails(route?.params?.auditLogId)), [route?.params?.auditLogId]);
  useEffect(() => { load(); }, [load]);
  const record = result?.data;
  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.audit.details_title')} showBack onBack={() => navigation.goBack()} />
      {!result ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : result.error ? <Text style={styles.error}>{t('super_admin.audit.load_error')}</Text> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Field label={t('super_admin.audit.record_id')} value={record.id} />
            <Field label={t('super_admin.audit.actor')} value={record.actor_id || '—'} />
            <Field label={t('super_admin.audit.action')} value={record.action} />
            <Field label={t('super_admin.audit.entity')} value={record.entity || '—'} />
            <Field label={t('super_admin.audit.entity_id')} value={record.entity_id || '—'} />
            <Field label={t('super_admin.audit.timestamp')} value={record.created_at ? new Date(record.created_at).toLocaleString('en-IN') : '—'} />
            <Text style={styles.label}>{t('super_admin.audit.details')}</Text>
            <Text style={styles.details}>{record.safeDetails}</Text>
            <Text style={styles.notice}>{t('super_admin.audit.redaction_notice')}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const Field = ({ label, value }) => <View style={styles.field}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl }, state: { flex: 1, justifyContent: 'center', alignItems: 'center' }, error: { ...typography.bodySmall, color: colors.statusEmergency, padding: spacing.lg }, card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg }, field: { marginBottom: spacing.sm }, label: { ...typography.caption, color: colors.textSecondary, fontWeight: '800' }, value: { ...typography.bodySmall, color: colors.textPrimary, marginTop: 2 }, details: { ...typography.caption, color: colors.textPrimary, backgroundColor: colors.inputBg, padding: spacing.md, marginTop: spacing.xs, fontFamily: 'monospace' }, notice: { ...typography.caption, color: colors.saffronDark, backgroundColor: colors.statusWarningBg, padding: spacing.md, borderRadius: borderRadius.sm, marginTop: spacing.md },
});
