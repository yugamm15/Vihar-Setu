import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import {
  MapPinIcon,
  ShieldIcon,
  UserIcon,
  CheckCircleIcon,
  PhoneIcon,
} from '../../../shared/components/CustomSvgIcons';
import { superAdminAreaService } from '../services/superAdminAreaService';

export const SuperAdminAreaManagementScreen = ({ navigation }) => {
  const [areas, setAreas] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Area form
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCity, setNewAreaCity] = useState('Surat');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg('');
    try {
      const [{ data: areasData }, { data: adminsData }] = await Promise.all([
        superAdminAreaService.listAreas(),
        superAdminAreaService.listAdministrators(),
      ]);

      setAreas(areasData || []);
      setAdmins(adminsData || []);
    } catch (e) {
      console.warn('[AreaManagementScreen] Load error:', e);
      setErrorMsg('Failed to load area data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateArea = async () => {
    if (!newAreaName.trim()) {
      setErrorMsg('Area / Sector Name is compulsory.');
      return;
    }
    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: areaData, error } = await superAdminAreaService.createArea(
        newAreaName.trim(),
        newAreaCity.trim() || 'Surat'
      );

      if (error || !areaData) {
        setErrorMsg(error?.message || 'Failed to create area. It may already exist.');
        setIsCreating(false);
        return;
      }

      const createdArea = areaData;

      // Assign administrator & promote Sevak if phone/email provided
      if (adminPhone.trim() || adminEmail.trim()) {
        const assignResult = await superAdminAreaService.assignAdministratorToArea({
          areaId: createdArea.id,
          areaName: createdArea.name,
          adminName: adminName.trim(),
          adminPhone: adminPhone.trim(),
          adminEmail: adminEmail.trim(),
        });

        if (assignResult.promoted && assignResult.matchedProfile) {
          setSuccessMsg(
            `Area "${createdArea.name}" created! Sevak "${assignResult.matchedProfile.full_name}" has been promoted to Administrator and notified in their app to switch to Admin mode.`
          );
        } else {
          setSuccessMsg(`Area "${createdArea.name}" created successfully.`);
        }
      } else {
        setSuccessMsg(`Area "${createdArea.name}" created successfully.`);
      }

      setNewAreaName('');
      setAdminName('');
      setAdminPhone('');
      setAdminEmail('');
      setShowAddForm(false);
      loadData(true);
    } catch (e) {
      setErrorMsg(e.message || 'Error creating area.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleArchive = (area) => {
    const actionText = area.is_active ? 'Archive' : 'Restore';
    Alert.alert(
      `${actionText} Area`,
      `Are you sure you want to ${actionText.toLowerCase()} operational area "${area.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: area.is_active ? 'destructive' : 'default',
          onPress: async () => {
            const response = await superAdminAreaService.updateArea(
              area.id,
              area.name,
              area.city,
              area.state,
              !area.is_active
            );
            if (response.error) {
              setErrorMsg(response.error.message);
            } else {
              setSuccessMsg(`Area "${area.name}" updated successfully.`);
              loadData(true);
            }
          },
        },
      ]
    );
  };

  const activeAreasCount = areas.filter((a) => a.is_active).length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Area Management"
        subtitle={`Jurisdictions & Sectors · ${activeAreasCount} Active`}
        showLogo
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.saffron}
          />
        }
      >
        {/* Governance Scope Banner */}
        <View style={[styles.banner, shadows.card]}>
          <View style={styles.bannerIcon}>
            <ShieldIcon size={22} color={colors.gold} />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Regional Jurisdiction Control</Text>
            <Text style={styles.bannerText}>
              Administrators are strictly contained to monitor Vihars and Sevikas within their assigned geographical area boundary.
            </Text>
          </View>
        </View>

        {/* Quick Metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, shadows.card]}>
            <Text style={styles.metricValue}>{areas.length}</Text>
            <Text style={styles.metricLabel}>Total Areas</Text>
          </View>
          <View style={[styles.metricCard, shadows.card]}>
            <Text style={[styles.metricValue, { color: colors.statusSafe }]}>{activeAreasCount}</Text>
            <Text style={styles.metricLabel}>Active Hubs</Text>
          </View>
          <View style={[styles.metricCard, shadows.card]}>
            <Text style={[styles.metricValue, { color: colors.saffronDark }]}>{admins.length}</Text>
            <Text style={styles.metricLabel}>Assigned Admins</Text>
          </View>
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

        {/* Action Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Operational Sectors ({areas.length})</Text>
          <TouchableOpacity
            onPress={() => setShowAddForm(!showAddForm)}
            style={styles.addAreaBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.addAreaBtnText}>
              {showAddForm ? '✕ Close Form' : '+ Add New Area'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Area Form */}
        {showAddForm && (
          <View style={[styles.addAreaCard, shadows.card]}>
            <Text style={styles.formSectionHeader}>New Area Jurisdiction</Text>

            <Text style={styles.formLabel}>Area / Sector Name *</Text>
            <TextInput
              style={styles.input}
              value={newAreaName}
              onChangeText={setNewAreaName}
              placeholder="e.g. Vesu & City Light, Adajan & Pal"
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
              Designated Area Administrator
            </Text>
            <Text style={styles.formHint}>
              💡 Tip: Enter the Mobile Number or Email of an existing Sevak. They will automatically be granted the Administrator role, receive an in-app promotion notification, and see the "Switch to Admin" option.
            </Text>

            <Text style={styles.formLabel}>Admin Full Name (Optional)</Text>
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
              placeholder="e.g. 9876543210 (10 digits)"
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
                <ActivityIndicator color={colors.warmIvory} size="small" />
              ) : (
                <Text style={styles.submitAreaBtnText}>Create Area & Link Administrator</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Areas List */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Loading operational areas...</Text>
          </View>
        ) : areas.length === 0 ? (
          <View style={styles.emptyCard}>
            <MapPinIcon size={44} color={colors.cardBorder} />
            <Text style={styles.emptyTitle}>No Operational Areas Found</Text>
            <Text style={styles.emptySubtitle}>
              Tap "+ Add New Area" above to create regional jurisdictions for Surat.
            </Text>
          </View>
        ) : (
          areas.map((area) => {
            const areaAdmins = admins.filter((a) => a.area_id === area.id);

            return (
              <View key={area.id} style={[styles.areaCard, shadows.card]}>
                <View style={styles.areaHeader}>
                  <View style={styles.areaInfoLeft}>
                    <View style={styles.pinCircle}>
                      <MapPinIcon size={18} color={colors.saffron} />
                    </View>
                    <View>
                      <Text style={styles.areaName}>{area.name}</Text>
                      <Text style={styles.areaCity}>
                        {area.city}, {area.state || 'Gujarat'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      area.is_active ? styles.statusPillActive : styles.statusPillArchived,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        area.is_active ? styles.statusPillTextActive : styles.statusPillTextArchived,
                      ]}
                    >
                      {area.is_active ? 'ACTIVE' : 'ARCHIVED'}
                    </Text>
                  </View>
                </View>

                {/* Assigned Admins */}
                <View style={styles.adminsSection}>
                  <View style={styles.adminSectionHeader}>
                    <UserIcon size={14} color={colors.textSecondary} />
                    <Text style={styles.adminsSectionTitle}>
                      Assigned Administrators ({areaAdmins.length})
                    </Text>
                  </View>

                  {areaAdmins.length === 0 ? (
                    <Text style={styles.noAdminText}>
                      No designated administrator. Super Admin oversees this sector.
                    </Text>
                  ) : (
                    areaAdmins.map((adm) => (
                      <View key={adm.id} style={styles.adminRow}>
                        <View style={styles.adminAvatar}>
                          <Text style={styles.adminAvatarText}>
                            {(adm.profiles?.full_name || 'A').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.adminInfo}>
                          <Text style={styles.adminName}>
                            {adm.profiles?.full_name || 'Administrator'}
                          </Text>
                          <Text style={styles.adminContact}>
                            {adm.profiles?.phone || adm.profiles?.email || '—'}
                          </Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                          <CheckCircleIcon size={12} color={colors.statusSafe} />
                          <Text style={styles.verifiedBadgeText}>ASSIGNED</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Archive / Restore Button */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[
                      styles.archiveButton,
                      !area.is_active && styles.restoreButton,
                    ]}
                    onPress={() => handleToggleArchive(area)}
                  >
                    <Text
                      style={[
                        styles.archiveButtonText,
                        !area.is_active && styles.restoreButtonText,
                      ]}
                    >
                      {area.is_active ? 'Archive Area' : 'Restore Area'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '800',
  },
  bannerText: {
    ...typography.caption,
    color: colors.goldMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricValue: {
    ...typography.h3,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.statusEmergency,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.statusEmergency,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderColor: colors.statusSafe,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: {
    ...typography.caption,
    color: colors.statusSafe,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  addAreaBtn: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addAreaBtnText: {
    ...typography.bodySmall,
    color: colors.warmIvory,
    fontWeight: '700',
  },
  addAreaCard: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formSectionHeader: {
    ...typography.bodySmall,
    color: colors.deepMaroon,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  formHint: {
    ...typography.caption,
    color: colors.saffronDark,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  formLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  submitAreaBtn: {
    backgroundColor: colors.saffron,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitAreaBtnText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  loadingBox: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.body,
    color: colors.deepMaroon,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  areaCard: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  areaInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  areaName: {
    ...typography.bodySmall,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  areaCity: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  statusPillActive: {
    backgroundColor: '#E8F5E9',
  },
  statusPillArchived: {
    backgroundColor: '#ECEFF1',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPillTextActive: {
    color: colors.statusSafe,
  },
  statusPillTextArchived: {
    color: colors.textSecondary,
  },
  adminsSection: {
    paddingVertical: spacing.sm,
  },
  adminSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  adminsSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  noAdminText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginLeft: spacing.md,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  adminAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  adminAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  adminContact: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: colors.statusSafe,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.xs,
  },
  archiveButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    backgroundColor: '#FFEBEE',
  },
  restoreButton: {
    backgroundColor: '#E8F5E9',
  },
  archiveButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.statusEmergency,
  },
  restoreButtonText: {
    color: colors.statusSafe,
  },
});
