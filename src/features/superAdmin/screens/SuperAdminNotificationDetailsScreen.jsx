import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminCommunicationService } from '../services/superAdminCommunicationService';

const fmtDate = (value) => value ? new Date(value).toLocaleString('en-IN') : 'â€”';

const severityColor = (s) => {
  if (s === 'CRITICAL') return colors.statusEmergency;
  if (s === 'WARNING') return colors.saffron;
  return colors.statusSafe;
};

export const SuperAdminNotificationDetailsScreen = ({ route, navigation }) => {
  const notificationId = route.params?.notificationId;
  const [result, setResult] = useState(null);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(null);

  const load = useCallback(async () => {
    setResult(null);
    const res = await superAdminCommunicationService.getNotification(notificationId);
    setResult(res);
  }, [notificationId]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async () => {
    if (!result?.data || result.data.is_read) return;
    setMarking(true);
    setMarkError(null);
    const { error } = await superAdminCommunicationService.markRead(notificationId);
    setMarking(false);
    if (error) {
      setMarkError(error.message || 'Could not mark as read.');
    } else {
      // Reload to reflect updated status
      await load();
    }
  };

  const item = result?.data;

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('super_admin.communication.notification_details')}
        showBack
        onBack={() => navigation.goBack()}
      />
      {!result ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.saffron} />
      ) : result.error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{result.error.message}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status banner */}
          <View style={[styles.statusBanner, item.is_read ? styles.bannerRead : styles.bannerUnread]}>
            <Text style={styles.bannerText}>
              {item.is_read ? `${t('super_admin.communication.read')} Â· ${fmtDate(item.read_at)}` : t('super_admin.communication.unread')}
            </Text>
          </View>

          {/* Main card */}
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>

            {/* Meta rows */}
            <View style={styles.metaRow}>
              <MetaChip label="Type" value={item.type} />
              <MetaChip label="Severity" value={item.severity} valueColor={severityColor(item.severity)} />
            </View>

            <Divider />

            <MetaLine label="Recipient" value={item.profiles?.full_name || item.user_id} />
            {item.profiles?.phone ? <MetaLine label="Phone" value={item.profiles.phone} /> : null}
            {item.profiles?.email ? <MetaLine label="Email" value={item.profiles.email} /> : null}
            <MetaLine label="Related Vihar" value={item.vihar_id || t('super_admin.communication.no_vihar')} />
            <MetaLine label="Sent" value={fmtDate(item.created_at)} />

            {/* Metadata */}
            {item.metadata && Object.keys(item.metadata).length > 0 ? (
              <>
                <Divider />
                <Text style={styles.metaHeader}>Metadata</Text>
                {Object.entries(item.metadata).map(([key, val]) => (
                  <MetaLine key={key} label={key} value={String(val)} />
                ))}
              </>
            ) : null}
          </View>

          {/* Mark as read â€” only shown for recipients who own the notification.
              Super Admin oversight view; the RPC enforces user_id = auth.uid() so
              this will only succeed if the Super Admin is also the recipient. */}
          {!item.is_read ? (
            <View style={styles.actionArea}>
              {markError ? <Text style={styles.markError}>{markError}</Text> : null}
              <TouchableOpacity
                style={[styles.markButton, marking && styles.markButtonDisabled]}
                onPress={handleMarkRead}
                disabled={marking}
              >
                {marking
                  ? <ActivityIndicator color={colors.warmIvory} />
                  : <Text style={styles.markButtonText}>{t('super_admin.communication.mark_read')}</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const Divider = () => <View style={styles.divider} />;
const MetaLine = ({ label, value }) => (
  <View style={styles.metaLine}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
);
const MetaChip = ({ label, value, valueColor }) => (
  <View style={styles.metaChip}>
    <Text style={styles.chipLabel}>{label}</Text>
    <Text style={[styles.chipValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  loader: { marginTop: 80 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { ...typography.bodySmall, color: colors.statusEmergency, textAlign: 'center' },
  retryButton: { marginTop: spacing.md, padding: spacing.sm },
  retryText: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  statusBanner: {
    borderRadius: borderRadius.sm, padding: spacing.sm,
    marginBottom: spacing.md, alignItems: 'center',
  },
  bannerRead: { backgroundColor: '#E8F5E9' },
  bannerUnread: { backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: colors.saffron },
  bannerText: { ...typography.caption, fontWeight: '700', color: colors.deepMaroon },
  card: {
    backgroundColor: colors.cardBackground, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder,
  },
  title: { ...typography.h3, color: colors.deepMaroon, marginBottom: spacing.sm },
  body: {
    ...typography.body, color: colors.textPrimary,
    lineHeight: 22, marginBottom: spacing.md,
  },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  metaChip: {
    flex: 1, backgroundColor: colors.softCream, borderRadius: borderRadius.sm,
    padding: spacing.sm, alignItems: 'center',
  },
  chipLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  chipValue: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.sm },
  metaLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  metaValue: { ...typography.caption, color: colors.textPrimary, fontWeight: '600', flex: 2, textAlign: 'right' },
  metaHeader: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700', marginBottom: spacing.xs },
  actionArea: { marginTop: spacing.md },
  markError: { ...typography.caption, color: colors.statusEmergency, marginBottom: spacing.sm, textAlign: 'center' },
  markButton: {
    backgroundColor: colors.deepMaroon, borderRadius: borderRadius.sm,
    padding: spacing.md, alignItems: 'center',
  },
  markButtonDisabled: { opacity: 0.6 },
  markButtonText: { ...typography.bodySmall, color: colors.warmIvory, fontWeight: '700' },
});
