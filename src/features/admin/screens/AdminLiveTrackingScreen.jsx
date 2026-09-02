import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Dimensions,
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

const { width } = Dimensions.get('window');

const ACTIVE_VIHARS = [
  {
    id: 'vihar-001',
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
    id: 'vihar-002',
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
    id: 'vihar-003',
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
  const [filter, setFilter] = useState('ALL'); // ALL | SAFE | WARNING | EMERGENCY

  const filteredVihars = ACTIVE_VIHARS.filter((v) => {
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Live Vihar Tracking"
        subtitle="Super Admin Live Radar • Surat"
        showLogo
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilter('ALL')}
            style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'ALL' && styles.filterChipTextActive]}>
              All Active ({ACTIVE_VIHARS.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('SAFE')}
            style={[styles.filterChip, filter === 'SAFE' && styles.filterChipActiveSafe]}
          >
            <Text style={[styles.filterChipText, filter === 'SAFE' && styles.filterChipTextActive]}>
              ✓ Safe (3)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('WARNING')}
            style={[styles.filterChip, filter === 'WARNING' && styles.filterChipActiveWarning]}
          >
            <Text style={[styles.filterChipText, filter === 'WARNING' && styles.filterChipTextActive]}>
              ⚠️ Warning (0)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('EMERGENCY')}
            style={[styles.filterChip, filter === 'EMERGENCY' && styles.filterChipActiveEmergency]}
          >
            <Text style={[styles.filterChipText, filter === 'EMERGENCY' && styles.filterChipTextActive]}>
              🚨 SOS (0)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Map Visual Mockup */}
        <View style={[styles.mapContainer, shadows.card]}>
          <View style={styles.mapGridBackground}>
            <View style={styles.mapRoadHorizontal} />
            <View style={styles.mapRoadVertical} />
            <View style={styles.mapRiver} />

            {/* Vihar 1 Pin */}
            <View style={[styles.mapPinWrapper, { top: '35%', left: '30%' }]}>
              <View style={styles.pinCircle}>
                <Text style={styles.pinText}>🚶 1</Text>
              </View>
              <View style={styles.pinTag}>
                <Text style={styles.pinTagText}>Adajan (Hetaben)</Text>
              </View>
            </View>

            {/* Vihar 2 Pin */}
            <View style={[styles.mapPinWrapper, { top: '65%', left: '60%' }]}>
              <View style={styles.pinCircle}>
                <Text style={styles.pinText}>🚶 2</Text>
              </View>
              <View style={styles.pinTag}>
                <Text style={styles.pinTagText}>Vesu (Rekhaben)</Text>
              </View>
            </View>

            {/* Vihar 3 Pin */}
            <View style={[styles.mapPinWrapper, { top: '48%', left: '72%' }]}>
              <View style={styles.pinCircle}>
                <Text style={styles.pinText}>🚶 3</Text>
              </View>
              <View style={styles.pinTag}>
                <Text style={styles.pinTagText}>Athwa Lines</Text>
              </View>
            </View>

            {/* Map Overlay Badge */}
            <View style={styles.mapLiveBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.mapLiveText}>LIVE RADAR • SURAT CITY</Text>
            </View>
          </View>
        </View>

        {/* Live Sevak Vihar Cards */}
        <Text style={styles.sectionHeading}>Active Vihar Units ({filteredVihars.length})</Text>

        {filteredVihars.map((vihar, idx) => (
          <View key={vihar.id} style={[styles.viharCard, shadows.card]}>
            <View style={styles.cardTopRow}>
              <View style={styles.indexCircle}>
                <Text style={styles.indexText}>#{idx + 1}</Text>
              </View>

              <View style={styles.viharInfo}>
                <Text style={styles.sanghaName}>{vihar.sangha}</Text>
                <Text style={styles.leadName}>👤 Lead Sevak: {vihar.leadSevak}</Text>
              </View>

              <StatusBadge status={vihar.status} />
            </View>

            <View style={styles.locationBox}>
              <Text style={styles.locLabel}>CURRENT LOCATION:</Text>
              <Text style={styles.locValue}>📍 {vihar.currentLocation}</Text>
              <Text style={styles.destValue}>➔ Destination: {vihar.destination}</Text>
            </View>

            {/* Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Speed</Text>
                <Text style={styles.metricVal}>{vihar.speed} km/h</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricVal}>{vihar.distanceCovered}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Battery</Text>
                <Text style={[styles.metricVal, { color: colors.statusSafe }]}>
                  🔋 {vihar.battery}%
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Last Ping</Text>
                <Text style={styles.metricVal}>{vihar.lastPing}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => handleCall(vihar.phone)}
                style={styles.callBtn}
              >
                <PhoneIcon size={16} color={colors.warmIvory} />
                <Text style={styles.callBtnText}>Call Sevak</Text>
              </TouchableOpacity>
            </View>
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
  },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  filterChipActiveSafe: {
    backgroundColor: colors.statusSafe,
    borderColor: colors.statusSafe,
  },
  filterChipActiveWarning: {
    backgroundColor: colors.statusWarning,
    borderColor: colors.statusWarning,
  },
  filterChipActiveEmergency: {
    backgroundColor: colors.statusEmergency,
    borderColor: colors.statusEmergency,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  mapContainer: {
    height: 220,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
    backgroundColor: '#E5ECF4',
  },
  mapGridBackground: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#DEE8F1',
  },
  mapRoadHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CCD7E2',
  },
  mapRoadVertical: {
    position: 'absolute',
    left: '45%',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CCD7E2',
  },
  mapRiver: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
    backgroundColor: '#BCE0FD',
  },
  mapPinWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.deepMaroon,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: {
    fontSize: 12,
    color: colors.warmIvory,
    fontWeight: '800',
  },
  pinTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pinTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  mapLiveBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 23, 36, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CD964',
  },
  mapLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warmIvory,
    letterSpacing: 0.5,
  },
  sectionHeading: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  viharCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  indexCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.softCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  indexText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  viharInfo: {
    flex: 1,
  },
  sanghaName: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  leadName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  locationBox: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  locLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '800',
  },
  locValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  destValue: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.sm,
    marginVertical: spacing.xs,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metricVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  cardActions: {
    marginTop: spacing.sm,
  },
  callBtn: {
    flexDirection: 'row',
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  callBtnText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '700',
  },
});
