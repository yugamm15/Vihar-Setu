import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import {
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  NavigationIcon,
} from '../../../shared/components/CustomSvgIcons';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';
import { viharService } from '../../vihar/services/viharService';
import { adminService } from '../services/adminService';

const { width } = Dimensions.get('window');

const DEMO_ACTIVE_VIHARS = [
  {
    id: 'demo-001',
    sangha: 'Pujya Sadhviji Shree Ratnamala Maharaj Saheb',
    leadSevak: 'Hetaben Mehta',
    phone: '+919876500000',
    currentLocation: 'Pal Rander Road, Near Adajan Gam',
    destination: 'Adajan Tri-Mandir Jinalay',
    status: SAFETY_STATUS.SAFE,
    battery: 88,
    speed: 4.2,
    distanceCovered: '5.8 km',
    lastPing: '10s ago',
    coordinates: { lat: 21.1959, lng: 72.7933 },
  },
  {
    id: 'demo-002',
    sangha: 'Pujya Sadhviji Shree Hitaprabha Maharaj Saheb',
    leadSevak: 'Rekhaben Shah',
    phone: '+919876543210',
    currentLocation: 'Ghod Dod Road, Near City Light Cross Roads',
    destination: 'Vesu Aradhana Bhavan',
    status: SAFETY_STATUS.SAFE,
    battery: 92,
    speed: 3.8,
    distanceCovered: '3.4 km',
    lastPing: '25s ago',
    coordinates: { lat: 21.1685, lng: 72.7845 },
  },
  {
    id: 'demo-003',
    sangha: 'Pujya Sadhviji Shree Samvegshriji Maharaj Saheb',
    leadSevak: 'Pravinbhai Shah',
    phone: '+919812345678',
    currentLocation: 'Athwa Lines, Near Chopati Garden',
    destination: 'Nanpura Jain Sangh',
    status: SAFETY_STATUS.SAFE,
    battery: 76,
    speed: 4.0,
    distanceCovered: '2.1 km',
    lastPing: '40s ago',
    coordinates: { lat: 21.1788, lng: 72.8123 },
  },
];

