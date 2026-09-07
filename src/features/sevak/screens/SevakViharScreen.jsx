import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SecondaryButton } from '../../../shared/components/SecondaryButton';
import { EmergencyButton } from '../../../shared/components/EmergencyButton';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';
import {
  NavigationIcon,
  ShieldIcon,
  CheckCircleIcon,
} from '../../../shared/components/CustomSvgIcons';
import { useAuthStore } from '../../auth/hooks/useAuthStore';
import { useViharStore } from '../../vihar/hooks/useViharStore';
import { useAlertStore } from '../../../shared/hooks/useAlertStore';
import {
  JAIN_UPASHRAYS,
  VIHAR_TIME_PRESETS,
  calculateViharRouteEstimate,
} from '../../../core/constants/jainUpashrays';
import { alarmService } from '../../vihar/services/alarmService';
import { t } from '../../../core/localization/i18n';

export const SevakViharScreen = ({ navigation }) => {
  const { user, profile } = useAuthStore();
  const { showAlert } = useAlertStore();
  const {
    activeVihar,
    scheduledVihars,
    loadViharState,
    startImmediateVihar,
    scheduleFutureVihar,
    startScheduled,
    completeActiveVihar,
    cancelScheduled,
    isLoading,
  } = useViharStore();

  // Dialog States
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Vihar Creation Form State
  const [creationMode, setCreationMode] = useState('SCHEDULE'); // 'NOW' | 'SCHEDULE'
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedTime, setSelectedTime] = useState('05:30 AM');
  const [sadhvijiName, setSadhvijiName] = useState(
    'Pujya Sadhviji Mayurashriji Maharaj Saheb'
  );
  const [sourceUpashray, setSourceUpashray] = useState(JAIN_UPASHRAYS[0]);
  const [destUpashray, setDestUpashray] = useState(JAIN_UPASHRAYS[2]);
  const [viharNotes, setViharNotes] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(true);

  // Upashray Picker State
  const [isOriginPickerOpen, setIsOriginPickerOpen] = useState(false);
  const [isDestPickerOpen, setIsDestPickerOpen] = useState(false);

  // 30-Minute Wake-up Alarm Banner State
  const [showWakeupAlert, setShowWakeupAlert] = useState(false);
  const [activePreAlert, setActivePreAlert] = useState(null);

  // Checklist State for Preparation
  const [checklist, setChecklist] = useState(
    alarmService.getPreparationChecklist()
  );

  // Load state on mount
  useEffect(() => {
    if (user?.id) {
      loadViharState(user.id);
    }
  }, [user?.id]);

  // Check 30-minute pre-vihar alarm for scheduled vihars
  useEffect(() => {
    if (scheduledVihars && scheduledVihars.length > 0) {
      const firstScheduled = scheduledVihars[0];
      const departureTime = firstScheduled.notes?.includes('Time:')
        ? firstScheduled.notes.split('Time:')[1]?.trim()?.split(' ')[0] + ' AM'
        : '05:30 AM';

      const info = alarmService.getAlarmTime('Today', departureTime);
      setActivePreAlert(info);

      // Trigger wake-up alert if scheduled vihar exists
      setShowWakeupAlert(true);
    } else {
      setShowWakeupAlert(false);
    }
  }, [scheduledVihars]);

  // Dynamic Route Calculation
  const routeEstimate = calculateViharRouteEstimate(
    sourceUpashray.lat,
    sourceUpashray.lng,
    destUpashray.lat,
    destUpashray.lng
  );

  const handleOpenCreateModal = (mode = 'NOW') => {
    setCreationMode(mode);
    setIsCreateModalOpen(true);
  };

  const handleConfirmVihar = async () => {
    if (sourceUpashray.id === destUpashray.id) {
      showAlert({
        type: 'WARNING',
        title: 'Invalid Route',
        message: 'Source and Destination Upashrays cannot be the same. Please choose different locations.',
        confirmText: 'OK',
      });
      return;
    }

    const payload = {
      title: `Vihar to ${destUpashray.name}`,
      source_name: `${sourceUpashray.name} (${sourceUpashray.area})`,
      source_lat: sourceUpashray.lat,
      source_lng: sourceUpashray.lng,
      dest_name: `${destUpashray.name} (${destUpashray.area})`,
      dest_lat: destUpashray.lat,
      dest_lng: destUpashray.lng,
      total_distance_km: routeEstimate.distanceKm,
      estimated_duration_mins: routeEstimate.durationMinutes,
      notes: `Sadhviji: ${sadhvijiName.trim()} | Date: ${selectedDate} | Time: ${selectedTime} | ${viharNotes.trim()}`,
    };

    if (creationMode === 'NOW') {
      const success = await startImmediateVihar(user.id, payload);
      if (success) {
        setIsCreateModalOpen(false);
        showAlert({
          type: 'JINENDRA',
          title: 'Jai Jinendra',
          message: 'Vihar has started. GPS tracking and safety telemetry are now active.',
          confirmText: 'Jai Jinendra',
          confirmVariant: 'saffron',
        });
      }
    } else {
      const success = await scheduleFutureVihar(user.id, payload);
      if (success) {
        setIsCreateModalOpen(false);
        const alarmInfo = alarmService.getAlarmTime(selectedDate, selectedTime);
        showAlert({
          type: 'SUCCESS',
          title: 'Vihar Scheduled',
          message: `Vihar scheduled for ${selectedDate} at ${selectedTime}.\n\n30-Minute Wake-up Alarm set for ${alarmInfo.alarmTimeString}.`,
          confirmText: 'Done',
          confirmVariant: 'saffron',
        });
      }
    }
  };

  const handleTriggerSOS = () => {
    setSosModalVisible(false);
    showAlert({
      type: 'ERROR',
      title: 'Emergency SOS Dispatched',
      message: 'High-priority alert has been broadcast to regional safety administrators and nearby Sevaks with your live coordinates.',
      confirmText: 'Acknowledge',
      confirmVariant: 'emergency',
    });
  };

  const handleEndVihar = async () => {
    setEndModalVisible(false);
    if (activeVihar?.id) {
      await completeActiveVihar(activeVihar.id, {
        total_distance_km: activeVihar.total_distance_km || 4.8,
      });
      showAlert({
        type: 'SUCCESS',
        title: 'Vihar Concluded',
        message: 'Vihar Seva completed safely. Seva records have been preserved.',
        confirmText: 'Jai Jinendra',
        confirmVariant: 'saffron',
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title={activeVihar ? 'Active Vihar • LIVE' : 'Vihar Seva Dashboard'}
        subtitle={activeVihar ? `To ${activeVihar.dest_name}` : 'Safe Sadhviji Movement'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ============================================================ */}
        {/* CASE 1: ACTIVE VIHAR LIVE VIEW */}
        {/* ============================================================ */}
        {activeVihar ? (
          <>
            {/* Live Map Card */}
            <View style={[styles.mapCard, shadows.card]}>
              <View style={styles.liveBadgeRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveBadgeText}>LIVE GPS TRACKING ACTIVE</Text>
              </View>

              <View style={styles.iconCircle}>
                <NavigationIcon size={38} color={colors.gold} />
              </View>

              <Text style={styles.mapTitle}>Route Navigation Active</Text>
              <Text style={styles.mapSubtitle}>
                {activeVihar.source_name} → {activeVihar.dest_name}
              </Text>

              <View style={styles.telemetryBar}>
                <Text style={styles.telemetryText}>GPS: Active</Text>
                <Text style={styles.telemetryText}>Network: Online</Text>
                <Text style={styles.telemetryText}>Battery: 88%</Text>
              </View>
            </View>

            {/* Vihar Route Metrics */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardHeader}>DESTINATION UPASHRAY</Text>
              <Text style={styles.destinationName}>{activeVihar.dest_name}</Text>

              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Distance</Text>
                  <Text style={styles.metricValue}>
                    {activeVihar.total_distance_km || '4.5'} km
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Est. Duration</Text>
                  <Text style={styles.metricValue}>
                    {activeVihar.estimated_duration_mins || '60'} mins
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Avg Speed</Text>
                  <Text style={styles.metricValue}>4.2 km/h</Text>
                </View>
              </View>

              {activeVihar.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>Notes: {activeVihar.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Emergency SOS Button */}
            <EmergencyButton
              title="SOS EMERGENCY"
              subtitle="1-Touch immediate alert to regional safety administrators"
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
              <Text style={styles.endViharText}>END VIHAR SEVA</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* ============================================================ */
          /* CASE 2: IDLE STATE (VIHAR NOT STARTED BY DEFAULT) */
          /* ============================================================ */
          <>
            {/* 30-Minute Wake-up Alarm Banner (if scheduled vihar exists) */}
            {showWakeupAlert && alarmInfo ? (
              <View style={[styles.alarmBannerCard, shadows.elevated]}>
                <View style={styles.alarmBannerHeader}>
                  <View style={styles.alarmIconCircle}>
                    <Text style={styles.alarmTagText}>ALARM</Text>
                  </View>
                  <View style={styles.alarmHeaderTextCol}>
                    <Text style={styles.alarmBannerTitle}>
                      30-Min Pre-Vihar Wake-up Alert
                    </Text>
                    <Text style={styles.alarmBannerSub}>
                      Scheduled Alarm set for {alarmInfo.alarmTimeString}
                    </Text>
                  </View>
                </View>

                <Text style={styles.checklistTitle}>
                  Pre-Vihar Seva Preparation Checklist:
                </Text>
                {alarmService.getPreparationChecklist().map((item) => (
                  <View key={item.id} style={styles.checklistItem}>
                    <Text style={styles.checklistCheck}>•</Text>
                    <View style={styles.checklistTextCol}>
                      <Text style={styles.checklistHeading}>{item.title}</Text>
                      <Text style={styles.checklistDetail}>{item.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Idle Welcome Spiritual Card */}
            <View style={[styles.idleHeroCard, shadows.card]}>
              <View style={styles.idleAuraCircle}>
                <Text style={styles.idleAuraText}>VIHAR</Text>
              </View>
              <Text style={styles.idleTitle}>No Active Vihar in Progress</Text>
              <Text style={styles.idleSubtitle}>
                Ready to assist Pujya Sadhviji Bhagwants? You can start a Vihar immediately or schedule one for early morning with a 30-minute wake-up alarm.
              </Text>

              <View style={styles.idleBtnRow}>
                <PrimaryButton
                  title="START VIHAR NOW"
                  variant="saffron"
                  onPress={() => handleOpenCreateModal('NOW')}
                  style={styles.heroBtn}
                />
                <SecondaryButton
                  title="SCHEDULE VIHAR"
                  onPress={() => handleOpenCreateModal('SCHEDULE')}
                  style={styles.heroBtnSecondary}
                />
              </View>
            </View>

            {/* Scheduled Vihars Section */}
            {scheduledVihars && scheduledVihars.length > 0 ? (
              <View style={styles.scheduledSection}>
                <Text style={styles.sectionHeading}>
                  Scheduled Upcoming Vihars ({scheduledVihars.length})
                </Text>

                {scheduledVihars.map((vihar) => (
                  <View key={vihar.id} style={[styles.scheduledCard, shadows.card]}>
                    <View style={styles.scheduledCardHeader}>
                      <View style={styles.scheduledTimeBadge}>
                        <Text style={styles.scheduledTimeText}>
                          Upcoming Vihar
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => cancelScheduled(vihar.id)}
                        style={styles.cancelChip}
                      >
                        <Text style={styles.cancelChipText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.scheduledRouteText}>
                      {vihar.source_name} → {vihar.dest_name}
                    </Text>

                    <View style={styles.alarmNoticeBox}>
                      <Text style={styles.alarmNoticeTag}>ALARM ACTIVE</Text>
                      <Text style={styles.alarmNoticeText}>
                        30-Min Wake-up Alarm set for 05:00 AM
                      </Text>
                    </View>

                    <View style={styles.scheduledMetricsRow}>
                      <Text style={styles.scheduledMetricItem}>
                        Distance: {vihar.total_distance_km || '4.5'} km
                      </Text>
                      <Text style={styles.scheduledMetricItem}>
                        Est: {vihar.estimated_duration_mins || '60'} mins
                      </Text>
                    </View>

                    <PrimaryButton
                      title="Start Vihar Early"
                      variant="maroon"
                      onPress={() => startScheduled(vihar.id)}
                      style={styles.startEarlyBtn}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyScheduleCard, shadows.subtle]}>
                <Text style={styles.emptyScheduleTitle}>No Upcoming Scheduled Vihars</Text>
                <Text style={styles.emptyScheduleSub}>
                  Tap "Schedule Vihar" above to set up tomorrow's early morning Vihar with a 30-minute pre-alarm.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* VIHAR CREATION & SCHEDULING MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {creationMode === 'NOW' ? 'Start Vihar Now' : 'Schedule Vihar'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Switcher */}
            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                onPress={() => setCreationMode('NOW')}
                style={[
                  styles.modeTab,
                  creationMode === 'NOW' && styles.modeTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    creationMode === 'NOW' && styles.modeTabTextActive,
                  ]}
                >
                  Start Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCreationMode('SCHEDULE')}
                style={[
                  styles.modeTab,
                  creationMode === 'SCHEDULE' && styles.modeTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    creationMode === 'SCHEDULE' && styles.modeTabTextActive,
                  ]}
                >
                  Schedule for Later
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Date & Time (if Scheduled) */}
              {creationMode === 'SCHEDULE' && (
                <>
                  <Text style={styles.inputLabel}>Departure Date *</Text>
                  <View style={styles.chipsRow}>
                    {['Today', 'Tomorrow', 'Custom Date'].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setSelectedDate(d)}
                        style={[
                          styles.chip,
                          selectedDate === d && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedDate === d && styles.chipTextActive,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>
                    Departure Time (Early Morning) *
                  </Text>
                  <View style={styles.chipsRowWrap}>
                    {VIHAR_TIME_PRESETS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setSelectedTime(t)}
                        style={[
                          styles.timeChip,
                          selectedTime === t && styles.timeChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            selectedTime === t && styles.timeChipTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 30-Minute Alarm Alert Notice */}
                  <View style={styles.alarmConfigBox}>
                    <View style={styles.alarmBadgeSmall}>
                      <Text style={styles.alarmBadgeSmallText}>ALARM</Text>
                    </View>
                    <View style={styles.alarmConfigTextCol}>
                      <Text style={styles.alarmConfigTitle}>
                        30-Minute Pre-Vihar Wake-up Alarm
                      </Text>
                      <Text style={styles.alarmConfigSub}>
                        Alarm will chime at{' '}
                        {
                          alarmService.getAlarmTime(selectedDate, selectedTime)
                            .alarmTimeString
                        }{' '}
                        with the Seva preparation checklist.
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Sadhviji Bhagwant Name */}
              <Text style={styles.inputLabel}>Pujya Sadhviji Bhagwant / Group *</Text>
              <TextInput
                value={sadhvijiName}
                onChangeText={setSadhvijiName}
                placeholder="e.g. Pujya Mayurashriji M.S."
                placeholderTextColor={colors.textMuted}
                style={styles.textInputBox}
              />

              {/* Source Upashray Selection */}
              <Text style={styles.inputLabel}>Source (Origin Upashray) *</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsOriginPickerOpen(true)}
                style={styles.pickerBox}
              >
                <View>
                  <Text style={styles.pickerValueTitle}>{sourceUpashray.name}</Text>
                  <Text style={styles.pickerValueSub}>
                    {sourceUpashray.address}
                  </Text>
                </View>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Destination Upashray Selection */}
              <Text style={styles.inputLabel}>
                Destination (Arrival Upashray) *
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDestPickerOpen(true)}
                style={styles.pickerBox}
              >
                <View>
                  <Text style={styles.pickerValueTitle}>{destUpashray.name}</Text>
                  <Text style={styles.pickerValueSub}>
                    {destUpashray.address}
                  </Text>
                </View>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Route Estimation Card */}
              <View style={styles.estimateCard}>
                <Text style={styles.estimateTitle}>Calculated Route Preview</Text>
                <View style={styles.estimateRow}>
                  <View style={styles.estimateBox}>
                    <Text style={styles.estimateVal}>
                      {routeEstimate.distanceKm} km
                    </Text>
                    <Text style={styles.estimateLbl}>Walking Distance</Text>
                  </View>
                  <View style={styles.estimateDivider} />
                  <View style={styles.estimateBox}>
                    <Text style={styles.estimateVal}>
                      ~{routeEstimate.formattedDuration}
                    </Text>
                    <Text style={styles.estimateLbl}>Est. Duration</Text>
                  </View>
                </View>
              </View>

              {/* Optional Notes */}
              <Text style={styles.inputLabel}>Optional Seva Notes</Text>
              <TextInput
                value={viharNotes}
                onChangeText={setViharNotes}
                placeholder="e.g. 3 Sevaks accompanying, water break at Adajan"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInputBox, { height: 60 }]}
                multiline
              />

              {/* Submit Buttons */}
              <View style={styles.modalBtnRow}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => setIsCreateModalOpen(false)}
                  style={styles.modalCancelBtn}
                />
                <PrimaryButton
                  title={
                    creationMode === 'NOW'
                      ? 'Start Vihar'
                      : 'Schedule Vihar'
                  }
                  variant="saffron"
                  loading={isLoading}
                  onPress={handleConfirmVihar}
                  style={styles.modalConfirmBtn}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* UPASHRAY PICKER MODAL (ORIGIN) */}
      <Modal
        visible={isOriginPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOriginPickerOpen(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Starting Upashray</Text>
              <TouchableOpacity
                onPress={() => setIsOriginPickerOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={JAIN_UPASHRAYS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSel = sourceUpashray.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSourceUpashray(item);
                      setIsOriginPickerOpen(false);
                    }}
                    style={[
                      styles.upashrayItem,
                      isSel && styles.upashrayItemActive,
                    ]}
                  >
                    <View style={styles.upashrayTextCol}>
                      <Text
                        style={[
                          styles.upashrayName,
                          isSel && styles.upashrayNameActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.upashrayAddr}>{item.address}</Text>
                    </View>
                    {isSel ? <Text style={styles.checkMark}>Selected</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* UPASHRAY PICKER MODAL (DESTINATION) */}
      <Modal
        visible={isDestPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDestPickerOpen(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalCard, shadows.elevated]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Destination Upashray</Text>
              <TouchableOpacity
                onPress={() => setIsDestPickerOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={JAIN_UPASHRAYS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSel = destUpashray.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setDestUpashray(item);
                      setIsDestPickerOpen(false);
                    }}
                    style={[
                      styles.upashrayItem,
                      isSel && styles.upashrayItemActive,
                    ]}
                  >
                    <View style={styles.upashrayTextCol}>
                      <Text
                        style={[
                          styles.upashrayName,
                          isSel && styles.upashrayNameActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.upashrayAddr}>{item.address}</Text>
                    </View>
                    {isSel ? <Text style={styles.checkMark}>Selected</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* SOS Confirmation Dialog */}
      <ConfirmationDialog
        visible={sosModalVisible}
        title="EMERGENCY SOS ALERT"
        message="Are you sure you want to broadcast an immediate emergency SOS? All regional safety administrators will be alerted with your live location."
        confirmText="TRIGGER SOS NOW"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleTriggerSOS}
        onCancel={() => setSosModalVisible(false)}
      />

      {/* End Vihar Confirmation Dialog */}
      <ConfirmationDialog
        visible={endModalVisible}
        title="Conclude Vihar Seva"
        message="Have you arrived safely at the destination Upashray and wish to end this Vihar session?"
        confirmText="Yes, Complete Vihar"
        cancelText="Keep Tracking"
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
    paddingBottom: spacing.xxxl,
  },

  /* ACTIVE VIHAR STYLES */
  mapCard: {
    backgroundColor: colors.charcoal,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 142, 60, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 142, 60, 0.4)',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSafe,
  },
  liveBadgeText: {
    ...typography.caption,
    color: '#81C784',
    fontWeight: '700',
    letterSpacing: 0.5,
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
    ...typography.bodySmall,
    color: colors.goldLight,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  telemetryText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '600',
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
    marginBottom: spacing.sm,
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
  notesBox: {
    backgroundColor: colors.softCream,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  notesText: {
    ...typography.caption,
    color: colors.deepMaroon,
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

  /* IDLE STATE HERO STYLES */
  idleHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  idleAuraCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.softCream,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  idleAuraText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    letterSpacing: 1,
  },
  idleTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  idleSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  idleBtnRow: {
    width: '100%',
    gap: spacing.sm,
  },
  heroBtn: {
    width: '100%',
  },
  heroBtnSecondary: {
    width: '100%',
  },

  /* 30-MIN PRE-ALARM BANNER */
  alarmBannerCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.lg,
  },
  alarmBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 164, 76, 0.3)',
    paddingBottom: spacing.sm,
  },
  alarmIconCircle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  alarmHeaderTextCol: {
    flex: 1,
  },
  alarmBannerTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  alarmBannerSub: {
    ...typography.caption,
    color: '#8A5D00',
    fontWeight: '600',
  },
  checklistTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  checklistCheck: {
    fontSize: 14,
    color: colors.statusSafe,
    fontWeight: '800',
  },
  checklistTextCol: {
    flex: 1,
  },
  checklistHeading: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  checklistDetail: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  /* SCHEDULED SECTION */
  scheduledSection: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  scheduledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  scheduledCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scheduledTimeBadge: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  scheduledTimeText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  cancelChip: {
    padding: spacing.xs,
  },
  cancelChipText: {
    ...typography.caption,
    color: colors.statusEmergency,
    fontWeight: '700',
  },
  scheduledRouteText: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  alarmNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.softCream,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  alarmNoticeTag: {
    ...typography.caption,
    fontSize: 9,
    color: colors.gold,
    fontWeight: '800',
  },
  alarmNoticeText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '600',
  },
  scheduledMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scheduledMetricItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  startEarlyBtn: {
    marginTop: spacing.xs,
  },
  emptyScheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyScheduleTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyScheduleSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  /* CREATION MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: colors.deepMaroon,
  },
  modeTabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: colors.warmIvory,
  },
  modalScroll: {
    paddingBottom: spacing.xxl,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  chipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.warmIvory,
    fontWeight: '700',
  },
  chipsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.softCream,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeChipActive: {
    backgroundColor: colors.deepMaroon,
    borderColor: colors.deepMaroon,
  },
  timeChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timeChipTextActive: {
    color: colors.warmIvory,
    fontWeight: '700',
  },
  alarmConfigBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alarmBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.gold,
  },
  alarmBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  alarmConfigTextCol: {
    flex: 1,
  },
  alarmConfigTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  alarmConfigSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textInputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  pickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  pickerValueTitle: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  pickerValueSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerArrow: {
    fontSize: 12,
    color: colors.deepMaroon,
  },
  estimateCard: {
    backgroundColor: colors.softCream,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  estimateTitle: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  estimateBox: {
    flex: 1,
    alignItems: 'center',
  },
  estimateVal: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  estimateLbl: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  estimateDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalConfirmBtn: {
    flex: 1.5,
  },

  /* PICKER OVERLAY */
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '75%',
  },
  upashrayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  upashrayItemActive: {
    backgroundColor: '#FFF8E7',
    borderRadius: borderRadius.sm,
  },
  upashrayTextCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  upashrayName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  upashrayNameActive: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  upashrayAddr: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkMark: {
    fontSize: 12,
    color: colors.statusSafe,
    fontWeight: '700',
  },
});
