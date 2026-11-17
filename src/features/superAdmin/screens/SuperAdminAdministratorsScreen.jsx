import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { SearchIcon } from '../../../shared/components/CustomSvgIcons';
import { t } from '../../../core/localization/i18n';
import { superAdminAdministratorService } from '../services/superAdminAdministratorService';
import { SuperAdminAdministratorCard } from '../components/SuperAdminAdministratorCard';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'DISABLED'];

export const SuperAdminAdministratorsScreen = ({ navigation }) => {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [registeredFrom, setRegisteredFrom] = useState('');
  const [registeredTo, setRegisteredTo] = useState('');
  const [administrators, setAdministrators] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const filters = { status, search, city, area, registeredFrom, registeredTo };

  const loadAdministrators = useCallback(async (refresh = false) => {
    const nextPage = refresh ? 0 : page;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    const result = await superAdminAdministratorService.listAdministrators(filters, nextPage);
    if (result.error) {
      setError(result.error.message);
      if (refresh || nextPage === 0) setAdministrators([]);
    } else {
      setError(null);
      setAdministrators(result.data);
      setTotal(result.count);
      setPage(nextPage);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [area, city, page, registeredFrom, registeredTo, search, status]);

  useEffect(() => {
    setPage(0);
  }, [status, search, city, area, registeredFrom, registeredTo]);

  useEffect(() => {
    loadAdministrators();
  }, [loadAdministrators]);

  const loadNextPage = () => {
    if (!isLoading && administrators.length < total) {
      setPage((current) => current + 1);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('super_admin.administrators.title')} subtitle={`${t('super_admin.administrators.subtitle')} · ${total}`} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadAdministrators(true)} tintColor={colors.saffron} />}
        onScrollEndDrag={loadNextPage}
      >
        <View style={styles.searchBox}>
          <SearchIcon size={20} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('super_admin.administrators.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.filterTitle}>{t('super_admin.administrators.filters')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => { setStatus(filter); setPage(0); }}
              style={[styles.filterChip, status === filter && styles.activeFilterChip]}
            >
              <Text style={[styles.filterText, status === filter && styles.activeFilterText]}>
                {t(`super_admin.administrators.status.${filter.toLowerCase()}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.filterInputs}>
          <TextInput value={city} onChangeText={setCity} placeholder={t('super_admin.administrators.city')} placeholderTextColor={colors.textMuted} style={styles.filterInput} />
          <TextInput value={area} onChangeText={setArea} placeholder={t('super_admin.administrators.area')} placeholderTextColor={colors.textMuted} style={styles.filterInput} />
        </View>
        <View style={styles.filterInputs}>
          <TextInput value={registeredFrom} onChangeText={setRegisteredFrom} placeholder={t('super_admin.administrators.registered_from')} placeholderTextColor={colors.textMuted} style={styles.filterInput} />
          <TextInput value={registeredTo} onChangeText={setRegisteredTo} placeholder={t('super_admin.administrators.registered_to')} placeholderTextColor={colors.textMuted} style={styles.filterInput} />
        </View>

        {error ? (
          <View style={styles.state}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => loadAdministrators(true)}><Text style={styles.retry}>{t('super_admin.common.retry')}</Text></TouchableOpacity></View>
        ) : isLoading && administrators.length === 0 ? (
          <View style={styles.state}><ActivityIndicator size="large" color={colors.saffron} /><Text style={styles.stateText}>{t('super_admin.common.loading')}</Text></View>
        ) : administrators.length === 0 ? (
          <View style={styles.state}><Text style={styles.stateText}>{t('super_admin.administrators.empty')}</Text></View>
        ) : (
          administrators.map((administrator) => (
            <SuperAdminAdministratorCard
              key={administrator.administratorId}
              administrator={administrator}
              translate={t}
              onPress={(selected) => navigation.navigate('SuperAdminAdministratorDetails', { administratorId: selected.administratorId })}
            />
          ))
        )}
        {isLoading && administrators.length > 0 ? <ActivityIndicator color={colors.saffron} style={styles.paginationLoading} /> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  searchBox: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  searchInput: { flex: 1, ...typography.bodySmall, color: colors.textPrimary, paddingVertical: spacing.md, marginLeft: spacing.sm },
  filterTitle: { ...typography.caption, color: colors.deepMaroon, fontWeight: '800', marginBottom: spacing.xs },
  filterRow: { paddingBottom: spacing.sm },
  filterChip: { borderRadius: borderRadius.md, backgroundColor: colors.softCream, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  activeFilterChip: { backgroundColor: colors.deepMaroon },
  filterText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  activeFilterText: { color: colors.warmIvory, fontWeight: '800' },
  filterInputs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  filterInput: { flex: 1, backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, color: colors.textPrimary, ...typography.caption },
  state: { alignItems: 'center', padding: spacing.xxxl },
  stateText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  errorText: { ...typography.bodySmall, color: colors.statusEmergency, textAlign: 'center' },
  retry: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '800', marginTop: spacing.sm },
  paginationLoading: { marginVertical: spacing.md },
});

