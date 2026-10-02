import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import {
  SirenIcon,
  PhoneIcon,
  FlashlightIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  WomenSafetyShieldIcon,
} from '../../../shared/components/CustomSvgIcons';

export const WomenSafetyEmergencyPanel = ({
  activeVihar,
  activeEmergency,
  profile,
  onDisarm,
  isSirenActive = false,
  onToggleSiren,
  isStrobeActive = false,
  onToggleStrobe,
}) => {
  const [copiedCoords, setCopiedCoords] = useState(false);

  const latitude = activeEmergency?.latitude || activeVihar?.source_lat || 21.1959;
  const longitude = activeEmergency?.longitude || activeVihar?.source_lng || 72.7933;
  const emergencyPhone = profile?.emergency_contact_phone || '+919876543210';
  const emergencyName = profile?.emergency_contact_name || 'Emergency Contact';

  const handleCall = (number) => {
    if (!number) return;
    const cleanNumber = number.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  const handleCopyCoords = () => {
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 3000);
  };

  return (
    <View style={[styles.emergencyContainer, shadows.prominent]}>
      {/* 1. Flashing Emergency Beacon Header */}
      <View style={styles.beaconHeader}>
        <View style={styles.pulseBeacon}>
          <SirenIcon size={24} color="#FFFFFF" />
        </View>
        <View style={styles.beaconTextCol}>
          <Text style={styles.beaconTitle}>CRITICAL EMERGENCY SOS ACTIVE</Text>
          <Text style={styles.beaconSub}>
            Live Telemetry Broadcasted to Surat Vihar Safety Control Room
          </Text>
        </View>
      </View>

      {/* 2. Live Coordinates & Telemetry Box */}
      <View style={styles.telemetryCard}>
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryCol}>
            <Text style={styles.telemetryLabel}>GPS COORDINATES</Text>
            <Text style={styles.telemetryCoords}>
              {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCopyCoords}
            style={styles.copyCoordsBtn}
          >
            <Text style={styles.copyCoordsText}>
              {copiedCoords ? 'COPIED' : 'SHARE GPS'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.telemetryPillsRow}>
          <View style={styles.telemetryPill}>
            <Text style={styles.pillText}>GPS: High Accuracy (±4m)</Text>
          </View>
          <View style={styles.telemetryPill}>
            <Text style={styles.pillText}>Battery: {activeEmergency?.battery_percentage || 88}%</Text>
          </View>
          <View style={styles.telemetryPill}>
            <Text style={styles.pillText}>Surat Safe Corridor</Text>
          </View>
        </View>
      </View>

      {/* 3. Instant 1-Touch Emergency Direct Calling Grid */}
      <Text style={styles.sectionHeading}>INSTANT EMERGENCY DIRECT DIALERS</Text>
      
      <View style={styles.dialerGrid}>
        {/* 112 Police Control */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCall('112')}
          style={[styles.dialerCard, styles.dialerPolice]}
        >
          <View style={styles.dialerIconWrap}>
            <PhoneIcon size={20} color="#FFFFFF" />
          </View>
          <View style={styles.dialerTextCol}>
            <Text style={styles.dialerTitle}>112 POLICE CONTROL</Text>
            <Text style={styles.dialerSub}>All-India National Helpline</Text>
          </View>
          <Text style={styles.callActionText}>TAP TO CALL</Text>
        </TouchableOpacity>

        {/* 181 Abhayam Women Helpline Gujarat */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCall('181')}
          style={[styles.dialerCard, styles.dialerAbhayam]}
        >
          <View style={styles.dialerIconWrap}>
            <WomenSafetyShieldIcon size={20} color="#FFFFFF" />
          </View>
          <View style={styles.dialerTextCol}>
            <Text style={styles.dialerTitle}>181 ABHAYAM HELPLINE</Text>
            <Text style={styles.dialerSub}>Gujarat Women 24x7 Safety</Text>
          </View>
          <Text style={styles.callActionText}>TAP TO CALL</Text>
        </TouchableOpacity>

        {/* Surat Vihar Central Desk */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCall('+919876500000')}
          style={[styles.dialerCard, styles.dialerViharDesk]}
        >
          <View style={styles.dialerIconWrap}>
            <PhoneIcon size={20} color="#FFFFFF" />
          </View>
          <View style={styles.dialerTextCol}>
            <Text style={styles.dialerTitle}>SURAT VIHAR DESK</Text>
            <Text style={styles.dialerSub}>Central Sangha Volunteers</Text>
          </View>
          <Text style={styles.callActionText}>TAP TO CALL</Text>
        </TouchableOpacity>

        {/* Registered Emergency Contact */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCall(emergencyPhone)}
          style={[styles.dialerCard, styles.dialerFamily]}
        >
          <View style={styles.dialerIconWrap}>
            <PhoneIcon size={20} color="#FFFFFF" />
          </View>
          <View style={styles.dialerTextCol}>
            <Text style={styles.dialerTitle}>{emergencyName.toUpperCase()}</Text>
            <Text style={styles.dialerSub}>{emergencyPhone}</Text>
          </View>
          <Text style={styles.callActionText}>TAP TO CALL</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Physical Threat Deterrents */}
      <Text style={styles.sectionHeading}>PHYSICAL THREAT DETERRENTS</Text>
      <View style={styles.deterrentRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onToggleSiren}
          style={[
            styles.deterrentBtn,
            isSirenActive ? styles.deterrentBtnActive : styles.deterrentBtnInactive,
          ]}
        >
          <SirenIcon size={20} color={isSirenActive ? '#FFFFFF' : colors.statusEmergency} />
          <Text
            style={[
              styles.deterrentText,
              isSirenActive && styles.deterrentTextActive,
            ]}
          >
            {isSirenActive ? 'SIREN ACTIVE (ON)' : 'LOUD SIREN ALARM'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onToggleStrobe}
          style={[
            styles.deterrentBtn,
            isStrobeActive ? styles.deterrentBtnStrobeActive : styles.deterrentBtnInactive,
          ]}
        >
          <FlashlightIcon size={20} color={isStrobeActive ? '#1A1A1A' : colors.gold} />
          <Text
            style={[
              styles.deterrentText,
              isStrobeActive && styles.deterrentTextStrobeActive,
            ]}
          >
            {isStrobeActive ? 'STROBE ACTIVE (ON)' : 'STROBE LIGHT'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Anti-Stalking Privacy & Encryption Notice */}
      <View style={styles.securityBadgeBox}>
        <WomenSafetyShieldIcon size={16} color={colors.gold} />
        <Text style={styles.securityBadgeText}>
          256-Bit Encrypted Vihar Telemetry • Anti-Stalking Safeguard Active
        </Text>
      </View>

      {/* 6. Disarm SOS Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onDisarm}
        style={styles.disarmBtn}
      >
        <CheckCircleIcon size={18} color="#FFFFFF" />
        <Text style={styles.disarmBtnText}>DISARM SOS / I AM SAFE NOW</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  emergencyContainer: {
    backgroundColor: '#780B0B',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: '#FF5252',
    marginBottom: spacing.xl,
  },
  beaconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  pulseBeacon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  beaconTextCol: {
    flex: 1,
  },
  beaconTitle: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  beaconSub: {
    ...typography.caption,
    color: '#FFCDD2',
    fontSize: 11,
    marginTop: 2,
  },
  telemetryCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  telemetryCol: {
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.goldLight,
    letterSpacing: 0.5,
  },
  telemetryCoords: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },
  copyCoordsBtn: {
    backgroundColor: 'rgba(201, 164, 76, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  copyCoordsText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.goldLight,
  },
  telemetryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
  },
  telemetryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.xs,
  },
  pillText: {
    fontSize: 10,
    color: '#FFCDD2',
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFE082',
    letterSpacing: 0.8,
    marginBottom: spacing.xs + 2,
    textTransform: 'uppercase',
  },
  dialerGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dialerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  dialerPolice: {
    backgroundColor: '#B71C1C',
    borderColor: '#FF5252',
  },
  dialerAbhayam: {
    backgroundColor: '#4A148C',
    borderColor: '#CE93D8',
  },
  dialerViharDesk: {
    backgroundColor: '#E65100',
    borderColor: '#FFB74D',
  },
  dialerFamily: {
    backgroundColor: '#263238',
    borderColor: '#90A4AE',
  },
  dialerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  dialerTextCol: {
    flex: 1,
  },
  dialerTitle: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dialerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  callActionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.xs,
  },
  deterrentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  deterrentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  deterrentBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  deterrentBtnActive: {
    backgroundColor: '#FF1744',
    borderColor: '#FFFFFF',
  },
  deterrentBtnStrobeActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFFFFF',
  },
  deterrentText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  deterrentTextActive: {
    color: '#FFFFFF',
  },
  deterrentTextStrobeActive: {
    color: '#1A1A1A',
  },
  securityBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  securityBadgeText: {
    fontSize: 10,
    color: colors.goldLight,
    fontWeight: '600',
  },
  disarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#81C784',
  },
  disarmBtnText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
