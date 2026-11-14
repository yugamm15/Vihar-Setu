import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import {
  MapPinIcon,
  CheckCircleIcon,
  ShieldIcon,
  UserIcon,
} from '../../../shared/components/CustomSvgIcons';
import { adminService } from '../../admin/services/adminService';

export const AreaManagementModal = ({ visible, onClose }) => {
  const [areas, setAreas] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Area form
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCity, setNewAreaCity] = useState('Surat');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [{ data: areasData }, { data: adminsData }] = await Promise.all([
        adminService.fetchAreas(),
        adminService.fetchAdministrators(),
      ]);

      setAreas(areasData || []);
      setAdmins(adminsData || []);
    } catch (e) {
      console.warn('[AreaManagement] Load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
      setShowAddForm(false);
      setNewAreaName('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [visible]);

  const handleCreateArea = async () => {
    if (!newAreaName.trim()) {
      setErrorMsg('Please enter an area name (e.g. Adajan & Pal).');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');

    try {
      const { data, error } = await adminService.createArea({
        name: newAreaName.trim(),
        city: newAreaCity.trim() || 'Surat',
      });

      if (error) {
        setErrorMsg('Failed to create area. It may already exist.');
      } else {
        setSuccessMsg(`Area "${data.name}" added successfully.`);
        setNewAreaName('');
        setShowAddForm(false);
        loadData();
      }
    } catch (e) {
      setErrorMsg(e.message || 'Error creating area.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MapPinIcon size={20} color={colors.saffron} />
              </View>
              <View>
                <Text style={styles.title}>Area & Jurisdiction</Text>
                <Text style={styles.subtitle}>
                  Multi-Area Scalability • Current: Surat
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Banner */}
            <View style={styles.banner}>
              <ShieldIcon size={16} color={colors.gold} />
              <Text style={styles.bannerText}>
                Administrators are restricted to monitor Vihars and Sevaks only within their assigned operational area.
              </Text>
            </View>

            {/* Notification messages */}
            {!!errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
            {!!successMsg && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            {/* Section 1: Active Operational Areas */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Operational Areas ({areas.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddForm(!showAddForm)}
                style={styles.addAreaBtn}
              >
                <Text style={styles.addAreaBtnText}>
                  {showAddForm ? 'Cancel' : '+ Add Area'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Add Area Form */}
            {showAddForm && (
              <View style={[styles.addAreaCard, shadows.subtle]}>
                <Text style={styles.formLabel}>Area / Sector Name</Text>
                <TextInput
                  style={styles.input}
                  value={newAreaName}
                  onChangeText={setNewAreaName}
                  placeholder="e.g. Vesu & City Light"
                  placeholderTextColor={colors.gray500}
                />

                <Text style={styles.formLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={newAreaCity}
                  onChangeText={setNewAreaCity}
                  placeholder="Surat"
                  placeholderTextColor={colors.gray500}
                />

                <TouchableOpacity
                  style={styles.submitAreaBtn}
                  onPress={handleCreateArea}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.submitAreaBtnText}>Save Area</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Areas List */}
            {isLoading ? (
              <ActivityIndicator color={colors.deepMaroon} style={{ marginVertical: 20 }} />
            ) : areas.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No areas registered.</Text>
              </View>
            ) : (
              areas.map((area) => {
                const assignedAdmin = admins.find((a) => a.area_id === area.id);
                return (
                  <View key={area.id} style={[styles.areaCard, shadows.subtle]}>
                    <View style={styles.areaHeader}>
                      <View style={styles.areaBadge}>
                        <Text style={styles.areaBadgeText}>{area.city}</Text>
                      </View>
                      <Text style={styles.areaName}>{area.name}</Text>
                    </View>

                    <View style={styles.assignedAdminRow}>
                      <UserIcon size={14} color={colors.textSecondary} />
                      <Text style={styles.assignedAdminText}>
                        Assigned Admin:{' '}
                        <Text style={styles.adminHighlight}>
                          {assignedAdmin?.profiles?.full_name || 'Unassigned (Super Admin Over-watch)'}
                        </Text>
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 17, 18, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1.5,
    borderTopColor: colors.gold + '40',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryDark + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  title: {
    fontSize: 16,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark + '15',
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold + '30',
    gap: spacing.xs,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: colors.emergency + '15',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.emergency,
  },
  errorText: {
    color: colors.emergency,
    fontSize: 12,
    fontFamily: typography.medium,
  },
  successBox: {
    backgroundColor: colors.statusSafeBg,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.statusSafe,
  },
  successText: {
    color: colors.statusSafe,
    fontSize: 12,
    fontFamily: typography.medium,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.semiBold,
    color: colors.deepMaroon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addAreaBtn: {
    backgroundColor: colors.saffron,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  addAreaBtnText: {
    fontSize: 12,
    fontFamily: typography.semiBold,
    color: colors.white,
  },
  addAreaCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  submitAreaBtn: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  submitAreaBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: typography.semiBold,
  },
  areaCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  areaBadge: {
    backgroundColor: colors.primaryDark + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  areaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  areaName: {
    fontSize: 14,
    fontFamily: typography.semiBold,
    color: colors.deepMaroon,
  },
  assignedAdminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  assignedAdminText: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  adminHighlight: {
    color: colors.textPrimary,
    fontFamily: typography.medium,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

