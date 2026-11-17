import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminMonitoringService } from '../services/SuperAdminMonitoringService';

const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';

export const SuperAdminSystemHealthScreen = ({ navigation }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setResult(await superAdminMonitoringService.fetchSystemHealth());
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const data = result?.data || {};
  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.monitoring.system_health')} subtitle={t('super_admin.monitoring.health_subtitle')} showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
        {result?.errors?.length ? <View style={styles.notice}><Text style={styles.noticeText}>{t('super_admin.monitoring.partial_data')}</Text></View> : null}
        {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : (
          <>
            <Text style={styles.sectionTitle}>{t('super_admin.monitoring.available_settings')}</Text>
            {data.systemSettings?.length ? data.systemSettings.map((item) => <View style={styles.card} key={item.key}><Text style={styles.key}>{item.key}</Text><Text style={styles.value}>{String(item.value)}</Text><Text style={styles.detail}>{item.description || '—'} · {date(item.updated_at)}</Text></View>) : <Text style={styles.empty}>{t('super_admin.monitoring.no_settings')}</Text>}
            <Text style={styles.sectionTitle}>{t('super_admin.monitoring.unavailable_health')}</Text>
            {(result?.unavailable || []).map((item) => <View style={styles.card} key={item}><Text style={styles.key}>{item}</Text><Text style={styles.detail}>{t('super_admin.monitoring.not_monitored')}</Text></View>)}
            <Text style={styles.sectionTitle}>{t('super_admin.monitoring.recent_activity')}</Text>
            {data.auditActivity?.length ? data.auditActivity.map((item) => <View style={styles.card} key={item.id}><Text style={styles.key}>{item.action}</Text><Text style={styles.detail}>{item.entity || '—'} · {date(item.created_at)}</Text></View>) : <Text style={styles.empty}>{t('super_admin.monitoring.no_activity')}</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginTop: spacing.md, marginBottom: spacing.sm },
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.xs },
  key: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  value: { ...typography.bodySmall, color: colors.textPrimary, marginTop: spacing.xs },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  empty: { ...typography.caption, color: colors.textSecondary },
  state: { padding: spacing.xxxl, alignItems: 'center' },
  notice: { backgroundColor: colors.statusWarningBg, borderRadius: borderRadius.md, padding: spacing.md },
  noticeText: { ...typography.caption, color: colors.saffronDark },
});
