import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import {
  ArrowLeftIcon,
  PhoneIcon,
  SirenIcon,
  ShieldIcon,
  AlertTriangleIcon,
  ClockIcon,
  MapPinIcon,
  UsersGroupIcon,
  NavigationIcon,
  CheckCircleIcon,
  InfoIcon,
} from '../../../shared/components/CustomSvgIcons';
import { adminLiveService } from '../services/adminLiveService';
import { AdminLiveDetailMap } from '../components/AdminLiveDetailMap';
import { AdminCallActionModal } from '../components/AdminCallActionModal';
import { decodePolyline, formatDistance, formatDuration } from '../../../core/geo/geoUtils';
import { supabase } from '../../../core/config/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STALE_TIMEOUT_SECONDS = 180; // 3 minutes timeout per specification

export const AdminLiveDetailScreen = ({ route, navigation }) => {
  const { viharId, title: initialTitle } = route.params || {};
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viharDetail, setViharDetail] = useState(null);
  const [helpingDetails, setHelpingDetails] = useState(null);
  const [liveState, setLiveState] = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [plannedCoords, setPlannedCoords] = useState([]);
  const [lastKnownAddress, setLastKnownAddress] = useState('');
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [expandedHelping, setExpandedHelping] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());

  const lastTrackTimeRef = useRef(null);
  const trackPollTimerRef = useRef(null);
  const clockIntervalRef = useRef(null);

  // Live seconds ticker for relative timestamp ("12s ago")
  useEffect(() => {
    clockIntervalRef.current = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, []);

  // Fetch initial detailed data
  const loadDetail = useCallback(async () => {
    if (!viharId) return;

    try {
      const [detailRes, helpingRes, trackRes] = await Promise.all([
        adminLiveService.fetchViharDetail(viharId),
        adminLiveService.fetchHelpingDetails(viharId),
        adminLiveService.fetchTrack(viharId, null, 500),
      ]);

      if (detailRes.data) {
        setViharDetail(detailRes.data);
        if (detailRes.data.live_state) {
          setLiveState(detailRes.data.live_state);
        }

        // Decode planned polyline geometry
        if (detailRes.data.route_geometry) {
          const decoded = decodePolyline(detailRes.data.route_geometry);
          setPlannedCoords(decoded);
        }
      }

      if (helpingRes.data) {
        setHelpingDetails(helpingRes.data);
      }

      if (trackRes.data && trackRes.data.length > 0) {
        setTrackPoints(trackRes.data);
        lastTrackTimeRef.current = trackRes.data[trackRes.data.length - 1].recorded_at;
      }

      // Reverse geocode last known location
      const curLat = detailRes.data?.live_state?.lat || helpingRes.data?.lat;
      const curLng = detailRes.data?.live_state?.lng || helpingRes.data?.lng;
      if (curLat && curLng) {
        const address = await adminLiveService.reverseGeocode(curLat, curLng);
        setLastKnownAddress(address);
      }
    } catch (e) {
      console.warn('[AdminLiveDetail] Error loading detail:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viharId]);

  // Periodic track points fetcher (every 10 seconds)
  const pollNewTrackPoints = useCallback(async () => {
    if (!viharId) return;
    try {
      const sinceTime = lastTrackTimeRef.current;
      const { data } = await adminLiveService.fetchTrack(viharId, sinceTime, 100);
      if (data && data.length > 0) {
        setTrackPoints((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });
        lastTrackTimeRef.current = data[data.length - 1].recorded_at;
      }
    } catch (e) {
      console.warn('[AdminLiveDetail] pollNewTrackPoints error:', e);
    }
  }, [viharId]);

  // Initialize and subscribe to Realtime
  useEffect(() => {
    loadDetail();

    // Subscribe to live state changes on this specific Vihar
    const channel = supabase
      .channel(`admin_detail_live_${viharId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vihar_live_state',
          filter: `vihar_id=eq.${viharId}`,
        },
        (payload) => {
          if (payload.new) {
            setLiveState(payload.new);
          }
        }
      )
      .subscribe();

    // Start 10s track poll
    trackPollTimerRef.current = setInterval(pollNewTrackPoints, 10000);

    return () => {
      supabase.removeChannel(channel);
      if (trackPollTimerRef.current) clearInterval(trackPollTimerRef.current);
    };
  }, [viharId, loadDetail, pollNewTrackPoints]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDetail();
  };

  // Determine display status taking stale heartbeat into account
  const { displayStatus, relativeUpdateTime, isStale } = useMemo(() => {
    if (!liveState) {
      return { displayStatus: 'OFFLINE', relativeUpdateTime: 'Unknown', isStale: true };
    }

    const heartbeat = liveState.last_heartbeat_at || liveState.updated_at;
    let secondsDiff = 0;
    if (heartbeat) {
      secondsDiff = Math.max(0, Math.floor((nowTime - new Date(heartbeat).getTime()) / 1000));
    }

    const stale = secondsDiff > STALE_TIMEOUT_SECONDS;
    let status = liveState.status || 'SAFE';
    if (stale && status !== 'EMERGENCY') {
      status = 'OFFLINE';
    }

    let relTime = 'Just now';
    if (secondsDiff < 60) {
      relTime = `${secondsDiff}s ago`;
    } else if (secondsDiff < 3600) {
      relTime = `${Math.floor(secondsDiff / 60)}m ago`;
    } else {
      relTime = `${Math.floor(secondsDiff / 3600)}h ago`;
    }

    return {
      displayStatus: status,
      relativeUpdateTime: relTime,
      isStale: stale,
    };
  }, [liveState, nowTime]);

  // Lead sevak info
  const leadSevak = useMemo(() => {
    if (helpingDetails) {
      return {
        name: helpingDetails.full_name || 'Vihar Sevak',
        phone: helpingDetails.phone || '',
        avatar: helpingDetails.avatar_url,
        bloodGroup: helpingDetails.blood_group || 'Not recorded',
        emergencyPhone: helpingDetails.emergency_contact_phone || '',
        emergencyName: helpingDetails.emergency_contact_name || 'Emergency Contact',
        emergencyRelation: helpingDetails.emergency_contact_relation || 'Family / Coordinator',
        medicalNotes: helpingDetails.medical_notes || 'None',
        role: helpingDetails.responsibility || 'Lead Sevak',
      };
    }
    const part = viharDetail?.participants?.find((p) => p.is_current_responsible) || viharDetail?.participants?.[0];
    return {
      name: part?.full_name || 'Vihar Sevak',
      phone: part?.phone || '',
      avatar: part?.avatar_url,
      bloodGroup: 'Not recorded',
      emergencyPhone: '',
      emergencyName: 'Emergency Contact',
      emergencyRelation: 'Family / Coordinator',
      medicalNotes: 'None',
      role: part?.role || 'Lead Sevak',
    };
  }, [helpingDetails, viharDetail]);

  // Active Hold details if any
  const activeHold = useMemo(() => {
    return viharDetail?.current_hold || null;
  }, [viharDetail]);

  // Route deviation alert
  const deviationDistance = liveState?.deviation_distance_m ? Number(liveState.deviation_distance_m) : 0;
  const isDeviated = deviationDistance > 150; // Threshold per specification

  // Direct Phone Call triggers
  const handleCallUser = async () => {
    if (!leadSevak.phone) {
      Alert.alert('No Phone Number', 'The assigned Sevak does not have a contact phone listed.');
      return;
    }
    await adminLiveService.logCall({
      viharId,
      targetType: 'SEVAK',
      phone: leadSevak.phone,
    });
    Linking.openURL(`tel:${leadSevak.phone.replace(/[^0-9+]/g, '')}`);
  };

  const handleCallEmergencyContact = async () => {
    if (!leadSevak.emergencyPhone) {
      Alert.alert('No Emergency Contact', 'No emergency contact phone registered for this Sevak.');
      return;
    }
    await adminLiveService.logCall({
      viharId,
      targetType: 'EMERGENCY_CONTACT',
      phone: leadSevak.emergencyPhone,
    });
    Linking.openURL(`tel:${leadSevak.emergencyPhone.replace(/[^0-9+]/g, '')}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.saffron} />
        <Text style={styles.loadingText}>Connecting to Live Vihar Feed...</Text>
      </View>
    );
  }

  const viharTitle = viharDetail?.vihar?.title || initialTitle || 'Pujya Sadhviji Bhagwant Vihar';
  const sourceName = viharDetail?.vihar?.source_name || 'Origin';
  const destName = viharDetail?.vihar?.dest_name || 'Destination';
  const participants = viharDetail?.participants || [];
  const holdHistory = viharDetail?.hold_history || [];

  return (
    <View style={styles.screenContainer}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />

      {/* Screen Top Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 24), paddingBottom: spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeftIcon size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {viharTitle}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {`${sourceName} → ${destName}`}
          </Text>
        </View>

        <View style={styles.headerBadgeWrap}>
          <StatusBadge status={displayStatus} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.saffron, colors.deepMaroon]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* CRITICAL EMERGENCY BANNER */}
        {displayStatus === 'EMERGENCY' ? (
          <View style={styles.emergencyBanner}>
            <SirenIcon size={24} color={colors.white} />
            <View style={styles.emergencyBannerContent}>
              <Text style={styles.emergencyBannerTitle}>EMERGENCY ALERT TRIGGERED</Text>
              <Text style={styles.emergencyBannerSub}>
                Sevak has signaled distress. Check location and dispatch response immediately.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.emergencyBannerBtn}
              activeOpacity={0.85}
              onPress={() => setCallModalVisible(true)}
            >
              <Text style={styles.emergencyBannerBtnText}>ACTION</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ROUTE DEVIATION BANNER */}
        {isDeviated ? (
          <View style={styles.deviationBanner}>
            <AlertTriangleIcon size={20} color="#854D0E" />
            <View style={styles.bannerTextWrap}>
              <Text style={styles.deviationTitle}>Route Deviation Detected</Text>
              <Text style={styles.deviationSub}>
                {`Sevak is ${Math.round(deviationDistance)}m off the designated vihar corridor.`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* REST HOLD BANNER */}
        {liveState?.hold_active || activeHold ? (
          <View style={styles.holdBanner}>
            <ClockIcon size={20} color="#1E40AF" />
            <View style={styles.bannerTextWrap}>
              <Text style={styles.holdTitle}>Vihar Currently On Rest Hold</Text>
              <Text style={styles.holdSub}>
                {`Reason: ${activeHold?.reason || 'Scheduled Rest'} • Started: ${
                  activeHold?.start_time ? new Date(activeHold.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'
                }`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* STALE HEARTBEAT WARNING */}
        {isStale && displayStatus !== 'EMERGENCY' ? (
          <View style={styles.staleBanner}>
            <InfoIcon size={18} color="#4B5563" />
            <Text style={styles.staleBannerText}>
              {`No heartbeat for > 3 minutes. Last active ${relativeUpdateTime}.`}
            </Text>
          </View>
        ) : null}

        {/* VISUAL MAP CANVAS */}
        <AdminLiveDetailMap
          plannedCoords={plannedCoords}
          trackCoords={trackPoints}
          liveState={liveState}
          sourceName={sourceName}
          destName={destName}
          currentHold={activeHold}
          height={280}
        />

        {/* LIVE METRICS 4-GRID */}
        <View style={styles.metricsContainer}>
          {/* Row 1 */}
          <View style={styles.metricRow}>
            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricLabel}>Distance Left</Text>
              <Text style={styles.metricValue}>
                {liveState?.distance_remaining_m
                  ? formatDistance(Number(liveState.distance_remaining_m))
                  : 'Calculated'}
              </Text>
              <Text style={styles.metricSub}>Remaining corridor</Text>
            </View>

            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricLabel}>Live Speed</Text>
              <Text style={styles.metricValue}>
                {liveState?.speed ? `${Number(liveState.speed).toFixed(1)} km/h` : '0.0 km/h'}
              </Text>
              <Text style={styles.metricSub}>Pace</Text>
            </View>

            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricLabel}>Battery</Text>
              <Text style={[styles.metricValue, { color: (liveState?.battery || 100) < 20 ? colors.statusEmergency : colors.textPrimary }]}>
                {liveState?.battery ? `${liveState.battery}%` : '85%'}
              </Text>
              <Text style={styles.metricSub}>Device charge</Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.metricRow}>
            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricLabel}>GPS Accuracy</Text>
              <Text style={styles.metricValue}>
                {liveState?.accuracy ? `±${Math.round(liveState.accuracy)}m` : '±12m'}
              </Text>
              <Text style={styles.metricSub}>GNSS Lock</Text>
            </View>

            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricLabel}>Network</Text>
              <Text style={styles.metricValue}>
                {liveState?.network || '4G LTE'}
              </Text>
              <Text style={styles.metricSub}>Signal mode</Text>
            </View>

            <View style={[styles.metricCard, shadows.card]}>
              <Text style={styles.metricLabel}>Last Updated</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {relativeUpdateTime}
              </Text>
              <Text style={styles.metricSub}>Realtime sync</Text>
            </View>
          </View>
        </View>

        {/* REVERSE GEOCODED CURRENT LOCATION */}
        {lastKnownAddress ? (
          <View style={[styles.addressCard, shadows.card]}>
            <MapPinIcon size={20} color={colors.saffron} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Current Approximate Location</Text>
              <Text style={styles.addressText}>{lastKnownAddress}</Text>
              {liveState?.lat && liveState?.lng ? (
                <Text style={styles.coordsText}>
                  {`Coordinates: ${Number(liveState.lat).toFixed(5)}, ${Number(liveState.lng).toFixed(5)}`}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* SEVAK & SANGHA GROUP INFORMATION */}
        <View style={[styles.sectionCard, shadows.card]}>
          <Text style={styles.sectionTitle}>Sevak Team & Responsibility</Text>

          {/* Lead Sevak Tile */}
          <View style={styles.leadSevakRow}>
            <View style={styles.avatarWrap}>
              {leadSevak.avatar ? (
                <Image source={{ uri: leadSevak.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {leadSevak.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.leadDetails}>
              <View style={styles.leadNameRow}>
                <Text style={styles.leadName}>{leadSevak.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Lead Sevika</Text>
                </View>
              </View>
              <Text style={styles.leadPhone}>{leadSevak.phone || 'No phone recorded'}</Text>
            </View>

            <TouchableOpacity
              style={styles.directCallIconBtn}
              activeOpacity={0.8}
              onPress={handleCallUser}
            >
              <PhoneIcon size={18} color="#2E7D5B" />
            </TouchableOpacity>
          </View>

          {/* Sangha Details */}
          <View style={styles.groupInfoRow}>
            <View style={styles.groupInfoItem}>
              <Text style={styles.groupInfoLabel}>Sangha</Text>
              <Text style={styles.groupInfoValue} numberOfLines={1}>
                {viharTitle}
              </Text>
            </View>
            <View style={styles.groupInfoItem}>
              <Text style={styles.groupInfoLabel}>Participants</Text>
              <Text style={styles.groupInfoValue}>
                {`${participants.length > 0 ? participants.length : 1} Active Sevaks`}
              </Text>
            </View>
          </View>
        </View>

        {/* HELPING DETAILS CARD (EXPANDABLE EMERGENCY INFO) */}
        <View style={[styles.sectionCard, shadows.card]}>
          <TouchableOpacity
            style={styles.expandHeader}
            activeOpacity={0.8}
            onPress={() => setExpandedHelping(!expandedHelping)}
          >
            <View style={styles.expandHeaderLeft}>
              <ShieldIcon size={20} color={colors.deepMaroon} />
              <Text style={styles.sectionTitleNoMargin}>Emergency Medical & Helping Details</Text>
            </View>
            <Text style={styles.expandToggleText}>
              {expandedHelping ? 'Collapse ▲' : 'View ▼'}
            </Text>
          </TouchableOpacity>

          {expandedHelping ? (
            <View style={styles.expandedContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Blood Group:</Text>
                <View style={styles.bloodBadge}>
                  <Text style={styles.bloodBadgeText}>{leadSevak.bloodGroup}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Emergency Contact:</Text>
                <Text style={styles.detailVal}>{leadSevak.emergencyName} ({leadSevak.emergencyRelation})</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Emergency Phone:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.detailVal, { fontWeight: '700' }]}>{leadSevak.emergencyPhone || 'None'}</Text>
                  {leadSevak.emergencyPhone ? (
                    <TouchableOpacity
                      style={styles.smallCallBtn}
                      activeOpacity={0.8}
                      onPress={handleCallEmergencyContact}
                    >
                      <PhoneIcon size={14} color="#D99A24" />
                      <Text style={styles.smallCallText}>Dial</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Medical Notes:</Text>
                <Text style={styles.detailVal}>{leadSevak.medicalNotes}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Assigned Role:</Text>
                <Text style={styles.detailVal}>{leadSevak.role}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.collapsedSummary}>
              Tap to view blood group, next-of-kin emergency phone, and medical notes.
            </Text>
          )}
        </View>

        {/* REST HOLD HISTORY SECTION */}
        {holdHistory && holdHistory.length > 0 ? (
          <View style={[styles.sectionCard, shadows.card]}>
            <Text style={styles.sectionTitle}>Rest Hold History</Text>
            {holdHistory.map((hold, idx) => (
              <View key={`hold-${idx}`} style={styles.historyRow}>
                <View style={styles.historyDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{hold.reason || 'Rest Stop'}</Text>
                  <Text style={styles.historyTime}>
                    {hold.start_time ? new Date(hold.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    {hold.end_time ? ` - ${new Date(hold.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Ongoing)'}
                  </Text>
                </View>
                <View style={[styles.historyBadge, { backgroundColor: hold.status === 'ACTIVE' ? '#DBEAFE' : '#F3F4F6' }]}>
                  <Text style={[styles.historyBadgeText, { color: hold.status === 'ACTIVE' ? '#1E40AF' : '#4B5563' }]}>
                    {hold.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 12) }, shadows.card]}>
        <TouchableOpacity
          style={styles.callSevakBtn}
          activeOpacity={0.85}
          onPress={handleCallUser}
        >
          <PhoneIcon size={18} color="#FFFFFF" />
          <Text style={styles.callBtnText}>Call Sevak</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.callEmergencyBtn}
          activeOpacity={0.85}
          onPress={handleCallEmergencyContact}
        >
          <PhoneIcon size={18} color="#FFFFFF" />
          <Text style={styles.callBtnText}>Emergency Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.callPoliceBtn}
          activeOpacity={0.85}
          onPress={() => setCallModalVisible(true)}
        >
          <SirenIcon size={18} color="#FFFFFF" />
          <Text style={styles.callBtnText}>112 POLICE</Text>
        </TouchableOpacity>
      </View>

      {/* CALL MODAL WITH 2-STEP POLICE AUDIT CONFIRMATION */}
      <AdminCallActionModal
        visible={callModalVisible}
        onClose={() => setCallModalVisible(false)}
        vihar={{
          vihar_id: viharId,
          sevak_name: leadSevak.name,
          sevak_phone: leadSevak.phone,
          emergency_contact_phone: leadSevak.emergencyPhone,
          lat: liveState?.lat,
          lng: liveState?.lng,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6F0',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  headerBar: {
    backgroundColor: colors.deepMaroon,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
  },
  headerBadgeWrap: {
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  emergencyBanner: {
    backgroundColor: '#B83232',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emergencyBannerContent: {
    flex: 1,
  },
  emergencyBannerTitle: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
  },
  emergencyBannerSub: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
  },
  emergencyBannerBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  emergencyBannerBtnText: {
    ...typography.caption,
    color: '#B83232',
    fontWeight: '800',
    fontSize: 11,
  },
  deviationBanner: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  holdBanner: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  staleBanner: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  staleBannerText: {
    ...typography.caption,
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
  },
  bannerTextWrap: {
    flex: 1,
  },
  deviationTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: '#92400E',
    fontSize: 12,
  },
  deviationSub: {
    ...typography.caption,
    color: '#B45309',
    fontSize: 11,
  },
  holdTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: '#1E40AF',
    fontSize: 12,
  },
  holdSub: {
    ...typography.caption,
    color: '#2563EB',
    fontSize: 11,
  },
  metricsContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    ...typography.h3,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  metricSub: {
    ...typography.caption,
    fontSize: 9.5,
    color: colors.textMuted,
  },
  addressCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  addressLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    fontSize: 10.5,
    textTransform: 'uppercase',
  },
  addressText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  coordsText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  sectionCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepMaroon,
    marginBottom: spacing.sm,
  },
  sectionTitleNoMargin: {
    ...typography.h3,
    fontSize: 13,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  leadSevakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0D4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.saffron,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  leadDetails: {
    flex: 1,
  },
  leadNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadName: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 14,
    color: colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  leadPhone: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  directCallIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfoRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  groupInfoItem: {
    flex: 1,
  },
  groupInfoLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  groupInfoValue: {
    ...typography.body,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expandToggleText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.saffron,
  },
  collapsedSummary: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  expandedContent: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailKey: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailVal: {
    ...typography.body,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bloodBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bloodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
  },
  smallCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  smallCallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.saffron,
  },
  historyTitle: {
    ...typography.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyTime: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  historyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 8,
    elevation: 12,
  },
  callSevakBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#2E7D5B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  callEmergencyBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#D99A24',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  callPoliceBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#B83232',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  callBtnText: {
    ...typography.button,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
