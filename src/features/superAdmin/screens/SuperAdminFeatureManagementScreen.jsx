import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { superAdminGovernanceService } from '../services/superAdminGovernanceService';

export const SuperAdminFeatureManagementScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedFeature, setSelectedFeature] = useState(null);

  const features = useMemo(() => {
    return superAdminGovernanceService.getFeatureMatrix();
  }, []);

  const filteredFeatures = useMemo(() => {
    if (selectedCategory === 'ALL') return features;
    if (selectedCategory === 'CRITICAL') return features.filter((f) => f.safetyCritical);
    if (selectedCategory === 'OPERATIONAL') return features.filter((f) => !f.safetyCritical);
    return features;
  }, [features, selectedCategory]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Platform Capabilities & Features"
        subtitle="Architectural Guardrails, Operational Capabilities & Safety Controls"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Safety Architectural Banner */}
        <View style={styles.safetyNoticeBanner}>
          <View style={styles.safetyNoticeHeader}>
            <Text style={styles.safetyNoticeIcon}>🛡️</Text>
            <Text style={styles.safetyNoticeTitle}>Deterministic Life-Safety Architecture</Text>
          </View>
          <Text style={styles.safetyNoticeText}>
            Core life-safety features—such as Emergency SOS multi-tier escalation, Haversine route deviation detection, stationary safety checks, and immutable audit logs—are strictly enforced at the PostgreSQL database schema and RLS level.
          </Text>
          <Text style={styles.safetyNoticeSubtext}>
            In accordance with platform safety design rules, client-side toggle switches that could inadvertently disable life-safety protections are intentionally omitted. Operational behaviors are governed exclusively via audited policy thresholds.
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'ALL' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('ALL')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              All Capabilities ({features.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'CRITICAL' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('CRITICAL')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'CRITICAL' && styles.filterChipTextActive,
              ]}
            >
              Life-Safety Critical ({features.filter((f) => f.safetyCritical).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'OPERATIONAL' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('OPERATIONAL')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'OPERATIONAL' && styles.filterChipTextActive,
              ]}
            >
              Operational ({features.filter((f) => !f.safetyCritical).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresList}>
          {filteredFeatures.map((feat) => {
            const isCritical = feat.safetyCritical;

            return (
              <TouchableOpacity
                key={feat.id}
                style={[styles.featureCard, isCritical && styles.featureCardCritical]}
                activeOpacity={0.85}
                onPress={() => setSelectedFeature(feat)}
              >
                <View style={styles.featureHeader}>
                  <View style={styles.featureHeaderLeft}>
                    <Text style={styles.featureName}>{feat.name}</Text>
                    <Text style={styles.featureScope}>{feat.scope}</Text>
                  </View>
                  <View style={styles.featureBadges}>
                    <View
                      style={[
                        styles.badge,
                        isCritical ? styles.badgeCritical : styles.badgeOperational,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isCritical ? styles.badgeTextCritical : styles.badgeTextOperational,
                        ]}
                      >
                        {isCritical ? 'SAFETY-CRITICAL' : 'OPERATIONAL'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.featureMetaRow}>
                  <Text style={styles.metaLabel}>Architecture Enforcement:</Text>
                  <Text style={styles.metaValue}>{feat.architecture}</Text>
                </View>

                <View style={styles.featureMetaRow}>
                  <Text style={styles.metaLabel}>Toggle State:</Text>
                  <Text style={[styles.metaValue, styles.lockedValue]}>
                    Permanently Enabled (Safety Locked)
                  </Text>
                </View>

                <Text style={styles.featureNotes}>{feat.notes}</Text>

                <View style={styles.featureFooter}>
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => setSelectedFeature(feat)}
                  >
                    <Text style={styles.detailButtonText}>View Architecture Detail →</Text>
                  </TouchableOpacity>

                  {isCritical && (
                    <TouchableOpacity
                      style={styles.policyButton}
                      onPress={() => navigation.navigate('SuperAdminPolicyManagement')}
                    >
                      <Text style={styles.policyButtonText}>Adjust Thresholds</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Operational Philosophy Box */}
        <View style={styles.philosophyBox}>
          <Text style={styles.philosophyTitle}>Safety-Critical Platform Principles</Text>
          <Text style={styles.philosophyPoint}>
            • <Text style={styles.boldText}>No Single Point of Failure:</Text> Emergency escalation cascades across multiple authorized administrators sequentially.
          </Text>
          <Text style={styles.philosophyPoint}>
            • <Text style={styles.boldText}>Offline-First Resilience:</Text> Field sevikas can record holds, location breadcrumbs, and alerts even in remote or low-connectivity terrain.
          </Text>
          <Text style={styles.philosophyPoint}>
            • <Text style={styles.boldText}>Strict Audit Immutability:</Text> Administrative overrides and security changes are permanently preserved in append-only PostgreSQL logs.
          </Text>
        </View>
      </ScrollView>

      {/* Feature Detail Modal */}
      <Modal
        visible={!!selectedFeature}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedFeature(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFeature && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedFeature.name}</Text>
                    <Text style={styles.modalScope}>{selectedFeature.scope}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedFeature(null)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Safety Classification</Text>
                    <View
                      style={[
                        styles.badge,
                        selectedFeature.safetyCritical
                          ? styles.badgeCritical
                          : styles.badgeOperational,
                        { alignSelf: 'flex-start', marginTop: 4 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          selectedFeature.safetyCritical
                            ? styles.badgeTextCritical
                            : styles.badgeTextOperational,
                        ]}
                      >
                        {selectedFeature.safetyCritical
                          ? 'SAFETY-CRITICAL CAPABILITY'
                          : 'OPERATIONAL SERVICE'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Architectural Enforcement Mechanism</Text>
                    <Text style={styles.modalSectionText}>{selectedFeature.architecture}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Operational Rationale & Governance</Text>
                    <Text style={styles.modalSectionText}>{selectedFeature.notes}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Casually Disabling Capability</Text>
                    <Text style={styles.modalSectionText}>
                      Disabling this feature via an arbitrary client switch is prohibited by system design. 
                      {selectedFeature.safetyCritical
                        ? ' In the event of an emergency or route hazard during Vihar, disabling this component would endanger Sadhvijis and Sevikas. Any modifications must take the form of carefully considered, logged policy threshold updates.'
                        : ' This service supports essential workflow coordination and administrative transparency across regional sanghs.'}
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  {selectedFeature.safetyCritical && (
                    <TouchableOpacity
                      style={styles.modalPrimaryButton}
                      onPress={() => {
                        setSelectedFeature(null);
                        navigation.navigate('SuperAdminPolicyManagement');
                      }}
                    >
                      <Text style={styles.modalPrimaryButtonText}>Configure Policy Thresholds</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={() => setSelectedFeature(null)}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
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
  safetyNoticeBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  safetyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  safetyNoticeIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  safetyNoticeTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: '#991B1B',
  },
  safetyNoticeText: {
    ...typography.body2,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  safetyNoticeSubtext: {
    ...typography.caption,
    color: '#991B1B',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  featuresList: {
    marginBottom: spacing.md,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  featureCardCritical: {
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featureHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  featureName: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureScope: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  featureBadges: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeCritical: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badgeOperational: {
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  badgeText: {
    ...typography.overline,
    fontWeight: '700',
  },
  badgeTextCritical: {
    color: '#B91C1C',
  },
  badgeTextOperational: {
    color: '#3730A3',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  featureMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  lockedValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  featureNotes: {
    ...typography.body2,
    color: colors.textPrimary,
    backgroundColor: '#F9FAFB',
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  featureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailButton: {
    paddingVertical: 4,
  },
  detailButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  policyButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  policyButtonText: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '700',
  },
  philosophyBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  philosophyTitle: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  philosophyPoint: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '85%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalScope: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalCloseText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  modalBody: {
    marginBottom: spacing.md,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSectionText: {
    ...typography.body2,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalPrimaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalPrimaryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalSecondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalSecondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
});
