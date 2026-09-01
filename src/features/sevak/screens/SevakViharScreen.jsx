import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { EmergencyButton } from '../../../shared/components/EmergencyButton';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';
import { NavigationIcon } from '../../../shared/components/CustomSvgIcons';
import { t } from '../../../core/localization/i18n';

export const SevakViharScreen = ({ navigation }) => {
  const [isViharActive, setIsViharActive] = useState(true);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);

  const handleTriggerSOS = () => {
    setSosModalVisible(false);
    alert('🚨 SOS Alert Dispatched to Regional Vihar Admins!');
  };

  const handleEndVihar = () => {
    setEndModalVisible(false);
    setIsViharActive(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title={isViharActive ? 'Active Vihar • LIVE' : 'Start Vihar'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Placeholder Map Card */}
        <View style={[styles.mapPlaceholder, shadows.card]}>
          <View style={styles.iconCircle}>
            <NavigationIcon size={36} color={colors.gold} />
          </View>
          <Text style={styles.mapTitle}>Google Maps Route View</Text>
          <Text style={styles.mapSubtitle}>
            {isViharActive ? 'Live GPS tracking actively recording trajectory' : 'Select destination to start tracking'}
          </Text>
        </View>

        {/* Vihar Route Metrics */}
        {isViharActive && (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.cardHeader}>Destination</Text>
            <Text style={styles.destinationName}>Girnar Jain Temple</Text>

            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Remaining</Text>
                <Text style={styles.metricValue}>4.2 km</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>ETA</Text>
                <Text style={styles.metricValue}>5:42 PM</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Speed</Text>
                <Text style={styles.metricValue}>4.8 km/h</Text>
              </View>
            </View>

            {/* Telemetry Bar */}
            <View style={styles.telemetryBar}>
              <Text style={styles.telemetryText}>GPS: Active</Text>
              <Text style={styles.telemetryText}>Internet: Online</Text>
              <Text style={styles.telemetryText}>Battery: 78%</Text>
            </View>
          </View>
        )}

        {isViharActive ? (
          <>
            {/* Prominent SOS Button exclusively on Active Vihar Screen */}
            <EmergencyButton
              title={t('sevak.sos_button')}
              subtitle="Immediate emergency escalation to nearby Sevaks & Admins"
              onPress={() => setSosModalVisible(true)}
              style={styles.sosButton}
            />

            {/* End Vihar Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setEndModalVisible(true)}
              style={[styles.endViharBtn, shadows.subtle]}
            >
              <View style={styles.redDot} />
              <Text style={styles.endViharText}>END VIHAR</Text>
            </TouchableOpacity>
          </>
        ) : (
          <PrimaryButton
            title="+ START NEW VIHAR"
            variant="saffron"
            onPress={() => setIsViharActive(true)}
            style={styles.startBtn}
          />
        )}
      </ScrollView>

      {/* SOS Confirmation Dialog */}
      <ConfirmationDialog
        visible={sosModalVisible}
        title={t('sevak.sos_title')}
        message={t('sevak.sos_confirm')}
        confirmText={t('sevak.sos_trigger')}
        cancelText={t('common.cancel')}
        isDestructive
        onConfirm={handleTriggerSOS}
        onCancel={() => setSosModalVisible(false)}
      />

      {/* End Vihar Confirmation Dialog */}
      <ConfirmationDialog
        visible={endModalVisible}
        title="Complete Vihar"
        message="Are you sure you have arrived at your destination and want to conclude this vihar?"
        confirmText="Yes, End Vihar"
        cancelText={t('common.cancel')}
        onConfirm={handleEndVihar}
        onCancel={() => setEndModalVisible(false)}
      />
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
    paddingBottom: spacing.xxl,
  },
  mapPlaceholder: {
    height: 220,
    backgroundColor: colors.charcoal,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(201, 164, 76, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  mapTitle: {
    ...typography.h3,
    color: colors.warmIvory,
    marginBottom: 4,
  },
  mapSubtitle: {
    ...typography.caption,
    color: colors.goldMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  destinationName: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.softCream,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  telemetryText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '600',
  },
  sosButton: {
    marginBottom: spacing.md,
  },
  endViharBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(189, 44, 44, 0.3)',
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.statusEmergency,
  },
  endViharText: {
    ...typography.bodyMedium,
    color: colors.statusEmergency,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  startBtn: {
    marginTop: spacing.md,
  },
});
