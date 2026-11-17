import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import {
  SearchIcon,
  CloseIcon,
  AlertTriangleIcon,
  ShieldIcon,
  NavigationIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAdminLiveStore } from '../hooks/useAdminLiveStore';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { AdminLiveMap } from '../components/AdminLiveMap';
import { AdminLiveBottomSheet } from '../components/AdminLiveBottomSheet';
import { AdminCallActionModal } from '../components/AdminCallActionModal';
import { t } from '../../../core/localization/i18n';

export const AdminLiveTrackingScreen = ({ navigation }) => {
  const { profile } = useAuthStore();
  const {
    areaName,
    activeVihars,
    selectedViharId,
    statusFilter,
    searchQuery,
    connectionState,
    isLoading,
    isRefreshing,
    init,
    cleanup,
    refresh,
    setSelectedViharId,
    setStatusFilter,
    setSearchQuery,
    getFilteredVihars,
    getEmergencyVihar,
  } = useAdminLiveStore();

  const [callModalVisible, setCallModalVisible] = useState(false);
  const [activeCallVihar, setActiveCallVihar] = useState(null);

  // Initialize store on mount and cleanup on unmount
  useEffect(() => {
    init();
    return () => {
      cleanup();
    };
  }, []);

  const filteredVihars = useMemo(() => getFilteredVihars(), [activeVihars, statusFilter, searchQuery]);
  const emergencyVihar = useMemo(() => getEmergencyVihar(), [activeVihars]);

  const selectedVihar = useMemo(() => {
    if (!selectedViharId) return null;
    return activeVihars.find((v) => v.vihar_id === selectedViharId) || null;
  }, [activeVihars, selectedViharId]);

  // Status counts for floating filter chips
  const counts = useMemo(() => {
    let safe = 0, warning = 0, emergency = 0, offline = 0, onHold = 0;
    activeVihars.forEach((v) => {
      const st = v.displayStatus || v.status;
      if (st === 'SAFE') safe++;
      else if (st === 'WARNING') warning++;
      else if (st === 'EMERGENCY') emergency++;
      else if (st === 'OFFLINE') offline++;
      else if (st === 'ON_HOLD') onHold++;
    });
    return {
      all: activeVihars.length,
      safe,
      warning,
      emergency,
      offline,
      onHold,
    };
  }, [activeVihars]);

  const handleOpenDetail = (vihar) => {
    if (!vihar) return;
    navigation.navigate('AdminLiveDetailScreen', {
      viharId: vihar.vihar_id,
      title: vihar.title || 'Vihar Live Detail',
    });
  };

  const handleOpenCallModal = (vihar) => {
    setActiveCallVihar(vihar);
    setCallModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* Screen Header */}
      <AppHeader
        title="Live Vihar Radar"
        subtitle={`${areaName} Operational Area`}
        showLogo
        rightElement={
          <View style={styles.connectionBadge}>
            <View
              style={[
                styles.connectionDot,
                {
                  backgroundColor:
                    connectionState === 'LIVE'
                      ? colors.statusSafe
                      : connectionState === 'RECONNECTING'
                      ? colors.statusWarning
                      : colors.statusOffline,
                },
              ]}
            />
            <Text style={styles.connectionText}>
              {connectionState === 'LIVE'
                ? 'LIVE'
                : connectionState === 'RECONNECTING'
                ? 'RECONNECTING'
                : 'OFFLINE'}
            </Text>
          </View>
        }
      />

      {/* High-Priority Emergency Attention Banner */}
      {emergencyVihar && (
        <TouchableOpacity
          style={styles.emergencyBanner}
          activeOpacity={0.85}
          onPress={() => setSelectedViharId(emergencyVihar.vihar_id)}
        >
          <AlertTriangleIcon size={18} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyBannerTitle}>
              CRITICAL EMERGENCY IN PROGRESS
            </Text>
            <Text style={styles.emergencyBannerSub} numberOfLines={1}>
              {emergencyVihar.sevak_name} • {emergencyVihar.dest_name} (Tap to focus)
            </Text>
          </View>
          <Text style={styles.emergencyArrow}>🚨</Text>
        </TouchableOpacity>
      )}

      {/* Floating Top Filter & Search Card */}
      <View style={[styles.floatingFilterCard, shadows.card]}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <SearchIcon size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Sevak, origin, destination..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <CloseIcon size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Row */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.chipText, statusFilter === 'ALL' && styles.chipTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'SAFE' && styles.filterChipActiveSafe]}
            onPress={() => setStatusFilter('SAFE')}
          >
            <Text style={[styles.chipText, statusFilter === 'SAFE' && styles.chipTextActive]}>
              Safe ({counts.safe})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'WARNING' && styles.filterChipActiveWarning]}
            onPress={() => setStatusFilter('WARNING')}
          >
            <Text style={[styles.chipText, statusFilter === 'WARNING' && styles.chipTextActive]}>
              Warning ({counts.warning})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'EMERGENCY' && styles.filterChipActiveEmergency]}
            onPress={() => setStatusFilter('EMERGENCY')}
          >
            <Text style={[styles.chipText, statusFilter === 'EMERGENCY' && styles.chipTextActive]}>
              SOS ({counts.emergency})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ON_HOLD' && styles.filterChipActiveHold]}
            onPress={() => setStatusFilter('ON_HOLD')}
          >
            <Text style={[styles.chipText, statusFilter === 'ON_HOLD' && styles.chipTextActive]}>
              Hold ({counts.onHold})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'OFFLINE' && styles.filterChipActiveOffline]}
            onPress={() => setStatusFilter('OFFLINE')}
          >
            <Text style={[styles.chipText, statusFilter === 'OFFLINE' && styles.chipTextActive]}>
              Offline ({counts.offline})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Map View */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.saffron} />
          <Text style={styles.loadingText}>Connecting to Realtime Vihar Radar...</Text>
        </View>
      ) : (
        <AdminLiveMap
          vihars={filteredVihars}
          selectedViharId={selectedViharId}
          onSelectVihar={(id) => setSelectedViharId(id)}
        />
      )}

      {/* Draggable Bottom Sheet */}
      <AdminLiveBottomSheet
        vihars={filteredVihars}
        selectedVihar={selectedVihar}
        onSelectVihar={(id) => setSelectedViharId(id)}
        onDeselectVihar={() => setSelectedViharId(null)}
        onOpenDetail={handleOpenDetail}
        onOpenCallModal={handleOpenCallModal}
      />

      {/* Call Action Confirmation Modal */}
      <AdminCallActionModal
        visible={callModalVisible}
        onClose={() => setCallModalVisible(false)}
        vihar={activeCallVihar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warmIvory,
    letterSpacing: 0.5,
  },
  emergencyBanner: {
    backgroundColor: colors.statusEmergency,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  emergencyBannerTitle: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  emergencyBannerSub: {
    fontSize: 10,
    color: colors.warmIvory,
    opacity: 0.9,
  },
  emergencyArrow: {
    fontSize: 18,
  },
  floatingFilterCard: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    zIndex: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xs + 2,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    paddingVertical: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  filterChipActiveSafe: {
    backgroundColor: '#E8F5E9',
    borderColor: colors.statusSafe,
  },
  filterChipActiveWarning: {
    backgroundColor: '#FFF8E1',
    borderColor: colors.statusWarning,
  },
  filterChipActiveEmergency: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.statusEmergency,
  },
  filterChipActiveHold: {
    backgroundColor: '#FFF9E6',
    borderColor: colors.deepMaroon,
  },
  filterChipActiveOffline: {
    backgroundColor: '#EEEEEE',
    borderColor: colors.statusOffline,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
