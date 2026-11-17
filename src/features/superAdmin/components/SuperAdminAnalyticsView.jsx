import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminReportsService } from '../services/SuperAdminReportsService';
import { superAdminExportService } from '../services/superAdminExportService';
import { SuperAdminReportBars, SuperAdminReportTrend, SuperAdminDistributionDonut } from './SuperAdminReportCharts';

const Card = ({ title, children }) => <View style={[styles.card, shadows.card]}><Text style={styles.cardTitle}>{title}</Text>{children}</View>;

const sectionContent = (type, reports) => {
  const empty = t('super_admin.reports.unavailable');
  if (type === 'users') return <>
    <Card title={t('super_admin.reports.registration_trend')}><SuperAdminReportTrend series={reports.users?.registrationTrend} empty={empty} /></Card>
    <Card title={t('super_admin.reports.role_distribution')}><SuperAdminDistributionDonut series={Object.entries(reports.users?.roleDistribution || {}).map(([label, value]) => ({ label, value }))} empty={empty} /></Card>
    <Card title={t('super_admin.reports.status_distribution')}><SuperAdminReportBars series={Object.entries(reports.users?.statusDistribution || {}).map(([label, value]) => ({ label, value }))} empty={empty} /></Card>
    <Card title={t('super_admin.reports.city_distribution')}><SuperAdminReportBars series={reports.users?.cityDistribution} empty={empty} barColor={colors.gold} /></Card>
    <Card title={t('super_admin.reports.area_distribution')}><SuperAdminReportBars series={reports.users?.areaDistribution} empty={empty} barColor={colors.saffron} /></Card>
  </>;
  if (type === 'vihars') return <>
    <Card title={t('super_admin.reports.vihar_status')}><SuperAdminDistributionDonut series={reports.vihars?.viharStatus} empty={empty} /></Card>
    <Card title={t('super_admin.reports.sub_vihar_status')}><SuperAdminReportBars series={reports.vihars?.subViharStatus} empty={empty} barColor={colors.saffron} /></Card>
    <Card title={t('super_admin.reports.participation_trend')}><SuperAdminReportTrend series={reports.vihars?.participationTrend} empty={empty} /></Card>
    <Card title={t('super_admin.reports.handovers')}><SuperAdminReportBars series={reports.vihars?.handovers} empty={empty} barColor={colors.gold} /></Card>
    <Card title={t('super_admin.reports.holds')}><SuperAdminReportBars series={reports.vihars?.holds} empty={empty} barColor={colors.deepMaroon} /></Card>
  </>;
  if (type === 'safety') return <>
    <Card title={t('super_admin.reports.emergency_frequency')}><SuperAdminReportTrend series={reports.safety?.emergencyTrend} empty={empty} accent={colors.statusEmergency} /></Card>
    <Card title={t('super_admin.reports.emergency_status')}><SuperAdminDistributionDonut series={reports.safety?.emergencyStatus} empty={empty} /></Card>
    <Card title={t('super_admin.reports.emergency_triggers')}><SuperAdminReportBars series={reports.safety?.emergencyTriggers} empty={empty} barColor={colors.statusEmergency} /></Card>
    <Card title={t('super_admin.reports.escalation_attempts')}><SuperAdminReportBars series={reports.safety?.escalationAttempts} empty={empty} barColor={colors.saffron} /></Card>
    <Card title={t('super_admin.reports.route_events')}><SuperAdminReportBars series={reports.safety?.routeEvents} empty={empty} barColor={colors.deepMaroon} /></Card>
    <Card title={t('super_admin.reports.route_severity')}><SuperAdminDistributionDonut series={reports.safety?.routeSeverity} empty={empty} /></Card>
  </>;
  return <>
    <Card title={t('super_admin.reports.network_status')}><SuperAdminDistributionDonut series={reports.devices?.networkStatus} empty={empty} /></Card>
    <Card title={t('super_admin.reports.battery_distribution')}><SuperAdminReportBars series={reports.devices?.batteryDistribution} empty={empty} barColor={colors.gold} /></Card>
    <Card title={t('super_admin.reports.gps_availability')}><SuperAdminReportBars series={reports.devices?.gpsAvailability} empty={empty} barColor={colors.statusSafe} /></Card>
    <Card title={t('super_admin.reports.app_state')}><SuperAdminReportBars series={reports.devices?.appState} empty={empty} barColor={colors.saffron} /></Card>
    <Card title={t('super_admin.reports.heartbeat_recency')}><SuperAdminReportTrend series={reports.devices?.heartbeatTrend} empty={empty} /></Card>
  </>;
};

