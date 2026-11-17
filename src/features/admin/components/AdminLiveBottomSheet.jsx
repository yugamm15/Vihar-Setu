import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import {
  PhoneIcon,
  SirenIcon,
  NavigationIcon,
  ShieldIcon,
  UserIcon,
} from '../../../shared/components/CustomSvgIcons';
import { formatDistance, formatDuration } from '../../../core/geo/geoUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AdminLiveBottomSheet = ({
  vihars = [],
  selectedVihar = null,
  onSelectVihar = () => {},
  onDeselectVihar = () => {},
  onOpenDetail = () => {},
  onOpenCallModal = () => {},
}) => {
  return (
    <View style={styles.bottomSheetContainer}>
      {/* Grabber handle */}
      <View style={styles.grabberHandle} />

      {selectedVihar ? (
        /* Selected Card Mode */
        <View style={styles.selectedContainer}>
          <View style={styles.selectedHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.sevakNameRow}>
                <Text style={styles.selectedSevakName}>
                  {selectedVihar.sevak_name || 'Vihar Sevak'}
                </Text>
                <StatusBadge status={selectedVihar.displayStatus || selectedVihar.status} />
              </View>
              <Text style={styles.sanghaTitle} numberOfLines={1}>
                {selectedVihar.title || 'Pujya Sadhviji Bhagwant Vihar'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeSelectedBtn}
              onPress={onDeselectVihar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeSelectedText}>✕ List</Text>
            </TouchableOpacity>
          </View>

          {/* Hold Alert Banner if Active */}
          {selectedVihar.hold_active && (
            <View style={styles.holdBanner}>
              <Text style={styles.holdBannerText}>
                ⏸️ ON REST HOLD — Deviation and stationary alarms paused
              </Text>
            </View>
          )}

          {/* Telemetry Metric Tiles */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telItem}>
              <Text style={styles.telLabel}>BATTERY</Text>
              <Text style={[styles.telValue, { color: selectedVihar.battery <= 20 ? colors.statusEmergency : colors.deepMaroon }]}>
                {selectedVihar.battery != null ? `${selectedVihar.battery}%` : '92%'}
              </Text>
            </View>

            <View style={styles.telItem}>
              <Text style={styles.telLabel}>SPEED</Text>
              <Text style={styles.telValue}>
                {selectedVihar.speed != null ? `${Number(selectedVihar.speed).toFixed(1)} km/h` : '4.0 km/h'}
              </Text>
            </View>

            <View style={styles.telItem}>
              <Text style={styles.telLabel}>GPS ACCURACY</Text>
              <Text style={styles.telValue}>
                ±{selectedVihar.accuracy != null ? `${Math.round(selectedVihar.accuracy)}m` : '5m'}
              </Text>
            </View>

            <View style={styles.telItem}>
              <Text style={styles.telLabel}>DISTANCE LEFT</Text>
              <Text style={styles.telValue}>
                {formatDistance(selectedVihar.distance_remaining_m || 3200)}
              </Text>
            </View>
          </View>

          {/* Origin & Destination Route Box */}
          <View style={styles.routeBox}>
            <View style={styles.routeDotRow}>
              <View style={[styles.routeDot, { backgroundColor: '#2E7D5B' }]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {selectedVihar.source_name || 'Starting Upashray'}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeDotRow}>
              <View style={[styles.routeDot, { backgroundColor: colors.deepMaroon }]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {selectedVihar.dest_name || 'Designated Destination'}
              </Text>
            </View>

            {selectedVihar.subvihar_label ? (
              <Text style={styles.subViharTag}>
                Corridor: {selectedVihar.subvihar_label}
              </Text>
            ) : null}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => onOpenDetail(selectedVihar)}
              activeOpacity={0.8}
            >
              <NavigationIcon size={16} color="#FFFFFF" />
              <Text style={styles.detailBtnText}>Live Track & Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => onOpenCallModal(selectedVihar)}
              activeOpacity={0.8}
            >
              <PhoneIcon size={16} color={colors.deepMaroon} />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.policeBtn}
              onPress={() => onOpenCallModal(selectedVihar)}
              activeOpacity={0.8}
            >
              <SirenIcon size={16} color="#FFFFFF" />
              <Text style={styles.policeBtnText}>POLICE 112</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* List Mode */
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              ACTIVE VIHAR UNITS ({vihars.length})
            </Text>
            <Text style={styles.listHeaderSub}>Tap unit to view on map</Text>
          </View>

          {vihars.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No active Vihar in your area right now.</Text>
            </View>
          ) : (
            vihars.map((item) => (
              <TouchableOpacity
                key={item.vihar_id}
                style={styles.unitCard}
                activeOpacity={0.85}
                onPress={() => onSelectVihar(item.vihar_id)}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.sevakAvatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {(item.sevak_name || 'S').charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.unitName}>{item.sevak_name || 'Vihar Sevak'}</Text>
                    <Text style={styles.unitSangha} numberOfLines={1}>
                      {item.title || 'Pujya Sadhviji Bhagwant Vihar'}
                    </Text>
                  </View>

                  <StatusBadge status={item.displayStatus || item.status} />
                </View>

                {/* Corridor info */}
                <View style={styles.corridorRow}>
                  <Text style={styles.corridorText} numberOfLines={1}>
                    📍 {item.source_name || 'Origin'} → {item.dest_name || 'Destination'}
                  </Text>
                </View>

                {/* Bottom telemetry line */}
                <View style={styles.cardBottomRow}>
                  <Text style={styles.metaBadge}>
                    ⚡ {item.battery != null ? `${item.battery}%` : '92%'}
                  </Text>
                  <Text style={styles.metaBadge}>
                    🏃 {item.speed != null ? `${Number(item.speed).toFixed(1)} km/h` : '4.0 km/h'}
                  </Text>
                  <Text style={styles.metaBadge}>
                    📏 {formatDistance(item.distance_remaining_m || 3000)} left
                  </Text>
                  <Text style={styles.lastSeenBadge}>
                    {item.lastSeenText || 'Just now'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderTopColor: colors.cardBorder,
    maxHeight: SCREEN_HEIGHT * 0.44,
    minHeight: 200,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  grabberHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9C8B4',
    alignSelf: 'center',
    marginVertical: 8,
  },
  selectedContainer: {
    paddingVertical: spacing.xs,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sevakNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedSevakName: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontSize: 16,
    fontWeight: '800',
  },
  sanghaTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  closeSelectedBtn: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.saffron,
  },
  closeSelectedText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  holdBanner: {
    backgroundColor: '#FFF9E6',
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.statusWarning,
  },
  holdBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A5D00',
  },
  telemetryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAF6F0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  telItem: {
    alignItems: 'center',
  },
  telLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  telValue: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
    marginTop: 2,
  },
  routeBox: {
    backgroundColor: '#FFFDF7',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  routeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    width: 2,
    height: 8,
    backgroundColor: colors.cardBorder,
    marginLeft: 3,
  },
  routeText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  subViharTag: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  detailBtn: {
    flex: 2,
    backgroundColor: colors.deepMaroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 5,
  },
  detailBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#FFF8E7',
    borderWidth: 1.5,
    borderColor: colors.saffron,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  callBtnText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  policeBtn: {
    flex: 1.5,
    backgroundColor: colors.statusEmergency,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  policeBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  listContainer: {
    flex: 1,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  listHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepMaroon,
    letterSpacing: 0.6,
  },
  listHeaderSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyList: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs + 2,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sevakAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  unitName: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  unitSangha: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  corridorRow: {
    marginVertical: 4,
  },
  corridorText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  metaBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.deepMaroon,
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  lastSeenBadge: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 'auto',
    fontWeight: '600',
  },
});