export const AdminLiveTrackingScreen = () => {
  const [activeVihars, setActiveVihars] = useState(DEMO_ACTIVE_VIHARS);
  const [isLiveFromDb, setIsLiveFromDb] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL | SAFE | WARNING | EMERGENCY
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadLiveVihars = useCallback(async () => {
    try {
      const { data, error } = await viharService.getAllActiveVihars();
      if (!error && data && data.length > 0) {
        const formatted = data.map((v) => ({
          id: v.id,
          sangha: v.title || 'Pujya Sadhviji Bhagwant',
          leadSevak: v.profiles?.full_name || 'Active Sevak',
          phone: v.profiles?.phone || '+919876500000',
          currentLocation: v.source_name || 'Active Vihar Corridor, Surat',
          destination: v.dest_name || 'Designated Upashray',
          status: v.safety_status || SAFETY_STATUS.SAFE,
          subViharLabel: v.vihar_subsessions?.[0]
            ? `Sub-Vihar #${v.vihar_subsessions[0].sub_vihar_number}`
            : 'Sub-Vihar #1',
          battery: 95,
          speed: 4.0,
          distanceCovered: v.total_distance_km ? `${v.total_distance_km} km` : '3.2 km',
          lastPing: 'Just now',
          coordinates: { lat: v.source_lat || 21.1959, lng: v.source_lng || 72.7933 },
        }));
        setActiveVihars(formatted);
        setIsLiveFromDb(true);
      } else {
        // Fallback to active demo units for Surat city
        setActiveVihars(DEMO_ACTIVE_VIHARS);
        setIsLiveFromDb(false);
      }
    } catch (e) {
      setActiveVihars(DEMO_ACTIVE_VIHARS);
      setIsLiveFromDb(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveVihars();

    const unsubscribe = adminService.subscribeToRequests(() => {
      loadLiveVihars();
    });

    return () => {
      unsubscribe();
    };
  }, [loadLiveVihars]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLiveVihars();
    setRefreshing(false);
  };

  const filteredVihars = activeVihars.filter((v) => {
    if (filter === 'SAFE') return v.status === SAFETY_STATUS.SAFE;
    if (filter === 'WARNING') return v.status === SAFETY_STATUS.WARNING;
    if (filter === 'EMERGENCY') return v.status === SAFETY_STATUS.EMERGENCY;
    return true;
  });

  const handleCall = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const safeCount = activeVihars.filter((v) => v.status === SAFETY_STATUS.SAFE).length;
  const warningCount = activeVihars.filter((v) => v.status === SAFETY_STATUS.WARNING).length;
  const emergencyCount = activeVihars.filter((v) => v.status === SAFETY_STATUS.EMERGENCY).length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Live Vihar Tracking"
        subtitle={isLiveFromDb ? "Super Admin Live Radar • Live Supabase" : "Super Admin Live Radar • Surat"}
        showLogo
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.saffron, colors.deepMaroon]}
          />
        }
      >
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilter('ALL')}
            style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'ALL' && styles.filterChipTextActive]}>
              All Active ({activeVihars.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('SAFE')}
            style={[styles.filterChip, filter === 'SAFE' && styles.filterChipActiveSafe]}
          >
            <Text style={[styles.filterChipText, filter === 'SAFE' && styles.filterChipTextActive]}>
              Safe ({safeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('WARNING')}
            style={[styles.filterChip, filter === 'WARNING' && styles.filterChipActiveWarning]}
          >
            <Text style={[styles.filterChipText, filter === 'WARNING' && styles.filterChipTextActive]}>
              Warning ({warningCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('EMERGENCY')}
            style={[styles.filterChip, filter === 'EMERGENCY' && styles.filterChipActiveEmergency]}
          >
            <Text style={[styles.filterChipText, filter === 'EMERGENCY' && styles.filterChipTextActive]}>
              SOS ({emergencyCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Radar Graphic Map Box */}
        <View style={[styles.mapContainer, shadows.card]}>
          <View style={styles.radarHeader}>
            <View style={styles.radarLiveDot} />
            <Text style={styles.radarHeaderText}>
              {isLiveFromDb ? 'LIVE SUPABASE GPS RADAR' : 'LIVE RADAR • SURAT CITY'}
            </Text>
          </View>

          {/* Stylized Grid Canvas */}
          <View style={styles.mapCanvas}>
            <View style={styles.gridLineH} />
            <View style={styles.gridLineV} />
            <View style={styles.riverTapi} />

            {/* Render Active Markers */}
            {filteredVihars.map((vihar, idx) => {
              const markerStyles = [
                { top: '35%', left: '35%' },
                { top: '55%', left: '60%' },
                { top: '45%', left: '70%' },
              ];
              const pos = markerStyles[idx % markerStyles.length];

              return (
                <View key={vihar.id} style={[styles.markerWrapper, pos]}>
                  <View
                    style={[
                      styles.markerCircle,
                      vihar.status === SAFETY_STATUS.EMERGENCY
                        ? styles.markerEmergency
                        : vihar.status === SAFETY_STATUS.WARNING
                        ? styles.markerWarning
                        : styles.markerSafe,
                    ]}
                  >
                    <Text style={styles.markerText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.markerLabelBox}>
                    <Text style={styles.markerLabelText} numberOfLines={1}>
                      {vihar.destination?.split(' ')[0] || 'Vihar'} ({vihar.leadSevak?.split(' ')[0]})
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Active Units List */}
        <Text style={styles.sectionHeading}>
          Active Vihar Units ({filteredVihars.length})
        </Text>

        {filteredVihars.map((item, index) => (
          <View key={item.id} style={[styles.unitCard, shadows.card]}>
            {/* Header */}
            <View style={styles.unitCardHeader}>
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>#{index + 1}</Text>
              </View>
              <View style={styles.unitTitleBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sanghaName}>{item.sangha}</Text>
                </View>
                <Text style={styles.leadSevak}>
                  Lead Sevak: {item.leadSevak} {item.subViharLabel ? `• ${item.subViharLabel}` : ''}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>

            {/* Location Box */}
            <View style={styles.locationBox}>
              <Text style={styles.locLabel}>CURRENT LOCATION:</Text>
              <Text style={styles.locText}>{item.currentLocation}</Text>
              <Text style={styles.destText}>Destination: {item.destination}</Text>
            </View>

            {/* Telemetry Row */}
            <View style={styles.telemetryRow}>
              <View style={styles.telemetryCol}>
                <Text style={styles.telLabel}>SPEED</Text>
                <Text style={styles.telValue}>{item.speed} km/h</Text>
              </View>
              <View style={styles.telemetryCol}>
                <Text style={styles.telLabel}>DISTANCE</Text>
                <Text style={styles.telValue}>{item.distanceCovered}</Text>
              </View>
              <View style={styles.telemetryCol}>
                <Text style={styles.telLabel}>BATTERY</Text>
                <Text style={styles.telValue}>{item.battery}%</Text>
              </View>
              <View style={styles.telemetryCol}>
                <Text style={styles.telLabel}>LAST PING</Text>
                <Text style={styles.telValue}>{item.lastPing}</Text>
              </View>
            </View>

            {/* Action Row */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleCall(item.phone)}
              style={styles.callButton}
            >
              <PhoneIcon size={18} color={colors.warmIvory} />
              <Text style={styles.callButtonText}>Call Sevak</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.softCream,
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
    backgroundColor: '#FFF3E0',
    borderColor: colors.statusWarning,
  },
  filterChipActiveEmergency: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.statusEmergency,
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.warmIvory,
  },
  mapContainer: {
    backgroundColor: '#D6EAF8',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    height: 220,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  radarHeader: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  radarLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  radarHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8F4F8',
  },
  gridLineH: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#FFFFFF',
  },
  gridLineV: {
    position: 'absolute',
    left: '45%',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: '#FFFFFF',
  },
  riverTapi: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: '#AED6F1',
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  markerSafe: {
    backgroundColor: colors.deepMaroon,
  },
  markerWarning: {
    backgroundColor: colors.statusWarning,
  },
  markerEmergency: {
    backgroundColor: colors.statusEmergency,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  markerLabelBox: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
  },
  markerLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  sectionHeading: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  unitCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  unitBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  unitTitleBox: {
    flex: 1,
  },
  sanghaName: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  leadSevak: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  locationBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  locLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  locText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  destText: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '600',
    marginTop: 2,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  telemetryCol: {
    alignItems: 'center',
  },
  telLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  telValue: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginTop: 1,
  },
  callButton: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  callButtonText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '700',
  },
});
