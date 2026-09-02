import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import { CustomTextInput } from '../../../shared/components/CustomTextInput';
import {
  UserIcon,
  PhoneIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../../shared/components/CustomSvgIcons';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { t } from '../../../core/localization/i18n';

export const AdminRequestsScreen = ({ navigation }) => {
  const { profile: adminProfile } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('PENDING'); // PENDING | ACTIVE | REJECTED | ALL
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom Feedback Modal (Replaces dark system alert)
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'SUCCESS', // SUCCESS | INFO | ERROR
  });

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    const { data } = await adminService.fetchAllRequests(activeFilter);
    setRequests(data || []);
    setIsLoading(false);
  }, [activeFilter]);

  useEffect(() => {
    loadRequests();

    // Subscribe to Realtime requests updates
    const unsubscribe = adminService.subscribeToRequests(() => {
      loadRequests();
    });

    return () => {
      unsubscribe();
    };
  }, [loadRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleOpenDetails = (item) => {
    setSelectedRequest(item);
    setDetailsModalVisible(true);
  };

  const handleApprove = async (item) => {
    const userToApprove = item || selectedRequest;
    if (!userToApprove) return;

    setIsProcessing(true);
    const { error } = await adminService.approveRequest(
      userToApprove.id,
      adminProfile?.full_name || 'Administrator'
    );
    setIsProcessing(false);

    if (!error) {
      setDetailsModalVisible(false);
      setFeedbackModal({
        visible: true,
        title: 'Request Approved!',
        message: `${userToApprove.full_name || 'Sevak'} has been verified and granted full access to Vihar Setu.`,
        type: 'SUCCESS',
      });
      loadRequests();
    } else {
      setFeedbackModal({
        visible: true,
        title: 'Approval Failed',
        message: 'Could not approve request. Please check connection and try again.',
        type: 'ERROR',
      });
    }
  };

  const handleOpenRejectModal = (item) => {
    setSelectedRequest(item || selectedRequest);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    const { error } = await adminService.rejectRequest(
      selectedRequest.id,
      rejectionReason,
      adminProfile?.full_name || 'Administrator'
    );
    setIsProcessing(false);

    if (!error) {
      setRejectModalVisible(false);
      setDetailsModalVisible(false);
      setFeedbackModal({
        visible: true,
        title: 'Request Rejected',
        message: `Registration application for ${selectedRequest.full_name || 'Sevak'} has been rejected.`,
        type: 'INFO',
      });
      loadRequests();
    } else {
      setFeedbackModal({
        visible: true,
        title: 'Rejection Failed',
        message: 'Could not reject request. Please check connection and try again.',
        type: 'ERROR',
      });
    }
  };

  const handleCallUser = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
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

  // Filter requests by search query
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = r.full_name?.toLowerCase().includes(query);
    const phoneMatch = r.phone?.toLowerCase().includes(query);
    const areaMatch = r.area?.toLowerCase().includes(query);
    const emailMatch = r.email?.toLowerCase().includes(query);
    return nameMatch || phoneMatch || areaMatch || emailMatch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* Header */}
      <AppHeader
        title="Sevak Requests"
        subtitle="Super Admin Verification & Approval"
        showLogo
      />

      {/* Top Search & Filter Bar */}
      <View style={styles.topControlContainer}>
        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search by name, phone, area..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillRow}>
          <TouchableOpacity
            onPress={() => setActiveFilter('PENDING')}
            style={[
              styles.filterPill,
              activeFilter === 'PENDING' && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'PENDING' && styles.filterPillTextActive,
              ]}
            >
              Pending {pendingCount > 0 ? `(${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('ACTIVE')}
            style={[
              styles.filterPill,
              activeFilter === 'ACTIVE' && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'ACTIVE' && styles.filterPillTextActive,
              ]}
            >
              Approved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('REJECTED')}
            style={[
              styles.filterPill,
              activeFilter === 'REJECTED' && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'REJECTED' && styles.filterPillTextActive,
              ]}
            >
              Rejected
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('ALL')}
            style={[
              styles.filterPill,
              activeFilter === 'ALL' && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'ALL' && styles.filterPillTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Requests List Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.saffron]}
          />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.saffron} />
            <Text style={styles.loadingText}>Fetching registrations from Supabase...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Requests Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No registrations match your search keyword.'
                : `There are currently no ${activeFilter.toLowerCase()} Sevak registration requests.`}
            </Text>
          </View>
        ) : (
          filteredRequests.map((item) => {
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'ACTIVE';
            const isRejected = item.status === 'REJECTED';

            return (
              <View
                key={item.id}
                style={[
                  styles.requestCard,
                  isPending ? styles.requestCardPending : null,
                  shadows.card,
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatarGlow}>
                    <View style={styles.avatarCircle}>
                      <UserIcon size={24} color={colors.warmIvory} />
                    </View>
                  </View>

                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.userName}>{item.full_name || 'New Sevak'}</Text>
                    <Text style={styles.userSub}>{item.email}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isPending
                        ? styles.badgeAmber
                        : isApproved
                        ? styles.badgeGreen
                        : styles.badgeRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isPending
                          ? styles.badgeTextAmber
                          : isApproved
                          ? styles.badgeTextGreen
                          : styles.badgeTextRed,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.cardDetailsBox}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Mobile Number</Text>
                    <TouchableOpacity
                      onPress={() => handleCallUser(item.phone)}
                      style={styles.clickablePhone}
                    >
                      <Text style={styles.phoneValue}>📞 {item.phone || '—'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Location (City & Area)</Text>
                    <Text style={styles.detailValue}>
                      📍 {item.area ? `${item.area}, ` : ''}{item.city || 'Surat'}
                    </Text>
                  </View>

                  <View style={styles.detailItemHalf}>
                    <Text style={styles.detailLabel}>Age</Text>
                    <Text style={styles.detailValue}>
                      {item.age ? `${item.age} yrs` : '—'}
                    </Text>
                  </View>

                  <View style={styles.detailItemHalf}>
                    <Text style={styles.detailLabel}>Blood Group</Text>
                    <Text style={[styles.detailValue, styles.bloodText]}>
                      🩸 {item.blood_group || '—'}
                    </Text>
                  </View>

                  <View style={styles.detailItemFull}>
                    <Text style={styles.detailLabel}>Submitted On</Text>
                    <Text style={styles.detailValueMuted}>
                      🕒 {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleOpenDetails(item)}
                    style={styles.viewDetailsBtn}
                  >
                    <Text style={styles.viewDetailsText}>👁️ View Details</Text>
                  </TouchableOpacity>

                  {isPending && (
                    <View style={styles.pendingActionBtns}>
                      <TouchableOpacity
                        onPress={() => handleOpenRejectModal(item)}
                        style={styles.rejectMiniBtn}
                      >
                        <Text style={styles.rejectMiniText}>✕ Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleApprove(item)}
                        style={styles.approveMiniBtn}
                      >
                        <Text style={styles.approveMiniText}>✓ Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FULL USER DETAILS VERIFICATION MODAL */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sevak Verification</Text>
                <Text style={styles.modalSub}>
                  Review profile information before granting access
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Profile Header Box */}
                <View style={styles.modalProfileBox}>
                  <View style={styles.modalAvatar}>
                    <UserIcon size={36} color={colors.warmIvory} />
                  </View>
                  <Text style={styles.modalName}>{selectedRequest.full_name || 'Sevak'}</Text>
                  <Text style={styles.modalEmail}>{selectedRequest.email}</Text>
                  <View style={styles.modalStatusPill}>
                    <Text style={styles.modalStatusText}>
                      STATUS: {selectedRequest.status}
                    </Text>
                  </View>
                </View>

                {/* Full Details List */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalSectionTitle}>Personal Information</Text>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Full Name:</Text>
                    <Text style={styles.modalRowValue}>{selectedRequest.full_name}</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Email Address:</Text>
                    <Text style={styles.modalRowValue}>{selectedRequest.email}</Text>
                  </View>
                  <View style={styles.divider} />

                  <TouchableOpacity
                    onPress={() => handleCallUser(selectedRequest.phone)}
                    style={styles.modalRowClickable}
                  >
                    <Text style={styles.modalRowLabel}>Mobile Number:</Text>
                    <Text style={styles.modalRowPhone}>📞 {selectedRequest.phone}</Text>
                  </TouchableOpacity>
                  <View style={styles.divider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Age:</Text>
                    <Text style={styles.modalRowValue}>
                      {selectedRequest.age ? `${selectedRequest.age} years old` : '—'}
                    </Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>City:</Text>
                    <Text style={styles.modalRowValue}>{selectedRequest.city || 'Surat'}</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Area / Locality:</Text>
                    <Text style={styles.modalRowValue}>{selectedRequest.area || '—'}</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Blood Group:</Text>
                    <View style={styles.bloodPill}>
                      <Text style={styles.bloodPillText}>
                        {selectedRequest.blood_group || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Preferred Language:</Text>
                    <Text style={styles.modalRowValue}>
                      {selectedRequest.preferred_language?.toUpperCase() || 'GU'}
                    </Text>
                  </View>
                </View>

                {/* Emergency Contact Section */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalSectionTitle}>Emergency Contact</Text>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Contact Person:</Text>
                    <Text style={styles.modalRowValue}>
                      {selectedRequest.emergency_contact_name || '—'}
                    </Text>
                  </View>
                  <View style={styles.divider} />

                  <TouchableOpacity
                    onPress={() =>
                      handleCallUser(selectedRequest.emergency_contact_phone)
                    }
                    style={styles.modalRowClickable}
                  >
                    <Text style={styles.modalRowLabel}>Emergency Phone:</Text>
                    <Text style={styles.modalRowPhone}>
                      📞 {selectedRequest.emergency_contact_phone || '—'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Action Footer */}
                {selectedRequest.status === 'PENDING' ? (
                  <View style={styles.modalActionRow}>
                    <SecondaryButton
                      title="✕ Reject"
                      onPress={() => handleOpenRejectModal(selectedRequest)}
                      style={styles.modalRejectBtn}
                      textStyle={styles.rejectBtnText}
                    />
                    <PrimaryButton
                      title="✓ Approve"
                      onPress={() => handleApprove(selectedRequest)}
                      variant="saffron"
                      loading={isProcessing}
                      style={styles.modalApproveBtn}
                      textStyle={styles.approveBtnText}
                    />
                  </View>
                ) : (
                  <View style={styles.modalCompletedBanner}>
                    <Text style={styles.modalCompletedText}>
                      This profile is already {selectedRequest.status}.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.rejectCard, shadows.elevated]}>
            <Text style={styles.rejectModalTitle}>Reject Sevak Registration</Text>
            <Text style={styles.rejectModalSubtitle}>
              Specify an optional rejection note for {selectedRequest?.full_name || 'the applicant'}:
            </Text>

            <CustomTextInput
              label="Rejection Reason"
              placeholder="e.g. Incomplete details, invalid contact number..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.rejectBtnRow}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setRejectModalVisible(false)}
                style={styles.rejectBtnHalf}
              />
              <PrimaryButton
                title="Confirm Reject"
                onPress={handleConfirmReject}
                variant="primary"
                loading={isProcessing}
                style={styles.rejectBtnHalf}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM SUCCESS / FEEDBACK MODAL (Replaces black native dialog) */}
      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.feedbackCard, shadows.elevated]}>
            <View
              style={[
                styles.feedbackIconCircle,
                feedbackModal.type === 'SUCCESS'
                  ? styles.feedbackSuccessBg
                  : feedbackModal.type === 'ERROR'
                  ? styles.feedbackErrorBg
                  : styles.feedbackInfoBg,
              ]}
            >
              <Text style={styles.feedbackIconText}>
                {feedbackModal.type === 'SUCCESS'
                  ? '🎉'
                  : feedbackModal.type === 'ERROR'
                  ? '❌'
                  : 'ℹ️'}
              </Text>
            </View>

            <Text style={styles.feedbackTitle}>{feedbackModal.title}</Text>
            <Text style={styles.feedbackMsg}>{feedbackModal.message}</Text>

            <PrimaryButton
              title="OK"
              onPress={() => setFeedbackModal((prev) => ({ ...prev, visible: false }))}
              variant="saffron"
              style={styles.feedbackActionBtn}
            />
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
  topControlContainer: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 16,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.saffron,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warmIvory,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  requestCardPending: {
    borderColor: colors.saffron,
    backgroundColor: '#FFFDF9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarGlow: {
    padding: 2,
    borderRadius: 22,
    backgroundColor: colors.goldLight,
    marginRight: spacing.sm,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  userName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  userSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeAmber: {
    backgroundColor: '#FFF3CD',
  },
  badgeGreen: {
    backgroundColor: '#D4EDDA',
  },
  badgeRed: {
    backgroundColor: '#F8D7DA',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeTextAmber: {
    color: '#856404',
  },
  badgeTextGreen: {
    color: '#155724',
  },
  badgeTextRed: {
    color: '#721C24',
  },
  cardDetailsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  detailItem: {
    width: '100%',
    marginVertical: 3,
  },
  detailItemHalf: {
    width: '50%',
    marginVertical: 3,
  },
  detailItemFull: {
    width: '100%',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 4,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  detailValueMuted: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  phoneValue: {
    ...typography.bodySmall,
    color: colors.saffronDark,
    fontWeight: '700',
  },
  bloodText: {
    color: colors.statusEmergency,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  viewDetailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  viewDetailsText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  pendingActionBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rejectMiniBtn: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: 'rgba(189, 44, 44, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  rejectMiniText: {
    ...typography.caption,
    color: colors.statusEmergency,
    fontWeight: '700',
  },
  approveMiniBtn: {
    backgroundColor: colors.saffron,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  approveMiniText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* DETAILS MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
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
  closeBtnText: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalScroll: {
    paddingBottom: spacing.xxl,
  },
  modalProfileBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.deepMaroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  modalName: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  modalEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalStatusPill: {
    marginTop: spacing.xs,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.saffron,
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.saffronDark,
  },
  modalSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  modalRowClickable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
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
  modalRowPhone: {
    ...typography.bodySmall,
    color: colors.saffronDark,
    fontWeight: '700',
  },
  bloodPill: {
    backgroundColor: 'rgba(189, 44, 44, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  bloodPillText: {
    ...typography.caption,
    color: colors.statusEmergency,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  modalRejectBtn: {
    flex: 1,
    height: 48,
    marginVertical: 0,
    borderColor: 'rgba(189, 44, 44, 0.3)',
    backgroundColor: '#FFF8F8',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApproveBtn: {
    flex: 1,
    height: 48,
    marginVertical: 0,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: colors.statusEmergency,
    fontWeight: '700',
    fontSize: 14,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalCompletedBanner: {
    backgroundColor: colors.softCream,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalCompletedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  /* REJECT MODAL */
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  rejectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
  },
  rejectModalTitle: {
    ...typography.h3,
    color: colors.statusEmergency,
    marginBottom: spacing.xs,
  },
  rejectModalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  rejectBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  rejectBtnHalf: {
    flex: 1,
    height: 48,
    marginVertical: 0,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* CUSTOM FEEDBACK MODAL */
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  feedbackIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  feedbackSuccessBg: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: colors.statusSafe,
  },
  feedbackErrorBg: {
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: colors.statusEmergency,
  },
  feedbackInfoBg: {
    backgroundColor: '#FFF8E7',
    borderWidth: 2,
    borderColor: colors.saffron,
  },
  feedbackIconText: {
    fontSize: 28,
  },
  feedbackTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  feedbackMsg: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  feedbackActionBtn: {
    width: '100%',
  },
});
