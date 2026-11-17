import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { superAdminConfigurationService } from '../services/SuperAdminConfigurationService';

const categoryLabels = {
  general: 'general',
  localization: 'localization',
  notifications: 'notifications',
  operational: 'operational',
  safety: 'safety',
};

export const SuperAdminConfigurationScreen = ({ navigation }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setResult(await superAdminConfigurationService.listSettings());
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const groups = (result?.data || []).reduce((all, setting) => {
    all[setting.category] = [...(all[setting.category] || []), setting];
    return all;
  }, {});

  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.configuration.title')} subtitle={t('super_admin.configuration.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.saffron} />}>
        {result?.errors?.length ? <Text style={styles.notice}>{t('super_admin.configuration.partial_data')}</Text> : null}
        {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /></View> : result?.error ? (
          <View style={styles.state}><Text style={styles.error}>{t('super_admin.configuration.load_error')}</Text><TouchableOpacity onPress={() => load()}><Text style={styles.retry}>{t('common.retry')}</Text></TouchableOpacity></View>
        ) : Object.keys(groups).length ? Object.entries(groups).map(([category, settings]) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(`super_admin.configuration.categories.${categoryLabels[category]}`)}</Text>
            {settings.map((setting) => (
              <TouchableOpacity key={setting.id} style={styles.card} onPress={() => navigation.navigate('SuperAdminConfigurationDetails', { settingId: setting.id })}>
                <View style={styles.row}><Text style={styles.key}>{setting.key}</Text><Text style={styles.type}>{setting.dataType}</Text></View>
                <Text style={styles.value}>{setting.value}</Text>
                <Text style={styles.description}>{setting.description || t('super_admin.configuration.no_description')}</Text>
                <Text style={styles.updated}>{t('super_admin.configuration.updated')}: {setting.updated_at ? new Date(setting.updated_at).toLocaleString('en-IN') : '—'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )) : <Text style={styles.empty}>{t('super_admin.configuration.empty')}</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: { marginBottom: spacing.md }, sectionTitle: { ...typography.h4, color: colors.deepMaroon, marginBottom: spacing.sm },
  card: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, key: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800', flex: 1 }, type: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.bodySmall, color: colors.textPrimary, marginTop: spacing.xs }, description: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }, updated: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  notice: { ...typography.caption, color: colors.saffronDark, backgroundColor: colors.statusWarningBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }, empty: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', padding: spacing.xxxl }, state: { padding: spacing.xxxl, alignItems: 'center' }, error: { ...typography.bodySmall, color: colors.statusEmergency, textAlign: 'center' }, retry: { ...typography.bodySmall, color: colors.saffronDark, fontWeight: '800', marginTop: spacing.md },
});
