import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { calculateDistanceMeters } from '../../../core/geo/geoUtils';
import { viharService } from '../services/viharService';
import { locationTelemetryService } from '../services/locationTelemetryService';
import { StartGateDialog } from '../components/StartGateDialog';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useViharStore } from '../hooks/useViharStore';

export const ViharDetailsScreen = ({ route, navigation }) => {
  const { origin, destination, route: chosenRoute, weatherData, currentPosition } = route.params || {};
  const { user } = useAuthStore();
  const { setActiveVihar } = useViharStore();

  const [sadhvijiName, setSadhvijiName] = useState('Pujya Sadhviji Mayurashriji Maharaj Saheb');
  const [sadhvijiCount, setSadhvijiCount] = useState('2');
  const [expectedArrival, setExpectedArrival] = useState(
    chosenRoute?.etaDate ? chosenRoute.etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:30 AM'
  );
  const [notes, setNotes] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Start Gate Dialog State
  const [gateDialogVisible, setGateDialogVisible] = useState(false);
  const [gateDistanceMeters, setGateDistanceMeters] = useState(0);
  const [isWaitingGps, setIsWaitingGps] = useState(false);

  const handleStartVihar = () => {
    setIsStarting(true);
    setIsWaitingGps(true);

    // 1. Get Fresh High-Accuracy GPS Position
    Geolocation.getCurrentPosition(
      async (pos) => {
        setIsWaitingGps(false);
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const fixTime = new Date(pos.timestamp);
        const isMock = Boolean(pos.mocked);

        // Reject stale fix (> 30s)
        const isStale = Date.now() - pos.timestamp > 30000;
        if (isStale) {
          setIsStarting(false);
          Alert.alert('GPS Fix Stale', 'Location fix is more than 30 seconds old. Acquiring fresh fix...');
          return;
        }

        // 2. Start Gate Proximity Verification
        const rawDist = calculateDistanceMeters(
          latitude,
          longitude,
          origin.latitude,
          origin.longitude
        );
        const effectiveDist = Math.max(0, rawDist - Math.min(accuracy || 0, 50));

        // Threshold: 100 meters
        if (effectiveDist > 100 || (accuracy && accuracy > 50)) {
          setIsStarting(false);
          setGateDistanceMeters(rawDist);
          setGateDialogVisible(true);
          return;
        }

        // 3. START GATE PASSED: Invoke Server Atomic RPC
        try {
          const clientUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

          const rpcPayload = {
            client_uuid: clientUuid,
            source_name: origin.name,
            source_lat: origin.latitude,
            source_lng: origin.longitude,
            dest_name: destination.name,
            dest_lat: destination.latitude,
            dest_lng: destination.longitude,
            expected_arrival: new Date().toISOString(),
            notes: `Sadhviji: ${sadhvijiName.trim()} (${sadhvijiCount}) | Notes: ${notes.trim()}`,
            route_geometry: chosenRoute?.overviewPolyline || '',
            total_distance_km: chosenRoute?.distanceKm || 0,
            estimated_duration_mins: chosenRoute?.durationMinutes || 60,
            participant_ids: [],
            device_lat: latitude,
            device_lng: longitude,
            accuracy: accuracy || 5.0,
            fix_time: fixTime.toISOString(),
            is_mock: isMock,
          };

          const result = await viharService.startViharRPC(rpcPayload);

          if (result.error) {
            setIsStarting(false);
            Alert.alert('Start Vihar Failed', result.error.message || 'Could not start Vihar.');
            return;
          }

          // 4. Update Store & Start Telemetry Background Tracking
          const viharRecord = {
            id: result.data.vihar_id,
            status: 'ACTIVE',
            source_name: origin.name,
            dest_name: destination.name,
            total_distance_km: chosenRoute?.distanceKm || 0,
            planned_route_polyline: chosenRoute?.overviewPolyline || '',
            subvihar_id: result.data.subvihar_id,
          };

          if (setActiveVihar) {
            setActiveVihar(viharRecord);
          }

          // Start Foreground Telemetry Service
          await locationTelemetryService.startTracking(result.data.vihar_id, result.data.subvihar_id);

          setIsStarting(false);

          // 5. Navigate to Active Vihar Screen
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'ActiveVihar',
                params: {
                  vihar: viharRecord,
                  route: chosenRoute,
                  weatherData,
                },
              },
            ],
          });
        } catch (e) {
          setIsStarting(false);
          Alert.alert('Error', e.message || 'Failed to start Vihar.');
        }
      },
      (err) => {
        setIsStarting(false);
        setIsWaitingGps(false);
        Alert.alert('GPS Error', 'Could not obtain GPS fix. Please ensure location services are enabled.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  };

  const handleUseCurrentLocationAsStart = () => {
    setGateDialogVisible(false);
    if (currentPosition) {
      navigation.navigate('ChooseRoute');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Title */}
        <Text style={styles.title}>Vihar Seva Details</Text>
        <Text style={styles.subtitle}>Confirm details before initiating live tracking</Text>

        {/* Route Card Preview */}
        <View style={[styles.routeCard, shadows.card]}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeHeaderText}>CHOSEN ROUTE</Text>
            <Text style={styles.distanceBadge}>{chosenRoute?.distanceKm || 0} km</Text>
          </View>
          <Text style={styles.placeName}>🟢 {origin?.name}</Text>
          <Text style={styles.arrowText}>↓ walking ({chosenRoute?.durationMinutes || 0} mins)</Text>
          <Text style={styles.placeName}>🔴 {destination?.name}</Text>
        </View>

        {/* Input: Sadhviji Bhagwant Name */}
        <Text style={styles.inputLabel}>Poojya Sadhviji Bhagwant Name *</Text>
        <TextInput
          style={styles.textInput}
          value={sadhvijiName}
          onChangeText={setSadhvijiName}
          placeholder="e.g. Pujya Sadhviji Mayurashriji Maharaj Saheb"
          placeholderTextColor={colors.textMuted}
        />

        {/* Input: Number of Sadhvijis */}
        <Text style={styles.inputLabel}>Number of Sadhviji Bhagwants in Group</Text>
        <TextInput
          style={styles.textInput}
          value={sadhvijiCount}
          onChangeText={setSadhvijiCount}
          keyboardType="numeric"
          placeholder="2"
          placeholderTextColor={colors.textMuted}
        />

        {/* Input: Expected Arrival */}
        <Text style={styles.inputLabel}>Expected Arrival Time</Text>
        <TextInput
          style={styles.textInput}
          value={expectedArrival}
          onChangeText={setExpectedArrival}
          placeholder="07:30 AM"
          placeholderTextColor={colors.textMuted}
        />

        {/* Input: Seva Notes */}
        <Text style={styles.inputLabel}>Additional Seva Notes (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Specific luggage, weather precautions, or intermediate upashray stops..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        {/* Start Gate Notice */}
        <View style={styles.gateNoticeBox}>
          <Text style={styles.gateNoticeTitle}>📍 Start Gate Security Protocol</Text>
          <Text style={styles.gateNoticeText}>
            Physical presence within 100 meters of the starting point is verified at the moment of start. Live telemetry streams to community administrators automatically.
          </Text>
        </View>

        {/* Big Start Button */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStartVihar}
          disabled={isStarting}
          activeOpacity={0.85}
        >
          {isStarting ? (
            <ActivityIndicator color={colors.warmIvory} />
          ) : (
            <Text style={styles.startBtnText}>START VIHAR SEVA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Start Gate Distance Failure Dialog */}
      <StartGateDialog
        visible={gateDialogVisible}
        distanceMeters={gateDistanceMeters}
        thresholdMeters={100}
        sourceName={origin?.name || 'Start Point'}
        isWaitingGps={isWaitingGps}
        onNavigateToStart={() => {
          setGateDialogVisible(false);
          navigation.navigate('ChooseRoute');
        }}
        onUseCurrentLocation={handleUseCurrentLocationAsStart}
        onCheckAgain={handleStartVihar}
        onCancel={() => setGateDialogVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.h2,
    color: colors.deepMaroon,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  routeHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  distanceBadge: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.deepMaroon,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
  },
  placeName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  arrowText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 20,
    marginVertical: 2,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  gateNoticeBox: {
    backgroundColor: '#FFF8E7',
    borderColor: colors.saffron,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  gateNoticeTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    marginBottom: 2,
  },
  gateNoticeText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  startBtn: {
    backgroundColor: colors.saffron,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  startBtnText: {
    ...typography.button,
    color: colors.warmIvory,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