export const SuperAdminAnalyticsView = ({ type, title, navigation }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false, selectedRange = range) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setResult(await superAdminReportsService.fetchReports(selectedRange));
    setLoading(false); setRefreshing(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);
  const apply = () => { const selected = { from: from.trim(), to: to.trim() }; setRange(selected); load(false, selected); };

  const handleExportCSV = () => {
    const rawData = result?.data?.[type] || {};
    const rows = [];
    Object.entries(rawData).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((item) => rows.push([key, item.label, item.value]));
      } else if (val && typeof val === 'object') {
        Object.entries(val).forEach(([subKey, subVal]) => rows.push([key, subKey, subVal]));
      }
    });

    const csv = superAdminExportService.generateCSV({
      title: `${title} Export`,
      period: range.from ? `${range.from} to ${range.to || 'Now'}` : 'All Time',
      headers: ['Dimension', 'Category / Label', 'Value'],
      rows,
    });

    superAdminExportService.shareReport({
      title: `${title} (CSV)`,
      filename: `${type}_analytics.csv`,
      content: csv,
    });
  };

  const handleExportText = () => {
    const rawData = result?.data?.[type] || {};
    const rows = [];
    Object.entries(rawData).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((item) => rows.push([key, item.label, String(item.value)]));
      } else if (val && typeof val === 'object') {
        Object.entries(val).forEach(([subKey, subVal]) => rows.push([key, subKey, String(subVal)]));
      }
    });

    const doc = superAdminExportService.generateDocumentText({
      title,
      period: range.from ? `${range.from} to ${range.to || 'Now'}` : 'All Time',
      headers: ['Dimension', 'Metric', 'Value'],
      rows,
    });

    superAdminExportService.shareReport({
      title: `${title} (Document)`,
      filename: `${type}_analytics.txt`,
      content: doc,
    });
  };

  return <View style={styles.container}>
    <AppHeader title={title} subtitle={t('super_admin.reports.subtitle')} showBack onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
      <View style={[styles.filter, shadows.card]}>
        <Text style={styles.filterTitle}>{t('super_admin.reports.date_range')}</Text>
        <View style={styles.inputs}>
          <TextInput value={from} onChangeText={setFrom} placeholder={t('super_admin.reports.from')} placeholderTextColor={colors.textMuted} style={styles.input} />
          <TextInput value={to} onChangeText={setTo} placeholder={t('super_admin.reports.to')} placeholderTextColor={colors.textMuted} style={styles.input} />
        </View>
        <TouchableOpacity onPress={apply} style={styles.apply}>
          <Text style={styles.applyText}>{t('super_admin.reports.apply')}</Text>
        </TouchableOpacity>
      </View>

      {/* Export Action Bar */}
      <View style={styles.exportBar}>
        <TouchableOpacity style={styles.btnCsv} onPress={handleExportCSV}>
          <Text style={styles.btnCsvText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDoc} onPress={handleExportText}>
          <Text style={styles.btnDocText}>Export Document</Text>
        </TouchableOpacity>
      </View>

      {result?.errors?.length ? <Text style={styles.notice}>{t('super_admin.reports.partial_data')}</Text> : null}
      {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : sectionContent(type, result?.data || {})}
    </ScrollView>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  filter: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  filterTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.xs },
  inputs: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.sm, color: colors.textPrimary, ...typography.caption, backgroundColor: '#FFFFFF' },
  apply: { backgroundColor: colors.deepMaroon, padding: spacing.xs, borderRadius: borderRadius.sm, marginTop: spacing.xs, alignItems: 'center' },
  applyText: { ...typography.caption, color: colors.warmIvory, fontWeight: '700' },
  exportBar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  btnCsv: { flex: 1, backgroundColor: colors.softCream, borderWidth: 1, borderColor: colors.cardBorder, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignItems: 'center' },
  btnCsvText: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800', fontSize: 11 },
  btnDoc: { flex: 1, backgroundColor: colors.saffron, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignItems: 'center' },
  btnDocText: { ...typography.caption, color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  cardTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  notice: { ...typography.caption, color: colors.saffronDark, backgroundColor: colors.statusWarningBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  state: { padding: spacing.xxxl, alignItems: 'center' },
});
