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
  Alert,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import {
  MapPinIcon,
  ShieldIcon,
  UserIcon,
} from '../../../shared/components/CustomSvgIcons';
import { superAdminAreaService } from '../services/superAdminAreaService';

export const AreaManagementModal = ({ visible, onClose, isSuperAdmin = false }) => {
  const [areas, setAreas] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Area form (with Compulsory Administrator)
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCity, setNewAreaCity] = useState('Surat');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [{ data: areasData }, { data: adminsData }] = await Promise.all([
        superAdminAreaService.listAreas(),
        superAdminAreaService.listAdministrators(),
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
      setAdminName('');
      setAdminPhone('');
      setAdminEmail('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [visible]);

  const handleCreateArea = async () => {
    if (!newAreaName.trim()) {
      setErrorMsg('Area / Sector Name is compulsory.');
      return;
    }
    setIsCreating(true);
    setErrorMsg('');

    try {
      const { data, error } = await superAdminAreaService.createArea(
        newAreaName.trim(),
        newAreaCity.trim() || 'Surat'
      );

      if (error) {
        setErrorMsg('Failed to create area. It may already exist.');
      } else {
        setSuccessMsg(`Area "${data.name}" created successfully.`);
        setNewAreaName('');
        setAdminName('');
        setAdminPhone('');
        setAdminEmail('');
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
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Container: 100% Solid Opaque Background */}
        <View style={[styles.container, shadows.prominent]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MapPinIcon size={20} color={colors.saffron} />
              </View>
              <View>
                <Text style={styles.title}>Area & Jurisdiction</Text>
                <Text style={styles.subtitle}>
                  Multi-Area Scalability • Current Hub: Surat
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Informational Policy Banner */}
            <View style={styles.banner}>
              <ShieldIcon size={18} color={colors.gold} />
              <Text style={styles.bannerText}>
                Administrators are strictly contained to monitor Vihars and Sevikas within their assigned geographical area boundary.
              </Text>
            </View>

            {/* Notification Messages */}
            {!!errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}
            {!!successMsg && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ {successMsg}</Text>
              </View>
            )}

            {/* Section Header: Active Areas & Add Button */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Operational Areas ({areas.length})
              </Text>
              {isSuperAdmin && (
                <TouchableOpacity
                  onPress={() => setShowAddForm(!showAddForm)}
                  style={styles.addAreaBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addAreaBtnText}>
                    {showAddForm ? 'Cancel' : '+ Add Area'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Add Area Form Card */}
            {isSuperAdmin && showAddForm && (
              <View style={[styles.addAreaCard, shadows.sm]}>
                <Text style={styles.formSectionHeader}>New Area Jurisdiction</Text>

                <Text style={styles.formLabel}>Area / Sector Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newAreaName}
                  onChangeText={setNewAreaName}
                  placeholder="e.g. Vesu & City Light"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.formLabel}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={newAreaCity}
                  onChangeText={setNewAreaCity}
                  placeholder="Surat"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.formDivider} />
                <Text style={styles.formSectionHeader}>
                  Designated Area Administrator (Compulsory)
                </Text>

                <Text style={styles.formLabel}>Admin Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={adminName}
                  onChangeText={setAdminName}
                  placeholder="e.g. Vihar Administrator"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.formLabel}>Admin Mobile Number *</Text>
                <TextInput
                  style={styles.input}
                  value={adminPhone}
                  onChangeText={setAdminPhone}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.formLabel}>Admin Email Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  placeholder="e.g. admin@jinaarya.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity
                  style={styles.submitAreaBtn}
                  onPress={handleCreateArea}
                  disabled={isCreating}
                  activeOpacity={0.8}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitAreaBtnText}>Save Area & Assign Admin</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Areas List */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.deepMaroon} size="large" />
                <Text style={styles.loadingText}>Loading operational areas...</Text>
              </View>
            ) : areas.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No operational areas registered.</Text>
              </View>
            ) : (
              areas.map((area) => {
                const assignedAdmin = admins.find((a) => a.area_id === area.id);
                const displayAdminName =
                  assignedAdmin?.profiles?.full_name || 'No assigned Administrator';
                const displayAdminPhone = area.admin_phone || assignedAdmin?.profiles?.phone;
                const displayAdminEmail = area.admin_email || assignedAdmin?.profiles?.email;

                return (
                  <View key={area.id} style={[styles.areaCard, shadows.subtle]}>
                    <View style={styles.areaHeader}>
                      <View style={styles.areaBadge}>
                        <Text style={styles.areaBadgeText}>{area.city || 'SURAT'}</Text>
                      </View>
                      <Text style={styles.areaName}>{area.name}</Text>
                    </View>

                    {/* Assigned Administrator Box */}
                    <View style={styles.assignedAdminBox}>
                      <View style={styles.assignedAdminRow}>
                        <UserIcon size={16} color={colors.saffron} />
                        <Text style={styles.assignedAdminLabel}>
                          Assigned Admin:{' '}
                          <Text style={styles.adminHighlight}>{displayAdminName}</Text>
                        </Text>
                      </View>

                      {(displayAdminPhone || displayAdminEmail) && (
                        <View style={styles.adminContactRow}>
                          {displayAdminPhone ? (
                            <Text style={styles.adminContactText}>
                              📞 {displayAdminPhone}
                            </Text>
                          ) : null}
                          {displayAdminEmail ? (
                            <Text style={styles.adminContactText}>
                              ✉️ {displayAdminEmail}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      disabled={!area.is_active}
                      style={[
                        styles.archiveButton,
                        !area.is_active && styles.archiveButtonDisabled,
                      ]}
                      onPress={() =>
                        Alert.alert('Archive Area', `Archive operational area "${area.name}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Archive',
                            style: 'destructive',
                            onPress: async () => {
                              const response = await superAdminAreaService.updateArea(
                                area.id,
                                area.name,
                                area.city,
                                area.state,
                                false
                              );
                              if (response.error) {
                                setErrorMsg(response.error.message);
                              } else {
                                setSuccessMsg('Area archived successfully.');
                                loadData();
                              }
                            },
                          },
                        ])
                      }
                    >
                      <Text
                        style={[
                          styles.archiveButtonText,
                          !area.is_active && styles.archiveButtonTextDisabled,
                        ]}
                      >
                        {area.is_active ? 'Archive Area' : 'Archived'}
                      </Text>
                    </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF', // 100% solid, fully opaque background
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    borderTopWidth: 2,
    borderTopColor: colors.gold,
    elevation: 24, // Android modal elevation to prevent underlying screen bleeding
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.warmIvory,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  title: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 22,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  scrollView: {
    backgroundColor: '#FFFFFF', // Solid opaque scroll background
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl + 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
  },
  bannerText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.statusEmergency,
  },
  errorText: {
    color: colors.statusEmergency,
    ...typography.caption,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: colors.statusSafeBg,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.statusSafe,
  },
  successText: {
    color: colors.statusSafe,
    ...typography.caption,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addAreaBtn: {
    backgroundColor: colors.saffron,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    ...shadows.subtle,
  },
  addAreaBtnText: {
    ...typography.caption,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addAreaCard: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.saffron,
  },
  formSectionHeader: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
    marginBottom: spacing.xs,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  formLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF', // Solid white input background
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    ...typography.bodySmall,
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
    color: '#FFFFFF',
    ...typography.button,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  areaCard: {
    backgroundColor: colors.warmIvory, // Solid warm ivory card background
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  areaBadge: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  areaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  areaName: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.deepMaroon,
    flex: 1,
  },
  assignedAdminBox: {
    backgroundColor: '#FFFFFF', // Solid white sub-card for assigned administrator
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  assignedAdminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignedAdminLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  adminHighlight: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  adminContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 6,
    paddingLeft: 22,
  },
  adminContactText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  archiveButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.saffronDark,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  archiveButtonDisabled: {
    borderColor: colors.disabled,
  },
  archiveButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.saffronDark,
  },
  archiveButtonTextDisabled: {
    color: colors.disabled,
  },
  emptyCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
