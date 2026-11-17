import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminAuditService } from '../services/SuperAdminAuditService';

const Entries = ({ title, values }) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{Object.keys(values || {}).length ? Object.entries(values).map(([key, count]) => <View style={styles.row} key={key}><Text style={styles.rowLabel}>{key}</Text><Text style={styles.rowValue}>{count}</Text></View>) : <Text style={styles.empty}>{t('super_admin.audit.no_distribution')}</Text>}</View>;

export const SuperAdminSecurityOverviewScreen = () => {
  const [result, setResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setResult(await superAdminAuditService.getSecurityOverview());
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const data = result?.data;
  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.audit.security_title')} subtitle={t('super_admin.audit.security_subtitle')} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
        {!result ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : result.error ? <Text style={styles.error}>{t('super_admin.audit.load_error')}</Text> : (
          <>
            <View style={styles.grid}><Metric label={t('super_admin.audit.total_records')} value={data.totalRecords} /><Metric label={t('super_admin.audit.failed_operations')} value={data.failedOperations} /><Metric label={t('super_admin.audit.security_events')} value={data.securityEvents} /></View>
            <Text style={styles.sample}>{t('super_admin.audit.distribution_sample', { count: data.sampleSize })}</Text>
            <Entries title={t('super_admin.audit.action_distribution')} values={data.actionDistribution} />
            <Entries title={t('super_admin.audit.entity_distribution')} values={data.entityDistribution} />
            <Text style={styles.sectionTitle}>{t('super_admin.audit.recent_security_events')}</Text>
            {data.recentSecurityEvents.length ? data.recentSecurityEvents.map((record) => <View style={styles.event} key={record.id}><Text style={styles.rowLabel}>{record.action}</Text><Text style={styles.empty}>{record.created_at ? new Date(record.created_at).toLocaleString('en-IN') : '—'}</Text></View>) : <Text style={styles.empty}>{t('super_admin.audit.no_security_events')}</Text>}
            <Text style={styles.notice}>{t('super_admin.audit.coverage_notice')}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const Metric = ({ label, value }) => <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.empty}>{label}</Text></View>;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl }, state: { padding: spacing.xxxl, alignItems: 'center' }, error: { ...typography.bodySmall, color: colors.statusEmergency }, grid: { flexDirection: 'row', justifyContent: 'space-between' }, metric: { width: '31%', backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm }, metricValue: { ...typography.h3, color: colors.deepMaroon }, section: { marginTop: spacing.lg }, sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, padding: spacing.sm }, rowLabel: { ...typography.caption, color: colors.textPrimary, flex: 1 }, rowValue: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800' }, event: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.xs }, empty: { ...typography.caption, color: colors.textSecondary }, sample: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md }, notice: { ...typography.caption, color: colors.saffronDark, backgroundColor: colors.statusWarningBg, padding: spacing.md, borderRadius: borderRadius.sm, marginTop: spacing.lg },
});
