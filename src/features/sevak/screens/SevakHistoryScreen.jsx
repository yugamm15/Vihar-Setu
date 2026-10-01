import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import {
  MapPinIcon,
  NavigationIcon,
  CheckCircleIcon,
  CloseIcon,
  HistoryIcon,
} from '../../../shared/components/CustomSvgIcons';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { viharService } from '../../vihar/services/viharService';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { t } from '../../../core/localization/i18n';

export const SevakHistoryScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVihar, setSelectedVihar] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await viharService.getViharHistory(user.id);
    setHistory(data || []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <HistoryIcon size={36} color={colors.saffronDark} />
      </View>
      <Text style={styles.emptyTitle}>No Vihars Recorded Yet</Text>
      <Text style={styles.emptySubtitle}>
        Once you start and complete a Vihar journey with Pujya Sadhvijis, your sacred route, telemetry summary, and duration will be safely recorded here.
      </Text>
      <PrimaryButton
        title="Go to Vihar Center"
        onPress={() => navigation.navigate('ViharTab')}
        variant="saffron"
        style={styles.emptyActionBtn}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title={t('sevak.vihar_history')}
        subtitle="Completed Journeys & Sacred Telemetry"
        showLogo
      />

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.saffron} />
          <Text style={styles.loadingText}>Fetching Vihar history from Supabase...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.saffron, colors.deepMaroon]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          renderItem={({ item }) => {
            const isCompleted = item.status === 'COMPLETED';
            const isActive = item.status === 'ACTIVE';

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedVihar(item)}
                style={[
                  styles.historyCard,
                  isActive && styles.activeHistoryCard,
                  shadows.card,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.dateRow}>
                    <View style={styles.dot} />
                    <Text style={styles.dateText}>{formatDate(item.created_at || item.started_at)}</Text>
                  </View>
                  <StatusBadge status={item.safety_status || SAFETY_STATUS.SAFE} />
                </View>

                <View style={styles.titleRow}>
                  <Text style={styles.viharTitle} numberOfLines={1}>
                    {item.title || 'Vihar Seva'}
                  </Text>
                  <View style={[styles.statusPill, isCompleted ? styles.completedPill : styles.plannedPill]}>
                    <Text style={[styles.statusPillText, isCompleted ? styles.completedPillText : styles.plannedPillText]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeRow}>
                  <MapPinIcon size={18} color={colors.saffron} />
                  <Text style={styles.routeText} numberOfLines={2}>
                    {item.source_name} → {item.dest_name}
                  </Text>
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.statItem}>
                    Distance: <Text style={styles.statBold}>{item.total_distance_km ? `${item.total_distance_km} km` : '—'}</Text>
                  </Text>
                  <Text style={styles.statItem}>
                    Duration: <Text style={styles.statBold}>{item.estimated_duration_mins ? `${item.estimated_duration_mins} mins` : '—'}</Text>
                  </Text>
                  <Text style={styles.viewDetailsHint}>View →</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* DETAIL MODAL */}
      <Modal
        visible={Boolean(selectedVihar)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVihar(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Vihar Details</Text>
                <Text style={styles.modalSub}>{formatDate(selectedVihar?.created_at)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedVihar(null)} style={styles.closeBtn}>
                <CloseIcon size={20} color={colors.deepMaroon} />
              </TouchableOpacity>
            </View>

            {selectedVihar ? (
              <View style={styles.modalBody}>
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalSectionTitle}>JOURNEY ROUTE</Text>
                  <View style={styles.modalRouteItem}>
                    <Text style={styles.routeLabel}>Origin (प्रस्थान):</Text>
                    <Text style={styles.routeValue}>{selectedVihar.source_name}</Text>
                  </View>
                  <View style={styles.routeDivider} />
                  <View style={styles.modalRouteItem}>
                    <Text style={styles.routeLabel}>Destination (गंतव्य):</Text>
                    <Text style={styles.routeValue}>{selectedVihar.dest_name}</Text>
                  </View>
                </View>

                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalSectionTitle}>TELEMETRY STATS</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Total Distance:</Text>
                    <Text style={styles.modalRowValue}>
                      {selectedVihar.total_distance_km ? `${selectedVihar.total_distance_km} km` : '—'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Estimated Duration:</Text>
                    <Text style={styles.modalRowValue}>
                      {selectedVihar.estimated_duration_mins ? `${selectedVihar.estimated_duration_mins} mins` : '—'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Journey Status:</Text>
                    <Text style={[styles.modalRowValue, { color: colors.saffronDark }]}>
                      {selectedVihar.status}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Safety Condition:</Text>
                    <Text style={[styles.modalRowValue, { color: colors.statusSafe }]}>
                      {selectedVihar.safety_status || 'SAFE'}
                    </Text>
                  </View>
                </View>

                {selectedVihar.notes ? (
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalSectionTitle}>NOTES & SADHVIJI SANGHA</Text>
                    <Text style={styles.notesText}>{selectedVihar.notes}</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  title="Close Summary"
                  onPress={() => setSelectedVihar(null)}
                  variant="saffron"
                  style={styles.modalCloseBtn}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginTop: spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyActionBtn: {
    width: '100%',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  activeHistoryCard: {
    borderColor: colors.saffron,
    backgroundColor: '#FFFDF9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.saffron,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  viharTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '700',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  completedPill: {
    backgroundColor: '#E8F5E9',
  },
  completedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.statusSafe,
  },
  plannedPill: {
    backgroundColor: '#FFF3E0',
  },
  plannedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.saffronDark,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  routeText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.xs,
    marginTop: 2,
  },
  statItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statBold: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  viewDetailsHint: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '700',
  },
  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  modalSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalBody: {
    paddingBottom: spacing.lg,
  },
  modalSectionCard: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepMaroon,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  modalRouteItem: {
    paddingVertical: 4,
  },
  routeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  routeValue: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: 2,
  },
  routeDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 4,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalRowLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  modalRowValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  notesText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  modalCloseBtn: {
    marginTop: spacing.md,
  },
});
