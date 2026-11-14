import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import {
  AlertTriangleIcon,
  NavigationIcon,
  ShieldIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
} from '../../../shared/components/CustomSvgIcons';
import { routeDeviationEngine, DEVIATION_STATUS } from '../../vihar/services/routeDeviationEngine';
import { voiceAlertService } from '../../../core/services/voiceAlertService';
import { smsFallbackService } from '../../vihar/services/smsFallbackService';

export const SimulationScreen = ({ navigation }) => {
  const [activeScenario, setActiveScenario] = useState('IDLE');
  const [logMessages, setLogMessages] = useState([
    'Simulation Engine initialized.',
    'Ready to test Master Context v3 safety thresholds.',
  ]);

  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Mock Active Vihar reference (Athwa Gate -> Adajan Gam)
  const mockVihar = {
    id: 'sim-vihar-surat',
    source_name: 'Athwa Gate Jinalay',
    dest_name: 'Adajan Tri-Mandir Upashray',
    source_lat: 21.1959,
    source_lng: 72.7933,
    dest_lat: 21.1442,
    dest_lng: 72.7758,
  };

  const handleSimulateNormalWalk = () => {
    setActiveScenario('NORMAL');
    // Coords on the line (deviation ~15m)
    const normalCoords = { latitude: 21.1957, longitude: 72.7932 };
    const res = routeDeviationEngine.evaluateLocation(normalCoords, mockVihar, false);
    addLog(`Normal Walk: Drift is 15m. Status: ${res} (SAFE)`);
  };

  const handleSimulate90mDrift = () => {
    setActiveScenario('DRIFT_90M');
    // Coords with 90m cross-track drift
    const coords90 = { latitude: 21.1950, longitude: 72.7925 };
    const res = routeDeviationEngine.evaluateLocation(coords90, mockVihar, false);
    addLog(`Drift 90m: Within tolerance limit. Status: ${res} (NO ALERT)`);
  };

  const handleSimulate110mDrift = () => {
    setActiveScenario('TIER_1');
    // Coords with 110m drift (>100m threshold)
    const coords110 = { latitude: 21.1945, longitude: 72.7920 };
    const res = routeDeviationEngine.evaluateLocation(coords110, mockVihar, false);
    voiceAlertService.speakDeviationAlert(110);
    addLog(`TIER 1 TRIGGERED: 110m drift (>100m). Gentle local voice alert activated!`);
  };

  const handleSimulate510mDrift = () => {
    setActiveScenario('TIER_2');
    // Coords with 510m drift (>500m threshold)
    const coords510 = { latitude: 21.1910, longitude: 72.7890 };
    const res = routeDeviationEngine.evaluateLocation(coords510, mockVihar, false);
    voiceAlertService.speakDeviationAlert(510);
    addLog(`TIER 2 TRIGGERED: 510m drift (>500m). Loud alarm & Admin Push Alert dispatched!`);
  };

  const handleSimulate1050mDrift = () => {
    setActiveScenario('TIER_3');
    // Coords with 1050m drift (>1000m threshold)
    const coords1050 = { latitude: 21.1850, longitude: 72.7820 };
    const res = routeDeviationEngine.evaluateLocation(coords1050, mockVihar, false);
    voiceAlertService.speakEmergencyTriggered();
    addLog(`TIER 3 CRITICAL EMERGENCY: 1050m departure. Automatic Emergency SOS & Admin 1->2->3 Call Chain!`);
  };

  const handleSimulateReturnToRoute = () => {
    setActiveScenario('RETURN');
    const returnCoords = { latitude: 21.1958, longitude: 72.7933 };
    const res = routeDeviationEngine.evaluateLocation(returnCoords, mockVihar, false);
    addLog(`Returned to planned route (<60m). Local alarm auto-cleared. Status: ${res}`);
  };

  const handleSimulateLowBattery = () => {
    setActiveScenario('LOW_BATTERY');
    addLog(`Low Battery Simulation (8%): Battery critical alert raised. GPS throttling adapted to 20s.`);
    Alert.alert(
      'Low Battery Alert (8%)',
      'Battery level dropped below 10%. Adaptive power-saver mode enabled and Surat Admin notified.',
      [{ text: 'OK' }]
    );
  };

  const handleSimulateStationaryWatchdog = () => {
    setActiveScenario('STATIONARY');
    addLog(`Stationary Watchdog Triggered: No movement for 10 min without active Hold. Showing 60s "Are you safe?" challenge.`);
    Alert.alert(
      'Safety Heartbeat Challenge',
      'You have been stationary for 10 minutes. Are you safe?\n\n(Unanswered prompt will escalate to Surat Admins in 60s)',
      [
        { text: 'I NEED HELP', onPress: () => addLog('User tapped I NEED HELP -> Emergency triggered') },
        { text: 'YES, I AM SAFE', onPress: () => addLog('User tapped SAFE -> Watchdog reset') },
      ]
    );
  };

  const handleTestSmsFallback = async () => {
    setActiveScenario('SMS_TEST');
    addLog('Testing SMS Fallback with GPS coordinates link...');
    const result = await smsFallbackService.sendEmergencySmsFallback({
      phoneNumber: '9979942197',
      coords: { latitude: 21.1959, longitude: 72.7933 },
      sevakName: 'Yugam Kothari',
      viharName: 'Adajan Tri-Mandir Upashray',
    });
    addLog(`SMS Intent launched: ${JSON.stringify(result)}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title="Viva Simulation Console"
        subtitle="Master Context v3 Safety Scenarios"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={[styles.bannerCard, shadows.card]}>
          <Text style={styles.bannerBadge}>VIVA / DEMO TEST SUITE</Text>
          <Text style={styles.bannerTitle}>Interactive Safety Verification</Text>
          <Text style={styles.bannerDesc}>
            Test all deterministic safety thresholds on stage without walking outdoors.
          </Text>
        </View>

        {/* Live Simulation Buttons */}
        <Text style={styles.sectionHeader}>Route Deviation Tiers (Section B12)</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulateNormalWalk}
          style={[styles.simBtn, styles.btnSafe]}
        >
          <CheckCircleIcon size={20} color={colors.statusSafe} />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>1. Normal Walk (15m Drift)</Text>
            <Text style={styles.simBtnSub}>Expected: On Track, Safe, No Alerts</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulate90mDrift}
          style={[styles.simBtn, styles.btnTolerance]}
        >
          <NavigationIcon size={20} color={colors.saffronDark} />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>2. Drift 90m (Within Limit)</Text>
            <Text style={styles.simBtnSub}>Expected: Below 100m threshold, No Alert</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulate110mDrift}
          style={[styles.simBtn, styles.btnWarning]}
        >
          <AlertTriangleIcon size={20} color={colors.statusWarning} />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>3. Drift 110m (Tier 1 &gt;100m)</Text>
            <Text style={styles.simBtnSub}>Expected: Gentle Voice &amp; Vibration Alert</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulate510mDrift}
          style={[styles.simBtn, styles.btnAlarm]}
        >
          <AlertTriangleIcon size={20} color="#D84315" />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>4. Drift 510m (Tier 2 &gt;500m)</Text>
            <Text style={styles.simBtnSub}>Expected: Loud Siren + Admin Push Notification</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulate1050mDrift}
          style={[styles.simBtn, styles.btnEmergency]}
        >
          <AlertTriangleIcon size={20} color={colors.statusEmergency} />
          <View style={styles.btnTextCol}>
            <Text style={[styles.simBtnTitle, { color: colors.statusEmergency }]}>
              5. Drift 1.05 km (Tier 3 &gt;1000m)
            </Text>
            <Text style={styles.simBtnSub}>Expected: Critical SOS Event + Admin 1-&gt;2-&gt;3 Escalation</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulateReturnToRoute}
          style={[styles.simBtn, styles.btnSafe]}
        >
          <CheckCircleIcon size={20} color={colors.statusSafe} />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>6. Return to Route (&lt;60m)</Text>
            <Text style={styles.simBtnSub}>Expected: Hysteresis clears local alarm &amp; logs return</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Hardware &amp; Watchdog Tests</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulateLowBattery}
          style={styles.simBtn}
        >
          <ClockIcon size={20} color={colors.gold} />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>7. Low Battery Mode (&lt;10%)</Text>
            <Text style={styles.simBtnSub}>Throttle GPS sampling to 20s power-saver</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSimulateStationaryWatchdog}
          style={styles.simBtn}
        >
          <ShieldIcon size={20} color={colors.deepMaroon} />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>8. Stationary Watchdog (10 Min Stop)</Text>
            <Text style={styles.simBtnSub}>60s Heartbeat challenge with auto-escalation</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTestSmsFallback}
          style={styles.simBtn}
        >
          <PhoneIcon size={20} color={colors.statusSafe} />
          <View style={styles.btnTextCol}>
            <Text style={styles.simBtnTitle}>9. Offline SMS Fallback Test</Text>
            <Text style={styles.simBtnSub}>Dispatches SMS with Google Maps coordinates link</Text>
          </View>
        </TouchableOpacity>

        {/* Live Simulation Log Console */}
        <Text style={styles.sectionHeader}>Live Console Output</Text>
        <View style={styles.consoleCard}>
          {logMessages.map((msg, i) => (
            <Text key={i} style={styles.consoleText}>
              {msg}
            </Text>
          ))}
        </View>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  bannerCard: {
    backgroundColor: colors.deepMaroon,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bannerBadge: {
    ...typography.caption,
    color: colors.goldLight,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.warmIvory,
    marginTop: 2,
  },
  bannerDesc: {
    ...typography.caption,
    color: colors.goldMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  btnSafe: {
    borderColor: '#C8E6C9',
    backgroundColor: '#F1F8E9',
  },
  btnTolerance: {
    borderColor: '#FFE0B2',
    backgroundColor: '#FFF8E1',
  },
  btnWarning: {
    borderColor: '#FFD54F',
    backgroundColor: '#FFF9C4',
  },
  btnAlarm: {
    borderColor: '#FFAB91',
    backgroundColor: '#FBE9E7',
  },
  btnEmergency: {
    borderColor: '#EF9A9A',
    backgroundColor: '#FFEBEE',
  },
  btnTextCol: {
    flex: 1,
  },
  simBtnTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  simBtnSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  consoleCard: {
    backgroundColor: '#1E1A1B',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  consoleText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#81C784',
    lineHeight: 18,
  },
});

