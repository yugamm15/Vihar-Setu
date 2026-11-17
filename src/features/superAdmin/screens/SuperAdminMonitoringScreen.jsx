import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminMonitoringService } from '../services/SuperAdminMonitoringService';

const value = (item) => item === null || item === undefined ? '—' : String(item);
const formatDate = (date) => date ? new Date(date).toLocaleString('en-IN') : '—';

export const SuperAdminMonitoringScreen = ({ navigation }) => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setResult(await superAdminMonitoringService.fetchOverview());
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const data = result?.data || {};

  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.monitoring.title')} subtitle={t('super_admin.monitoring.subtitle')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}
      >
        {result?.errors?.length ? <Notice text={t('super_admin.monitoring.partial_data')} /> : null}
        {isLoading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : (
          <>
            <View style={styles.grid}>
              <Metric label={t('super_admin.monitoring.registered_users')} value={value(data.registeredUsers)} />
              <Metric label={t('super_admin.monitoring.active_vihars')} value={value(data.activeVihars)} />
              <Metric label={t('super_admin.monitoring.active_sub_vihars')} value={value(data.activeSubVihars)} />
              <Metric label={t('super_admin.monitoring.active_emergencies')} value={value(data.activeEmergencies)} danger />
              <Metric label={t('super_admin.monitoring.active_holds')} value={value(data.activeHolds)} />
              <Metric label={t('super_admin.monitoring.devices_reported')} value={value(data.deviceStatuses?.length)} />
            </View>
            <View style={styles.actions}>
              <Action text={t('super_admin.monitoring.emergencies')} onPress={() => navigation.navigate('SuperAdminEmergencyMonitoring')} />
              <Action text={t('super_admin.monitoring.devices')} onPress={() => navigation.navigate('SuperAdminDeviceMonitoring')} />
            </View>
            <Section title={t('super_admin.monitoring.route_events')}>
              <Records records={data.recentRouteEvents} empty={t('super_admin.monitoring.no_route_events')} render={(item) => `${item.event_type} · ${item.severity} · ${formatDate(item.created_at)}`} />
            </Section>
            <Section title={t('super_admin.monitoring.handovers')}>
              <Records records={data.recentHandovers} empty={t('super_admin.monitoring.no_handovers')} render={(item) => `${item.status} · ${item.handover_location_name || '—'} · ${formatDate(item.handover_time)}`} />
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const Metric = ({ label, value: metricValue, danger }) => <View style={styles.metric}><Text style={styles.metricValue}>{metricValue}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
const Action = ({ text, onPress }) => <TouchableOpacity style={styles.action} onPress={onPress}><Text style={styles.actionText}>{text}</Text></TouchableOpacity>;
const Notice = ({ text }) => <View style={styles.notice}><Text style={styles.noticeText}>{text}</Text></View>;
const Section = ({ title, children }) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
const Records = ({ records, empty, render }) => records?.length ? records.map((item) => <View key={item.id} style={styles.record}><Text style={styles.recordText}>{render(item)}</Text></View>) : <Text style={styles.empty}>{empty}</Text>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metric: { width: '48%', backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  metricValue: { ...typography.h3, color: colors.deepMaroon },
  metricLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { marginVertical: spacing.md },
  action: { backgroundColor: colors.deepMaroon, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  actionText: { ...typography.bodySmall, color: colors.warmIvory, fontWeight: '700', textAlign: 'center' },
  section: { marginTop: spacing.md },
  sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  record: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.xs },
  recordText: { ...typography.caption, color: colors.textPrimary },
  empty: { ...typography.caption, color: colors.textSecondary },
  notice: { backgroundColor: colors.statusWarningBg, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  noticeText: { ...typography.caption, color: colors.saffronDark },
  state: { padding: spacing.xxxl, alignItems: 'center' },
});
