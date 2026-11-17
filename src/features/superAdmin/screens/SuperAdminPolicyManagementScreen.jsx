import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export const SuperAdminPolicyManagementScreen = ({ navigation }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit policy threshold modal
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPolicies = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await superAdminGovernanceService.getPolicies();
      setPolicies(result.policies || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load platform policies.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleOpenEdit = (policy) => {
    if (!policy.isEditable || !policy.settingId) return;
    setEditingPolicy(policy);
    setEditValue(String(policy.settingValue));
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    const trimmed = editValue.trim();
    if (!trimmed || isNaN(Number(trimmed)) || Number(trimmed) < 0) {
      Alert.alert('Invalid Threshold', 'Please enter a valid positive numeric threshold.');
      return;
    }

    Alert.alert(
      'Confirm Policy Threshold Change',
      `Are you sure you want to update "${editingPolicy.name}" from ${editingPolicy.settingValue} to ${trimmed}? This change will be audited server-side.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Save',
          onPress: async () => {
            setSaving(true);
            const { error } = await superAdminGovernanceService.updatePolicyThreshold(
              editingPolicy.settingId,
              trimmed
            );
            setSaving(false);

            if (error) {
              Alert.alert('Policy Update Failed', error.message || 'Could not update policy threshold.');
            } else {
              setEditingPolicy(null);
              Alert.alert('Policy Updated', 'Threshold updated successfully and recorded in audit log.');
              loadPolicies();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Platform Policy Management"
        subtitle="Operational Thresholds, Security Rules & Enforcement"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPolicies(true)} tintColor={colors.saffron} />}
      >
        <Text style={styles.sectionHeader}>CORE GOVERNANCE POLICIES ({policies.length})</Text>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Fetching active governance policies...</Text>
          </View>
        ) : (
          policies.map((p) => (
            <View key={p.id} style={[styles.policyCard, shadows.card]}>
              <View style={styles.policyTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyCategory}>{p.category}</Text>
                  <Text style={styles.policyName}>{p.name}</Text>
                </View>
                <View style={[styles.enforceBadge, p.isEditable ? styles.badgeEditable : styles.badgeImmutable]}>
                  <Text style={[styles.enforceBadgeText, p.isEditable ? styles.textEditable : styles.textImmutable]}>
                    {p.isEditable ? 'CONFIGURABLE' : 'DETERMINISTIC'}
                  </Text>
                </View>
              </View>

              <Text style={styles.policyDesc}>{p.description}</Text>

              <View style={styles.policyBottom}>
                <View style={styles.valueCol}>
                  <Text style={styles.valueLabel}>Current Threshold / Rule:</Text>
                  <Text style={styles.valueText}>
                    {p.settingValue} {p.unit ? `(${p.unit})` : ''}
                  </Text>
                </View>

                {p.isEditable && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEdit(p)}>
                    <Text style={styles.editBtnText}>Edit Threshold</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Policy Threshold Modal */}
      <Modal visible={!!editingPolicy} transparent animationType="fade" onRequestClose={() => setEditingPolicy(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <Text style={styles.modalCategory}>{editingPolicy?.category}</Text>
            <Text style={styles.modalTitle}>{editingPolicy?.name}</Text>
            <Text style={styles.modalDesc}>{editingPolicy?.description}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Threshold Value ({editingPolicy?.unit}):</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={editValue}
                onChangeText={setEditValue}
                placeholder="Enter positive number"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setEditingPolicy(null)}
                disabled={saving}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleSavePolicy}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.warmIvory} />
                ) : (
                  <Text style={styles.btnSaveText}>Save & Audit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warmIvory },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  sectionHeader: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  policyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  policyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  policyCategory: { fontSize: 8.5, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  policyName: { ...typography.bodySmall, color: colors.deepMaroon, fontWeight: '700', marginTop: 1 },
  enforceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
  },
  badgeEditable: { backgroundColor: '#FFF8E7', borderColor: colors.saffron },
  badgeImmutable: { backgroundColor: colors.softCream, borderColor: colors.cardBorder },
  enforceBadgeText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },
  textEditable: { color: colors.saffronDark },
  textImmutable: { color: colors.deepMaroon },
  policyDesc: { ...typography.caption, color: colors.textPrimary, fontSize: 11, lineHeight: 15, marginBottom: spacing.sm },
  policyBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.xs,
  },
  valueCol: { flex: 1 },
  valueLabel: { fontSize: 9.5, color: colors.textSecondary },
  valueText: { fontSize: 11, fontWeight: '800', color: colors.deepMaroon, marginTop: 1 },
  editBtn: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  editBtnText: { fontSize: 10, color: colors.warmIvory, fontWeight: '700' },
  centerLoading: { padding: spacing.xxxl, alignItems: 'center' },
  loadingText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalCategory: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  modalTitle: { ...typography.h4, color: colors.deepMaroon, marginTop: 2 },
  modalDesc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { ...typography.caption, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  btnCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  btnCancelText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  btnSave: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  btnSaveText: { ...typography.caption, color: colors.warmIvory, fontWeight: '800' },
});
