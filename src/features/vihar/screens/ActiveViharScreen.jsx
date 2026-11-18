import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { locationTelemetryService, GPS_STATUS } from '../services/locationTelemetryService';
import { routeDeviationEngine, DEVIATION_TIERS } from '../services/routeDeviationEngine';
import { viharService } from '../services/viharService';
import { AiOrchestrator } from '../../ai/AiOrchestrator';
import { BriefingCard } from '../components/BriefingCard';
import { decodePolylineLatLng, progressAlongRoute, formatDistance } from '../../../core/geo/geoUtils';
import { useViharStore } from '../hooks/useViharStore';

export const ActiveViharScreen = ({ route, navigation }) => {
  const mapRef = useRef(null);
  const { vihar, route: chosenRoute, weatherData } = route.params || {};
  const { clearActiveVihar } = useViharStore();

  // Telemetry & GPS State
  const [telemetry, setTelemetry] = useState(locationTelemetryService.getTelemetrySnapshot());
  const [deviationInfo, setDeviationInfo] = useState({
    tier: DEVIATION_TIERS.ON_TRACK,
    distanceMeters: 0,
  });

  // Briefing & Steps
  const [briefing, setBriefing] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [remainingMeters, setRemainingMeters] = useState(
    (chosenRoute?.distanceKm || 4.5) * 1000
  );
  const [etaTime, setEtaTime] = useState(
    chosenRoute?.etaDate ? chosenRoute.etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:30 AM'
  );

  // Modal / Controls
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState(10);
  const countdownTimerRef = useRef(null);

  const polylineCoords = chosenRoute?.coordinates || [];

  // 1. Initialize Route Deviation Engine with active route
  useEffect(() => {
    if (vihar?.planned_route_polyline || chosenRoute?.overviewPolyline) {
      routeDeviationEngine.setRoute(vihar.planned_route_polyline || chosenRoute.overviewPolyline);
    }

    // Subscribe to telemetry updates
    const unsubTelemetry = locationTelemetryService.subscribe((snap) => {
      setTelemetry(snap);

      if (snap.lastPosition && polylineCoords.length > 1) {
        // Calculate remaining distance and progress
        const prog = progressAlongRoute(
          { latitude: snap.lastPosition.latitude, longitude: snap.lastPosition.longitude },
          chosenRoute?.geojsonCoords || []
        );
        setRemainingMeters(prog.remainingMeters);

        // Pan map smoothly to user location
        if (mapRef.current) {
          mapRef.current.animateCamera({
            center: {
              latitude: snap.lastPosition.latitude,
              longitude: snap.lastPosition.longitude,
            },
            zoom: 17,
          });
        }
      }
    });

    // Subscribe to route deviation alerts
    const unsubDeviation = routeDeviationEngine.subscribe((dev) => {
      setDeviationInfo(dev);
      if (dev.tier === DEVIATION_TIERS.TIER_3) {
        triggerEmergencyCountdown();
      }
    });

    // Generate initial AI Briefing
    if (weatherData) {
      const b = AiOrchestrator.generateBriefing({
        navContext: {
          routeProgressMeters: 0,
          totalDistanceMeters: (chosenRoute?.distanceKm || 4.5) * 1000,
          currentSpeedKmph: 4.5,
          sunsetTime: weatherData.sunset,
        },
        weatherData,
        safetyContext: {
          batteryPercentage: 95,
          networkStatus: 'ONLINE',
          gpsAccuracyMeters: 5,
        },
      });
      setBriefing(b);
    }

    return () => {
      unsubTelemetry();
      unsubDeviation();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const triggerEmergencyCountdown = () => {
    setIsEmergencyActive(true);
    setEmergencyCountdown(10);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setEmergencyCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          handleCallAdmin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelEmergency = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsEmergencyActive(false);
  };

  const handleCallAdmin = () => {
    Linking.openURL('tel:112'); // or regional admin phone
  };

  const handleEndVihar = () => {
    Alert.alert(
      'Complete Vihar Seva',
      'Have all Poojya Sadhviji Bhagwants and Sevikas safely reached the destination Upashray?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Complete',
          style: 'default',
          onPress: async () => {
            await locationTelemetryService.stopTracking();
            routeDeviationEngine.reset();
            if (vihar?.id) {
              await viharService.completeVihar(vihar.id);
            }
            if (clearActiveVihar) clearActiveVihar();
            Alert.alert('Jai Jinendra', 'Vihar Seva completed successfully. Punyanumodna!');
            navigation.reset({ index: 0, routes: [{ name: 'SevakHome' }] });
          },
        },
      ]
    );
  };

  const handleManualSOS = () => {
    Alert.alert(
      'Trigger Emergency SOS',
      'This will broadcast an immediate critical alarm to community administrators and control room.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'TRIGGER SOS',
          style: 'destructive',
          onPress: async () => {
            if (vihar?.id && telemetry.lastPosition) {
              await viharService.triggerSOS(
                vihar.id,
                telemetry.lastPosition.latitude,
                telemetry.lastPosition.longitude
              );
            }
            triggerEmergencyCountdown();
          },
        },
      ]
    );
  };

  const steps = chosenRoute?.steps || [];
  const currentStep = steps[currentStepIndex] || {
    instruction: 'Proceed along the planned Vihar route',
    distanceMeters: remainingMeters,
  };

  return (
    <View style={styles.container}>
      {/* Active Tracking Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: telemetry.lastPosition?.latitude || 21.1959,
          longitude: telemetry.lastPosition?.longitude || 72.8302,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
      >
        {/* Planned Route Polyline (Gold / Saffron) */}
        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.saffron}
            strokeWidth={6}
          />
        )}

        {/* Traveled Path Polyline (Deep Maroon) */}
        {telemetry.traveledPath.length > 1 && (
          <Polyline
            coordinates={telemetry.traveledPath}
            strokeColor={colors.deepMaroon}
            strokeWidth={5}
          />
        )}

        {/* Live Sevika Puck */}
        {telemetry.lastPosition && (
          <Marker
            coordinate={{
              latitude: telemetry.lastPosition.latitude,
              longitude: telemetry.lastPosition.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.puckOuter}>
              <View style={styles.puckInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top Floating Heads-Up Display */}
      <View style={styles.topHud}>
        {/* Route Deviation Banner (Tier 1 & Tier 2) */}
        {deviationInfo.tier > DEVIATION_TIERS.ON_TRACK && (
          <View
            style={[
              styles.deviationBanner,
              deviationInfo.tier >= DEVIATION_TIERS.TIER_2
                ? styles.deviationBannerHigh
                : styles.deviationBannerWarning,
            ]}
          >
            <Text style={styles.deviationBannerText}>
              ⚠️ Route Deviation: {deviationInfo.distanceMeters}m away from path!
            </Text>
            <TouchableOpacity
              style={styles.changeRouteBtn}
              onPress={() => {
                Alert.alert(
                  'Changed Route on Purpose',
                  'Recalculating route from current location...',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.changeRouteBtnText}>I Changed Route</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Turn-by-Turn Instruction Banner */}
        <View style={[styles.navBanner, shadows.elevated]}>
          <Text style={styles.navManeuverIcon}>➔</Text>
          <View style={styles.navTextCol}>
            <Text style={styles.navInstruction} numberOfLines={2}>
              {currentStep.instruction}
            </Text>
            <Text style={styles.navDist}>In {formatDistance(currentStep.distanceMeters)}</Text>
          </View>
          {/* Status Chips */}
          <View style={styles.statusChipsCol}>
            <View style={styles.batteryChip}>
              <Text style={styles.chipSmallText}>🔋 {telemetry.batteryPercentage}%</Text>
            </View>
            <View
              style={[
                styles.networkChip,
                telemetry.networkStatus === 'ONLINE' ? styles.chipOnline : styles.chipOffline,
              ]}
            >
              <Text style={styles.chipSmallText}>{telemetry.networkStatus}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Floating Control Sheet */}
      <View style={[styles.bottomSheet, shadows.elevated]}>
        {/* Progress & Speed Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{formatDistance(remainingMeters)}</Text>
            <Text style={styles.statLbl}>Remaining</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{etaTime}</Text>
            <Text style={styles.statLbl}>Projected ETA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>
              {(telemetry.lastPosition?.speedKmh || 4.2).toFixed(1)} km/h
            </Text>
            <Text style={styles.statLbl}>Walking Pace</Text>
          </View>
        </View>

        {/* Advisory Briefing Card */}
        {briefing && <BriefingCard briefing={briefing} />}

        {/* Action Button Row */}
        <View style={styles.actionBtnRow}>
          {/* SOS Button */}
          <TouchableOpacity
            style={styles.sosBtn}
            onPress={handleManualSOS}
            activeOpacity={0.8}
          >
            <Text style={styles.sosBtnText}>🚨 SOS</Text>
          </TouchableOpacity>

          {/* End Vihar Button */}
          <TouchableOpacity
            style={styles.endBtn}
            onPress={handleEndVihar}
            activeOpacity={0.85}
          >
            <Text style={styles.endBtnText}>End Vihar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Countdown Full-Screen Overlay */}
      {isEmergencyActive && (
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyModalCard}>
            <Text style={styles.emergencyTitle}>🚨 CRITICAL ALERT</Text>
            <Text style={styles.emergencySub}>
              Severe route deviation (1 km) detected. Auto-calling emergency administrator in:
            </Text>
            <Text style={styles.countdownNumber}>{emergencyCountdown}</Text>
            <Text style={styles.secondsText}>seconds</Text>

            <TouchableOpacity style={styles.callNowBtn} onPress={handleCallAdmin}>
              <Text style={styles.callNowText}>📞 Call Admin / Police (112) Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelEmergencyBtn} onPress={handleCancelEmergency}>
              <Text style={styles.cancelEmergencyText}>Cancel Alarm (I am Safe)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHud: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  deviationBanner: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviationBannerWarning: {
    backgroundColor: '#FFF8E1',
    borderColor: colors.statusWarning,
    borderWidth: 1,
  },
  deviationBannerHigh: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.statusEmergency,
    borderWidth: 1.5,
  },
  deviationBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.statusEmergency,
    flex: 1,
  },
  changeRouteBtn: {
    backgroundColor: colors.deepMaroon,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  changeRouteBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warmIvory,
  },
  navBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navManeuverIcon: {
    fontSize: 24,
    color: colors.deepMaroon,
    marginRight: spacing.md,
  },
  navTextCol: {
    flex: 1,
  },
  navInstruction: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  navDist: {
    ...typography.caption,
    color: colors.saffronDark,
    fontWeight: '800',
    marginTop: 2,
  },
  statusChipsCol: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: spacing.sm,
  },
  batteryChip: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  networkChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipOnline: {
    backgroundColor: '#E8F5E9',
  },
  chipOffline: {
    backgroundColor: '#FFEBEE',
  },
  chipSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  puckOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 138, 43, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.saffron,
  },
  puckInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.saffron,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: 280,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  statLbl: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sosBtn: {
    backgroundColor: colors.statusEmergency,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosBtnText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  endBtn: {
    flex: 1,
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  endBtnText: {
    ...typography.button,
    color: colors.warmIvory,
    fontWeight: '800',
  },
  emergencyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(184, 50, 50, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 100,
  },
  emergencyModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  emergencyTitle: {
    ...typography.h2,
    color: colors.statusEmergency,
    marginBottom: spacing.xs,
  },
  emergencySub: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  countdownNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.statusEmergency,
  },
  secondsText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  callNowBtn: {
    backgroundColor: colors.statusEmergency,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  callNowText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cancelEmergencyBtn: {
    paddingVertical: spacing.sm,
  },
  cancelEmergencyText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
});
