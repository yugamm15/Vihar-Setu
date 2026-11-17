import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { superAdminGovernanceService } from '../services/superAdminGovernanceService';

const CATEGORIES = [
  { key: 'ALL', label: 'All Activities' },
  { key: 'USER_GOVERNANCE', label: 'User Governance' },
  { key: 'ADMIN_DELEGATION', label: 'Admin Delegation' },
  { key: 'POLICY_CONFIG', label: 'Policy & Config' },
  { key: 'EMERGENCY_OPS', label: 'Emergency Ops' },
  { key: 'COMMUNICATION', label: 'Announcements' },
  { key: 'SECURITY_AUDIT', label: 'Security & Audit' },
];

const formatKolkataTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true,
    }).format(date);
  } catch (err) {
    return new Date(isoString).toLocaleString('en-IN');
  }
};

const sanitizeDetails = (details) => {
  if (!details || typeof details !== 'object') return {};
  const sanitized = { ...details };
  const sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token', 'hash', 'secret', 'auth'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED_FOR_SECURITY]';
    }
  }
  return sanitized;
};

export const SuperAdminGovernanceActivityScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected item for detail modal
  const [selectedActivity, setSelectedActivity] = useState(null);

  const fetchActivities = useCallback(
    async (nextPage = 0, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (nextPage === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const filters = {
        category: selectedCategory,
        search: searchQuery.trim(),
        from: dateFrom.trim() || undefined,
        to: dateTo.trim() || undefined,
      };

      const { data, count, error } = await superAdminGovernanceService.getGovernanceActivities(
        filters,
        nextPage
      );

      if (!error && data) {
        if (nextPage === 0) {
          setActivities(data);
        } else {
          setActivities((prev) => [...prev, ...data]);
        }
        setTotalCount(count);
        setPage(nextPage);
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [selectedCategory, searchQuery, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  const handleApplyFilters = () => {
    fetchActivities(0);
  };

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const hasMore = activities.length < totalCount;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Governance Audit Activity"
        subtitle="Platform Actions, Security Events & Administrative Trail"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchActivities(0, true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Category Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filter Bar */}
        <View style={styles.filterBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search action, entity or ID..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.dateFilterRow}>
            <TextInput
              style={[styles.dateInput, { marginRight: spacing.xs }]}
              placeholder="YYYY-MM-DD (From)"
              placeholderTextColor={colors.textSecondary}
              value={dateFrom}
              onChangeText={setDateFrom}
            />
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD (To)"
              placeholderTextColor={colors.textSecondary}
              value={dateTo}
              onChangeText={setDateTo}
            />
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Summary */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            Showing <Text style={styles.boldText}>{activities.length}</Text> of{' '}
            <Text style={styles.boldText}>{totalCount}</Text> recorded governance events
          </Text>
        </View>

        {/* List of Activities */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading governance audit trail...</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Governance Activities Found</Text>
            <Text style={styles.emptySubtitle}>
              No events matched the selected category and filter criteria.
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {activities.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.activityCard}
                activeOpacity={0.8}
                onPress={() => setSelectedActivity(item)}
              >
                <View style={styles.activityCardHeader}>
                  <Text style={styles.activityAction}>{item.action}</Text>
                  <Text style={styles.activityEntity}>{item.entity}</Text>
                </View>

                <View style={styles.activityMetaRow}>
                  <Text style={styles.metaLabel}>Actor:</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.actor_id || 'System / Automated'}
                  </Text>
                </View>

                {item.entity_id && (
                  <View style={styles.activityMetaRow}>
                    <Text style={styles.metaLabel}>Target ID:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.entity_id}
                    </Text>
                  </View>
                )}

                <View style={styles.activityTimeRow}>
                  <Text style={styles.timeText}>{formatKolkataTime(item.created_at)}</Text>
                  <Text style={styles.viewDetailText}>View Details →</Text>
                </View>
              </TouchableOpacity>
            ))}

            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => fetchActivities(page + 1)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More Activities</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedActivity}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedActivity(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedActivity && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedActivity.action}</Text>
                    <Text style={styles.modalSubtitle}>
                      Entity: {selectedActivity.entity} {selectedActivity.entity_id ? `(${selectedActivity.entity_id})` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedActivity(null)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalFieldLabel}>Log ID:</Text>
                    <Text style={styles.modalFieldValue}>{selectedActivity.id}</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalFieldLabel}>Timestamp (IST):</Text>
                    <Text style={styles.modalFieldValue}>
                      {formatKolkataTime(selectedActivity.created_at)}
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalFieldLabel}>Actor ID:</Text>
                    <Text style={styles.modalFieldValue}>
                      {selectedActivity.actor_id || 'System / Automated'}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Audited Change Details (Sanitized)</Text>
                    <View style={styles.jsonBox}>
                      <Text style={styles.jsonText}>
                        {JSON.stringify(sanitizeDetails(selectedActivity.details), null, 2)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.auditSecurityNotice}>
                    <Text style={styles.auditSecurityNoticeText}>
                      🔒 This audit entry is immutably stored in the PostgreSQL audit log table. Entries cannot be altered, rolled back, or deleted.
                    </Text>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalCloseActionButton}
                  onPress={() => setSelectedActivity(null)}
                >
                  <Text style={styles.modalCloseActionText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  categoryScroll: {
    marginBottom: spacing.sm,
  },
  categoryContent: {
    paddingRight: spacing.md,
  },
  categoryChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterBox: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.body2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateFilterRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.caption,
    color: colors.textPrimary,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  applyBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  resetBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryBar: {
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  centerContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  activityList: {
    marginBottom: spacing.md,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  activityAction: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  activityEntity: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityMetaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 65,
  },
  metaValue: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  activityTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  viewDetailText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  loadMoreButton: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  loadMoreText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    maxHeight: '80%',
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalCloseText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  modalBody: {
    marginBottom: spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  modalFieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    width: 110,
  },
  modalFieldValue: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  detailSection: {
    marginTop: spacing.sm,
  },
  detailSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  jsonBox: {
    backgroundColor: '#1E293B',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  jsonText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  auditSecurityNotice: {
    marginTop: spacing.md,
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  auditSecurityNoticeText: {
    ...typography.caption,
    color: '#166534',
    lineHeight: 18,
  },
  modalCloseActionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCloseActionText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
