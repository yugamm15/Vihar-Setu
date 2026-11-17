import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
} from 'react-native';
import { SafeMapView } from '../../../shared/components/SafeMapView';
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
  AlertTriangleIcon,
  PhoneIcon,
  SirenIcon,
  FlashlightIcon,
  WomenSafetyShieldIcon,
  ClockIcon,
  PauseIcon,
  UsersGroupIcon,
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
import { viharService } from '../../vihar/services/viharService';
import { adminService } from '../../admin/services/adminService';
import { WomenSafetyEmergencyPanel } from '../../vihar/components/WomenSafetyEmergencyPanel';
import { WomenSafetyHeartbeatModal } from '../../vihar/components/WomenSafetyHeartbeatModal';
import { WomenSafetyDisarmModal } from '../../vihar/components/WomenSafetyDisarmModal';
import { ViharHandoverModal } from '../../vihar/components/ViharHandoverModal';
import { ViharHoldModal } from '../../vihar/components/ViharHoldModal';
import { subViharService } from '../../vihar/services/subViharService';
import { holdService, HOLD_REASONS } from '../../vihar/services/holdService';
import { locationTelemetryService, GPS_STATUS } from '../../vihar/services/locationTelemetryService';
import { offlineSyncService } from '../../vihar/services/offlineSyncService';
import { routeDeviationEngine, DEVIATION_STATUS } from '../../vihar/services/routeDeviationEngine';
import { stationaryWatchdogService } from '../../vihar/services/stationaryWatchdogService';
import { t } from '../../../core/localization/i18n';

const getLocalizedUpashrayName = (upashray, language) => {
  if (language === 'gu') return upashray.nameGu || upashray.name;
  if (language === 'hi') return upashray.nameHi || upashray.name;
  return upashray.name;
};

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimeMinutes = (time) => {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return -1;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const isValidFutureDate = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const date = new Date(`${dateKey}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    getLocalDateKey(date) === dateKey &&
    dateKey > getLocalDateKey()
  );
};

const getScheduledDateTime = (notes = '') => {
  const dateMatch = notes.match(/Date:\s*([^|]+)/i);
  const timeMatch = notes.match(/Time:\s*([^|]+)/i);
  return {
    date: dateMatch?.[1]?.trim() || 'Tomorrow',
    time: timeMatch?.[1]?.trim() || '05:30 AM',
  };
};

export const SevakViharScreen = ({ navigation, route }) => {
  const { user, profile, language } = useAuthStore();
  const { showAlert } = useAlertStore();
  const {
    activeVihar,
    scheduledVihars,
    activeEmergency,
    loadViharState,
    startImmediateVihar,
    scheduleFutureVihar,
    startScheduled,
    completeActiveVihar,
    cancelScheduled,
    triggerEmergency,
    disarmEmergency,
    isLoading,
    error: viharError,
  } = useViharStore();

  // Dialog States
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [disarmModalVisible, setDisarmModalVisible] = useState(false);
  const [handoverModalVisible, setHandoverModalVisible] = useState(false);
  const [currentSubVihar, setCurrentSubVihar] = useState(null);

  // Phase 16 & 17 Telemetry & Offline States
  const [telemetry, setTelemetry] = useState(locationTelemetryService.getTelemetrySnapshot());
  const [offlineStatus, setOfflineStatus] = useState(offlineSyncService.getStatus());

  // Phase 18 Route Deviation State
  const [deviationInfo, setDeviationInfo] = useState({
    status: DEVIATION_STATUS.ON_TRACK,
    deviationMeters: 0,
    level2Escalated: false,
  });

  // Phase 20 Hold Management State
  const [activeHold, setActiveHold] = useState(null);
  const [holdModalVisible, setHoldModalVisible] = useState(false);
  const [holdElapsedMins, setHoldElapsedMins] = useState(0);
  const [isResumingHold, setIsResumingHold] = useState(false);

  // Physical Deterrents State
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [isStrobeActive, setIsStrobeActive] = useState(false);

  // Dead-Man's Periodic Safety Heartbeat State
  const [showHeartbeatModal, setShowHeartbeatModal] = useState(false);
  const [heartbeatTimer, setHeartbeatTimer] = useState(120);
  const heartbeatIntervalRef = useRef(null);

  // Vihar Creation Form State
  const [creationMode, setCreationMode] = useState('SCHEDULE'); // 'NOW' | 'SCHEDULE'
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [customDate, setCustomDate] = useState('');
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
  const checklist = [
    { id: '1', title: t('vihar.checklist_1_title'), detail: t('vihar.checklist_1_detail') },
    { id: '2', title: t('vihar.checklist_2_title'), detail: t('vihar.checklist_2_detail') },
    { id: '3', title: t('vihar.checklist_3_title'), detail: t('vihar.checklist_3_detail') },
    { id: '4', title: t('vihar.checklist_4_title'), detail: t('vihar.checklist_4_detail') },
    { id: '5', title: t('vihar.checklist_5_title'), detail: t('vihar.checklist_5_detail') },
  ];

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
      const { date, time } = getScheduledDateTime(firstScheduled.notes);
      const info = alarmService.getAlarmTime(date, time);
      setActivePreAlert(info);
      setShowWakeupAlert(true);
    } else {
      setShowWakeupAlert(false);
    }
  }, [scheduledVihars]);

  // Load Active Sub-Vihar on activeVihar change (Phase 13)
  useEffect(() => {
    if (activeVihar?.id) {
      subViharService.getActiveSubVihar(activeVihar.id).then(({ data }) => {
        setCurrentSubVihar(data);
      });
    } else {
      setCurrentSubVihar(null);
    }
  }, [activeVihar?.id]);

  // Load Active Hold on activeVihar change (Phase 20)
  useEffect(() => {
    if (activeVihar?.id) {
      holdService.getActiveHold(activeVihar.id).then(({ data }) => {
        setActiveHold(data);
      });
    } else {
      setActiveHold(null);
    }
  }, [activeVihar?.id]);

  // Live Hold Elapsed Timer (Phase 20)
  useEffect(() => {
    if (!activeHold?.hold_start) {
      setHoldElapsedMins(0);
      return;
    }

    const calcElapsed = () => {
      const startMs = new Date(activeHold.hold_start).getTime();
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 60000));
      setHoldElapsedMins(elapsed);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 15000);
    return () => clearInterval(interval);
  }, [activeHold?.hold_start]);

  // Phase 16, 17, 18, 19: Background Location Tracking, Battery Telemetry, Offline Queue, Route Deviation & Stationary Watchdog
  useEffect(() => {
    if (!activeVihar?.id || !user?.id) {
      locationTelemetryService.stopTracking();
      routeDeviationEngine.reset();
      stationaryWatchdogService.reset();
      return;
    }

    // 1. Subscribe to offline sync engine status
    const unsubOffline = offlineSyncService.subscribe(setOfflineStatus);

    // 2. Subscribe to route deviation engine updates
    const unsubDeviation = routeDeviationEngine.subscribe(setDeviationInfo);

    // 3. Subscribe to stationary watchdog safety checks
    const unsubWatchdog = stationaryWatchdogService.subscribe((event) => {
      if (event.type === 'TRIGGER_SAFETY_CHECK') {
        setShowHeartbeatModal(true);
      }
    });

    // 4. Start background & battery-aware location tracking
    locationTelemetryService.startTracking({
      viharId: activeVihar.id,
      subViharId: currentSubVihar?.id || null,
      userId: user.id,
    });

    // 5. Subscribe to live telemetry feed
    const unsubTelemetry = locationTelemetryService.subscribe((snapshot) => {
      setTelemetry(snapshot);
      if (snapshot.lastPosition) {
        // Feed coordinates into Route Deviation Engine
        routeDeviationEngine.evaluateLocation(
          snapshot.lastPosition,
          activeVihar,
          Boolean(activeHold)
        );

        // Feed coordinates into Stationary Watchdog
        stationaryWatchdogService.evaluateMovement(
          snapshot.lastPosition,
          activeVihar,
          Boolean(activeHold)
        );
      }
    });

    return () => {
      locationTelemetryService.stopTracking();
      unsubTelemetry();
      unsubOffline();
      unsubDeviation();
      unsubWatchdog();
    };
  }, [activeVihar?.id, user?.id, currentSubVihar?.id, activeHold]);

  // Periodic Safety Heartbeat Countdown (120s Auto-Escalation Engine)
  useEffect(() => {
    if (showHeartbeatModal) {
      setHeartbeatTimer(120);
      heartbeatIntervalRef.current = setInterval(() => {
        setHeartbeatTimer((prev) => {
          if (prev <= 1) {
            clearInterval(heartbeatIntervalRef.current);
            handleAutoHeartbeatEscalate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [showHeartbeatModal]);

  // Auto-escalation if heartbeat is missed
  const handleAutoHeartbeatEscalate = async () => {
    setShowHeartbeatModal(false);
    if (!user?.id) return;

    const emergency = await triggerEmergency({
      userId: user.id,
      viharId: activeVihar?.id,
      latitude: activeVihar?.source_lat || 21.1959,
      longitude: activeVihar?.source_lng || 72.7933,
      batteryPercentage: telemetry.batteryPercentage || 100,
      triggerType: 'HEARTBEAT_MISSED',
      notes: 'Automated Women Safety Alert: Periodic Safety Heartbeat check was missed during Vihar',
    });

    if (!emergency) {
      showAlert({
        type: 'ERROR',
        title: t('vihar.sos_failed_title'),
        message: useViharStore.getState().error || t('vihar.sos_failed_message'),
        confirmText: t('common.confirm'),
        confirmVariant: 'emergency',
      });
      return;
    }

    adminService.notifyListeners();
    showAlert({
      type: 'ERROR',
      title: 'Safety Check Escalated to SOS',
      message: 'No response was received within 120s. High-priority alert has been dispatched to Super Admin Control Room.',
      confirmText: 'Acknowledge',
      confirmVariant: 'emergency',
    });
  };

  // Safe acknowledgement of heartbeat
  const handleAcknowledgeSafeHeartbeat = async () => {
    setShowHeartbeatModal(false);
    if (activeVihar?.id && user?.id) {
      await viharService.submitSafetyCheckResponse({
        viharId: activeVihar.id,
        userId: user.id,
        userResponse: 'SAFE',
      });
    }
    showAlert({
      type: 'SUCCESS',
      title: 'Safety Check Verified',
      message: 'Thank you. Pujya Sadhviji Bhagwant & Sevikas confirmed safe on route.',
      confirmText: 'Done',
      confirmVariant: 'saffron',
    });
  };

  // Dynamic Route Calculation
  const routeEstimate = calculateViharRouteEstimate(
    sourceUpashray.lat,
    sourceUpashray.lng,
    destUpashray.lat,
    destUpashray.lng
  );

  const availableTimePresets =
    selectedDate === 'Today'
      ? VIHAR_TIME_PRESETS.filter(
        (time) => getTimeMinutes(time) > new Date().getHours() * 60 + new Date().getMinutes()
      )
      : VIHAR_TIME_PRESETS;

  useEffect(() => {
    if (creationMode !== 'SCHEDULE') return;
    if (availableTimePresets.length === 0) {
      setSelectedTime('');
    } else if (!availableTimePresets.includes(selectedTime)) {
      setSelectedTime(availableTimePresets[0]);
    }
  }, [creationMode, selectedDate, customDate, availableTimePresets.join('|')]);

  const handleOpenCreateModal = (mode = 'NOW') => {
    setCreationMode(mode);
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    if (route?.params?.openCreateMode) {
      handleOpenCreateModal(route.params.openCreateMode);
      navigation.setParams({ openCreateMode: undefined });
    }
  }, [route?.params?.openCreateMode]);

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

    if (creationMode === 'SCHEDULE') {
      if (selectedDate === 'Custom Date' && !isValidFutureDate(customDate)) {
        showAlert({
          type: 'WARNING',
          title: t('vihar.invalid_date_title'),
          message: t('vihar.invalid_date_message'),
          confirmText: 'OK',
        });
        return;
      }

      if (!selectedTime) {
        showAlert({
          type: 'WARNING',
          title: t('vihar.invalid_time_title'),
          message: t('vihar.invalid_time_message'),
          confirmText: 'OK',
        });
        return;
      }
    }

    const departureDate =
      selectedDate === 'Today'
        ? getLocalDateKey()
        : selectedDate === 'Tomorrow'
          ? getLocalDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000))
          : customDate;

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
      notes: `Sadhviji: ${sadhvijiName.trim()} | Date: ${departureDate} | Time: ${selectedTime} | ${viharNotes.trim()}`,
    };

    if (creationMode === 'NOW') {
      const success = await startImmediateVihar(user.id, payload);
      if (success) {
        setIsCreateModalOpen(false);
        showAlert({
          type: 'JINENDRA',
          title: 'Jai Jinendra',
          message: 'Vihar has started. GPS tracking and women safety telemetry are now active.',
          confirmText: 'Jai Jinendra',
          confirmVariant: 'saffron',
        });
      } else {
        const startError = useViharStore.getState().error;
        showAlert({
          type: 'ERROR',
          title: t('vihar.start_failed_title'),
          message: startError || t('vihar.start_failed_message'),
          confirmText: t('common.confirm'),
          confirmVariant: 'maroon',
        });
      }
    } else {
      const success = await scheduleFutureVihar(user.id, payload);
      if (success) {
        setIsCreateModalOpen(false);
        const alarmInfo = alarmService.getAlarmTime(departureDate, selectedTime);
        showAlert({
          type: 'SUCCESS',
          title: 'Vihar Scheduled',
          message: `Vihar scheduled for ${selectedDate} at ${selectedTime}.\n\n30-Minute Wake-up Alarm set for ${alarmInfo.alarmTimeString}.`,
          confirmText: 'Done',
          confirmVariant: 'saffron',
        });
      } else {
        const scheduleError = useViharStore.getState().error;
        showAlert({
          type: 'ERROR',
          title: t('vihar.start_failed_title'),
          message: scheduleError || t('vihar.start_failed_message'),
          confirmText: t('common.confirm'),
          confirmVariant: 'maroon',
        });
      }
    }
  };

  const handleStartScheduledVihar = async (viharId) => {
    const success = await startScheduled(viharId);
    if (!success) {
      const startError = useViharStore.getState().error;
      showAlert({
        type: 'ERROR',
        title: t('vihar.start_failed_title'),
        message: startError || t('vihar.start_failed_message'),
        confirmText: t('common.confirm'),
        confirmVariant: 'maroon',
      });
    }
  };

  // Trigger Emergency SOS Handlers
  const handleTriggerSOS = async () => {
    setSosModalVisible(false);
    if (!user?.id) return;

    const emergency = await triggerEmergency({
      userId: user.id,
      viharId: activeVihar?.id,
      latitude: activeVihar?.source_lat || 21.1959,
      longitude: activeVihar?.source_lng || 72.7933,
      batteryPercentage: telemetry.batteryPercentage || 100,
      triggerType: 'MANUAL_SOS',
      notes: 'Immediate women safety assistance requested during Vihar seva in Surat',
    });

    if (!emergency) {
      showAlert({
        type: 'ERROR',
        title: t('vihar.sos_failed_title'),
        message: useViharStore.getState().error || t('vihar.sos_failed_message'),
        confirmText: t('common.confirm'),
        confirmVariant: 'emergency',
      });
      return;
    }

    adminService.notifyListeners();
    showAlert({
      type: 'ERROR',
      title: t('vihar.sos_dispatched_title'),
      message: t('vihar.sos_dispatched_message'),
      confirmText: t('common.confirm'),
      confirmVariant: 'emergency',
    });
  };

  // Disarm Emergency SOS Handlers
  const handleConfirmDisarm = async (reason) => {
    setDisarmModalVisible(false);
    setIsSirenActive(false);
    setIsStrobeActive(false);

    if (activeEmergency?.id || activeVihar?.id) {
      const disarmed = await disarmEmergency(
        activeEmergency?.id,
        activeVihar?.id,
        reason || 'False Alarm - Sevika & Sadhviji Safe'
      );
      if (!disarmed) {
        showAlert({
          type: 'ERROR',
          title: t('vihar.sos_failed_title'),
          message: useViharStore.getState().error || t('vihar.sos_failed_message'),
          confirmText: t('common.confirm'),
          confirmVariant: 'emergency',
        });
        return;
      }

      adminService.notifyListeners();
      showAlert({
        type: 'SUCCESS',
        title: t('vihar.emergency_disarmed_title'),
        message: t('vihar.emergency_disarmed_message'),
        confirmText: t('common.confirm'),
        confirmVariant: 'saffron',
      });
    }
  };

  const handleEndVihar = async () => {
    setEndModalVisible(false);
    if (activeVihar?.id) {
      const completed = await completeActiveVihar(activeVihar.id, {
        total_distance_km: activeVihar.total_distance_km || 4.8,
      });
      if (!completed) {
        const completionError = useViharStore.getState().error;
        showAlert({
          type: 'ERROR',
          title: t('vihar.completion_failed_title'),
          message: completionError || viharError || t('vihar.completion_failed_message'),
          confirmText: 'OK',
          confirmVariant: 'maroon',
        });
        return;
      }

      showAlert({
        type: 'SUCCESS',
        title: t('vihar.completion_success_title'),
        message: t('vihar.completion_success_message'),
        confirmText: 'Jai Jinendra',
        confirmVariant: 'saffron',
      });
    }
  };

  // Phase 20: Hold Handlers
  const handleHoldStarted = (newHold) => {
    setActiveHold(newHold);
    showAlert({
      type: 'INFO',
      title: 'Vihar Placed on Hold',
      message: 'Temporary stop recorded. Automatic stationary safety checks are paused.',
      confirmText: 'Understood',
      confirmVariant: 'saffron',
    });
  };

  const handleResumeVihar = async () => {
    if (isResumingHold) return;
    if (!activeHold?.id || !activeVihar?.id) {
      showAlert({
        type: 'ERROR',
        title: 'Resume Failed',
        message: 'The active hold could not be identified. Please refresh and try again.',
        confirmText: 'OK',
      });
      return;
    }

    setIsResumingHold(true);
    try {
      const { success, durationMinutes, error } = await holdService.resumeVihar({
        holdId: activeHold.id,
        viharId: activeVihar.id,
        holdStartTime: activeHold.hold_start,
      });

      if (!success) {
        showAlert({
          type: 'ERROR',
          title: 'Resume Failed',
          message: error?.message || 'Could not resume Vihar. Please retry.',
          confirmText: 'OK',
        });
        return;
      }

      setActiveHold(null);
      routeDeviationEngine.reset();
      stationaryWatchdogService.reset();
      await loadViharState(user.id);
      showAlert({
        type: 'SUCCESS',
        title: 'Vihar Resumed',
        message: `Accompaniment resumed safely after ${durationMinutes} min(s) pause. Live tracking is fully active.`,
        confirmText: 'Jai Jinendra',
        confirmVariant: 'saffron',
      });
    } finally {
      setIsResumingHold(false);
    }
  };

  const isEmergencyActive =
    Boolean(activeEmergency) || activeVihar?.safety_status === 'EMERGENCY';

  const liveCoordinate = telemetry.lastPosition
    ? {
      latitude: telemetry.lastPosition.latitude,
      longitude: telemetry.lastPosition.longitude,
    }
    : null;
  const sourceCoordinate = {
    latitude: activeVihar?.source_lat || 21.1959,
    longitude: activeVihar?.source_lng || 72.7933,
  };
  const destinationCoordinate = {
    latitude: activeVihar?.dest_lat || 21.1442,
    longitude: activeVihar?.dest_lng || 72.7758,
  };
  const mapCenter = liveCoordinate || sourceCoordinate;

  return (
    <View key={language} style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader
        title={activeVihar ? t('vihar.active_title') : t('vihar.dashboard_title')}
        subtitle={activeVihar ? `To ${activeVihar.dest_name}` : t('vihar.dashboard_subtitle')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ============================================================ */}
        {/* CASE 1: ACTIVE VIHAR LIVE VIEW */}
        {/* ============================================================ */}
        {activeVihar ? (
          <>
            {/* 1. If SOS is Active, Render the Full Emergency Assistance Center */}
            {isEmergencyActive ? (
              <WomenSafetyEmergencyPanel
                activeVihar={activeVihar}
                activeEmergency={activeEmergency}
                profile={profile}
                onDisarm={() => setDisarmModalVisible(true)}
                isSirenActive={isSirenActive}
                onToggleSiren={() => setIsSirenActive(!isSirenActive)}
                isStrobeActive={isStrobeActive}
                onToggleStrobe={() => setIsStrobeActive(!isStrobeActive)}
              />
            ) : null}

            {/* Phase 20: Active Vihar Hold Banner */}
            {activeHold ? (
              <View style={[styles.activeHoldCard, shadows.card]}>
                <View style={styles.activeHoldHeader}>
                  <ClockIcon size={22} color={colors.warning} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.activeHoldBadge}>VIHAR ON TEMPORARY HOLD</Text>
                    <Text style={styles.activeHoldReason}>
                      {HOLD_REASONS.find((r) => r.id === activeHold.reason)?.label || activeHold.reason}
                    </Text>
                  </View>
                  <View style={styles.holdTimePill}>
                    <Text style={styles.holdTimeText}>{holdElapsedMins}m</Text>
                  </View>
                </View>
                <Text style={styles.activeHoldLocation}>
                  📍 {activeHold.location_name || 'En Route Upashray / Road'}
                </Text>
                {activeHold.notes ? (
                  <Text style={styles.activeHoldNotes}>Note: {activeHold.notes}</Text>
                ) : null}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.resumeHoldBtn}
                  onPress={handleResumeVihar}
                  disabled={isResumingHold}
                >
                  <CheckCircleIcon size={18} color={colors.white} />
                  <Text style={styles.resumeHoldBtnText}>{t('vihar.resume_action')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Phase 18: Route Deviation Banners */}
            {deviationInfo.status === DEVIATION_STATUS.WARNING_LEVEL_1 && !activeHold ? (
              <View style={styles.deviationWarningBanner}>
                <AlertTriangleIcon size={18} color={colors.warning} />
                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                  <Text style={styles.deviationWarningTitle}>Route Deviation Notice</Text>
                  <Text style={styles.deviationWarningText}>
                    You are ~{deviationInfo.deviationMeters}m off planned route. Please realign or take a hold.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deviationHoldBtn}
                  onPress={() => setHoldModalVisible(true)}
                >
                  <Text style={styles.deviationHoldBtnText}>Pause</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {deviationInfo.status === DEVIATION_STATUS.CRITICAL_LEVEL_2 && !activeHold ? (
              <View style={styles.deviationCriticalBanner}>
                <AlertTriangleIcon size={20} color={colors.white} />
                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                  <Text style={styles.deviationCriticalTitle}>CRITICAL ROUTE DEVIATION</Text>
                  <Text style={styles.deviationCriticalText}>
                    ~{deviationInfo.deviationMeters}m departure from course. Surat Safety Administrators alerted.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* 2. Live Map Card */}
            <View style={[styles.mapCard, shadows.card]}>
              <View style={styles.mapCardHeaderRow}>
                <View style={styles.liveBadgeRow}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>{t('vihar.live_gps_active')}</Text>
                </View>
                <View style={styles.viharTypeBadge}>
                  <Text style={styles.viharTypeBadgeText}>{t('vihar.walking_vihar')}</Text>
                </View>
              </View>

              <Text style={styles.mapTitle}>{t('vihar.route_nav_active')}</Text>
              <Text style={styles.mapSubtitle} numberOfLines={2}>
                {activeVihar.source_name} → {activeVihar.dest_name}
              </Text>

              <SafeMapView
                sourceCoordinate={sourceCoordinate}
                destinationCoordinate={destinationCoordinate}
                liveCoordinate={liveCoordinate}
                sourceName={activeVihar.source_name}
                destinationName={activeVihar.dest_name}
                accuracy={telemetry.lastPosition?.accuracy || 10}
              />

              {/* Phase 16 & 17: Dynamic Hardware & Telemetry Bar */}
              <View style={styles.telemetryBar}>
                <View style={styles.telemetryItemRow}>
                  <View
                    style={[
                      styles.telemetryDot,
                      {
                        backgroundColor:
                          telemetry.gpsStatus === GPS_STATUS.ACTIVE
                            ? colors.statusSafe
                            : telemetry.gpsStatus === GPS_STATUS.WEAK
                              ? colors.statusWarning
                              : colors.statusEmergency,
                      },
                    ]}
                  />
                  <Text style={styles.telemetryText}>
                    {t('vihar.gps')} {telemetry.gpsStatus === GPS_STATUS.ACTIVE ? `${Math.round(telemetry.lastPosition?.accuracy || 5)}m` : telemetry.gpsStatus}
                  </Text>
                </View>

                <View style={styles.telemetryItemRow}>
                  <View
                    style={[
                      styles.telemetryDot,
                      { backgroundColor: offlineStatus.isOnline ? colors.statusSafe : colors.statusWarning },
                    ]}
                  />
                  <Text style={styles.telemetryText}>
                    {offlineStatus.isOnline ? t('vihar.online') : `${t('vihar.offline')} (${offlineStatus.pendingCount})`}
                  </Text>
                </View>

                <View style={styles.telemetryItemRow}>
                  <Text style={styles.telemetryText}>
                    {t('vihar.battery')} {telemetry.batteryPercentage}%{telemetry.isCharging ? ' ⚡' : ''}{telemetry.isPowerSaverActive ? ' (Eco)' : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Women Safety & Anti-Stalking Security Shield Card */}
            <View style={[styles.securityStatusCard, shadows.subtle]}>
              <View style={styles.securityStatusRow}>
                <View style={styles.securityIconBox}>
                  <WomenSafetyShieldIcon size={22} color={colors.gold} />
                </View>
                <View style={styles.securityStatusTextCol}>
                  <Text style={styles.securityStatusTitle}>
                    {t('vihar.safety_telemetry_active')}
                  </Text>
                  <Text style={styles.securityStatusSub}>
                    {t('vihar.safety_telemetry_sub')}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowHeartbeatModal(true)}
                  style={styles.safetyCheckPill}
                >
                  <Text style={styles.safetyCheckPillText}>{t('vihar.check_in')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Vihar Route Metrics */}
            <View style={[styles.card, shadows.card]}>
              <Text style={styles.cardHeader}>{t('vihar.destination_upashray')}</Text>
              <Text style={styles.destinationName}>{activeVihar.dest_name}</Text>

              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('home.distance')}</Text>
                  <Text style={styles.metricValue}>
                    {activeVihar.total_distance_km || '4.5'} km
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('vihar.estimated_duration')}</Text>
                  <Text style={styles.metricValue}>
                    {activeVihar.estimated_duration_mins || '60'} mins
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('vihar.avg_speed')}</Text>
                  <Text style={styles.metricValue}>4.2 km/h</Text>
                </View>
              </View>

              {activeVihar.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{t('vihar.notes')} {activeVihar.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* 5. Emergency SOS Button (If not already triggered) */}
            {!isEmergencyActive ? (
              <EmergencyButton
                title="SOS"
                subtitle={t('vihar.sos_btn_subtitle')}
                onPress={() => setSosModalVisible(true)}
                style={styles.sosButton}
              />
            ) : null}

            {/* Phase 13: Sub-Vihar & Handover System */}
            <View style={[styles.subViharCard, shadows.subtle]}>
              <View style={styles.subViharHeaderRow}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.subViharBadge}>
                    SUB-VIHAR #{currentSubVihar?.sub_vihar_number || 1} • ACTIVE DUTY
                  </Text>
                  <Text style={styles.subViharTitle} numberOfLines={2}>
                    {currentSubVihar?.title || 'Segment 1: Leading Accompaniment'}
                  </Text>
                </View>
                <View style={styles.dutyPill}>
                  <Text style={styles.dutyPillText}>DUTY ACTIVE</Text>
                </View>
              </View>

              <Text style={styles.subViharDesc}>
                Transfer accompanying duty to the next volunteer without ending the parent Vihar journey.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setHandoverModalVisible(true)}
                style={styles.handoverActionBtn}
              >
                <UsersGroupIcon size={18} color={colors.saffronDark} />
                <Text style={styles.handoverActionBtnText}>
                  {t('vihar.handover_action')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phase 20: Temporary Hold Trigger Button (When not already on hold) */}
            {!activeHold ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setHoldModalVisible(true)}
                style={[styles.initiateHoldBtn, shadows.subtle]}
              >
                <PauseIcon size={18} color={colors.gold} />
                <Text style={styles.initiateHoldBtnText}>
                  {t('vihar.hold_action')}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* 6. End Vihar Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setEndModalVisible(true)}
              style={[styles.endViharBtn, shadows.subtle]}
            >
              <View style={styles.redDot} />
              <Text style={styles.endViharText}>{t('vihar.end_action')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* ============================================================ */
          /* CASE 2: IDLE STATE (VIHAR NOT STARTED BY DEFAULT) */
          /* ============================================================ */
          <>
            {/* 30-Minute Wake-up Alarm Banner (if scheduled vihar exists) */}
            {showWakeupAlert && activePreAlert ? (
              <View style={[styles.alarmBannerCard, shadows.elevated]}>
                <View style={styles.alarmBannerHeader}>
                  <View style={styles.alarmIconCircle}>
                    <Text style={styles.alarmTagText}>ALARM</Text>
                  </View>
                  <View style={styles.alarmHeaderTextCol}>
                    <Text style={styles.alarmBannerTitle}>
                      {t('vihar.alarm_alert_title')}
                    </Text>
                    <Text style={styles.alarmBannerSub}>
                      {t('vihar.scheduled_alarm', {
                        time: activePreAlert.alarmTimeString,
                      })}
                    </Text>
                  </View>
                </View>

                <Text style={styles.checklistTitle}>
                  {t('vihar.checklist_title')}
                </Text>
                {checklist.map((item) => (
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

            {/* Standalone Women Safety Emergency Hotline Strip */}
            <View style={[styles.idleSafetyStrip, shadows.subtle]}>
              <View style={styles.idleSafetyHeader}>
                <WomenSafetyShieldIcon size={18} color={colors.statusEmergency} />
                <Text style={styles.idleSafetyTitle}>{t('vihar.women_safety')}</Text>
              </View>
              <View style={styles.idleHelplineRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL('tel:112')}
                  style={styles.idleHelplineChip}
                >
                  <Text style={styles.idleHelplineText}>{t('home.police')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL('tel:181')}
                  style={styles.idleHelplineChip}
                >
                  <Text style={styles.idleHelplineText}>{t('home.abhayam')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL('tel:+919876500000')}
                  style={styles.idleHelplineChip}
                >
                  <Text style={styles.idleHelplineText}>{t('home.vihar_desk')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Idle Welcome Spiritual Card */}
            <View style={[styles.idleHeroCard, shadows.card]}>
              <View style={styles.idleAuraCircle}>
                <Text style={styles.idleAuraText}>VIHAR</Text>
              </View>
              <Text style={styles.idleTitle}>{t('vihar.no_active')}</Text>
              <Text style={styles.idleSubtitle}>
                {t('vihar.no_active_subtitle')}
              </Text>

              <View style={styles.idleBtnRow}>
                <PrimaryButton
                  title={t('vihar.start_now')}
                  variant="saffron"
                  onPress={() => handleOpenCreateModal('NOW')}
                  style={styles.heroBtn}
                />
                <SecondaryButton
                  title={t('vihar.schedule')}
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

                {scheduledVihars.map((vihar) => {
                  const { date, time } = getScheduledDateTime(vihar.notes);
                  const alarmInfo = alarmService.getAlarmTime(date, time);
                  return (
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
                          {t('vihar.scheduled_alarm', {
                            time: alarmInfo.alarmTimeString,
                          })}
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
                        onPress={() => handleStartScheduledVihar(vihar.id)}
                        style={styles.startEarlyBtn}
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyScheduleCard, shadows.subtle]}>
                <Text style={styles.emptyScheduleTitle}>{t('vihar.no_upcoming')}</Text>
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
                {creationMode === 'NOW'
                  ? t('vihar.start_now_title')
                  : t('vihar.schedule_title')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>{t('vihar.cancel')}</Text>
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
                  {t('vihar.start_now_tab')}
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
                  {t('vihar.schedule_later_tab')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Date & Time (if Scheduled) */}
              {creationMode === 'SCHEDULE' && (
                <>
                  <Text style={styles.inputLabel}>{t('vihar.departure_date')}</Text>
                  <View style={styles.chipsRow}>
                    {[
                      ['Tomorrow', t('vihar.tomorrow')],
                      ['Custom Date', t('vihar.custom_date')],
                    ].map(([value, label]) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setSelectedDate(value)}
                        style={[
                          styles.chip,
                          selectedDate === value && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedDate === value && styles.chipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedDate === 'Custom Date' ? (
                    <>
                      <Text style={styles.inputLabel}>
                        {t('vihar.custom_date_required')}
                      </Text>
                      <TextInput
                        value={customDate}
                        onChangeText={setCustomDate}
                        placeholder={t('vihar.custom_date_placeholder')}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numbers-and-punctuation"
                        style={styles.textInputBox}
                      />
                    </>
                  ) : null}

                  <Text style={styles.inputLabel}>
                    {t('vihar.departure_time')}
                  </Text>
                  <View style={styles.chipsRowWrap}>
                    {availableTimePresets.map((t) => (
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
                  {availableTimePresets.length === 0 ? (
                    <Text style={styles.scheduleHint}>
                      {t('vihar.no_today_times')}
                    </Text>
                  ) : null}

                  {/* 30-Minute Alarm Alert Notice */}
                  <View style={styles.alarmConfigBox}>
                    <View style={styles.alarmBadgeSmall}>
                      <Text style={styles.alarmBadgeSmallText}>{t('vihar.alarm')}</Text>
                    </View>
                    <View style={styles.alarmConfigTextCol}>
                      <Text style={styles.alarmConfigTitle}>
                        {t('vihar.alarm_title')}
                      </Text>
                      <Text style={styles.alarmConfigSub}>
                        {t('vihar.alarm_prefix')}{' '}
                        {
                          alarmService.getAlarmTime(selectedDate, selectedTime)
                            .alarmTimeString
                        }{' '}
                        {' '}{t('vihar.alarm_suffix')}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Sadhviji Bhagwant Name */}
              <Text style={styles.inputLabel}>{t('vihar.name_label')}</Text>
              <TextInput
                value={sadhvijiName}
                onChangeText={setSadhvijiName}
                placeholder="e.g. Pujya Mayurashriji M.S."
                placeholderTextColor={colors.textMuted}
                style={styles.textInputBox}
              />

              {/* Source Upashray Selection */}
              <Text style={styles.inputLabel}>{t('vihar.source_label')}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsOriginPickerOpen(true)}
                style={styles.pickerBox}
              >
                <View>
                  <Text style={styles.pickerValueTitle}>
                    {getLocalizedUpashrayName(sourceUpashray, language)}
                  </Text>
                  <Text style={styles.pickerValueSub}>
                    {sourceUpashray.address}
                  </Text>
                </View>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Destination Upashray Selection */}
              <Text style={styles.inputLabel}>
                {t('vihar.destination_label')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDestPickerOpen(true)}
                style={styles.pickerBox}
              >
                <View>
                  <Text style={styles.pickerValueTitle}>
                    {getLocalizedUpashrayName(destUpashray, language)}
                  </Text>
                  <Text style={styles.pickerValueSub}>
                    {destUpashray.address}
                  </Text>
                </View>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Route Estimation Card */}
              <View style={styles.estimateCard}>
                <Text style={styles.estimateTitle}>{t('vihar.route_preview')}</Text>
                <View style={styles.estimateRow}>
                  <View style={styles.estimateBox}>
                    <Text style={styles.estimateVal}>
                      {routeEstimate.distanceKm} km
                    </Text>
                    <Text style={styles.estimateLbl}>{t('vihar.walking_distance')}</Text>
                  </View>
                  <View style={styles.estimateDivider} />
                  <View style={styles.estimateBox}>
                    <Text style={styles.estimateVal}>
                      ~{routeEstimate.formattedDuration}
                    </Text>
                    <Text style={styles.estimateLbl}>{t('vihar.estimated_duration')}</Text>
                  </View>
                </View>
              </View>

              {/* Optional Notes */}
              <Text style={styles.inputLabel}>{t('vihar.notes_label')}</Text>
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
                  title={t('vihar.cancel')}
                  onPress={() => setIsCreateModalOpen(false)}
                  style={styles.modalCancelBtn}
                />
                <PrimaryButton
                  title={
                    creationMode === 'NOW'
                      ? t('vihar.start_action')
                      : t('vihar.schedule_action')
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
              <Text style={styles.modalTitle}>{t('vihar.select_start')}</Text>
              <TouchableOpacity
                onPress={() => setIsOriginPickerOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>{t('vihar.cancel')}</Text>
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
                        {getLocalizedUpashrayName(item, language)}
                      </Text>
                      <Text style={styles.upashrayAddr}>{item.address}</Text>
                    </View>
                    {isSel ? <Text style={styles.checkMark}>{t('vihar.selected')}</Text> : null}
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
              <Text style={styles.modalTitle}>{t('vihar.select_destination')}</Text>
              <TouchableOpacity
                onPress={() => setIsDestPickerOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>{t('vihar.cancel')}</Text>
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
                        {getLocalizedUpashrayName(item, language)}
                      </Text>
                      <Text style={styles.upashrayAddr}>{item.address}</Text>
                    </View>
                    {isSel ? <Text style={styles.checkMark}>{t('vihar.selected')}</Text> : null}
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
        title={t('vihar.sos_title')}
        message={t('vihar.sos_message')}
        confirmText={t('vihar.sos_confirm')}
        cancelText={t('common.cancel')}
        isDestructive
        onConfirm={handleTriggerSOS}
        onCancel={() => setSosModalVisible(false)}
      />

      {/* End Vihar Confirmation Dialog */}
      <ConfirmationDialog
        visible={endModalVisible}
        title={t('vihar.end_title')}
        message={t('vihar.end_message')}
        confirmText={t('vihar.end_confirm')}
        cancelText={t('vihar.end_cancel')}
        onConfirm={handleEndVihar}
        onCancel={() => setEndModalVisible(false)}
      />

      {/* Women Safety Periodic Heartbeat Modal (Dead-Man Check) */}
      <WomenSafetyHeartbeatModal
        visible={showHeartbeatModal}
        countdownSeconds={heartbeatTimer}
        onConfirmSafe={handleAcknowledgeSafeHeartbeat}
        onTriggerEmergency={handleTriggerSOS}
      />

      {/* Women Safety Disarm / False Alarm Modal */}
      <WomenSafetyDisarmModal
        visible={disarmModalVisible}
        onConfirmDisarm={handleConfirmDisarm}
        onCancel={() => setDisarmModalVisible(false)}
      />

      {/* Phase 13: Vihar Handover Modal */}
      <ViharHandoverModal
        visible={handoverModalVisible}
        onClose={() => setHandoverModalVisible(false)}
        vihar={activeVihar}
        currentSubVihar={currentSubVihar}
        currentUserId={user?.id}
        currentUserProfile={profile}
        onHandoverComplete={(newSubVihar) => {
          setCurrentSubVihar(newSubVihar);
          setActiveHold(null);
          showAlert({
            type: 'SUCCESS',
            title: 'Handover Completed',
            message: `Vihar duty successfully handed over. Sub-Vihar #${newSubVihar?.sub_vihar_number || 2} is now active.`,
            confirmText: 'Jai Jinendra',
            confirmVariant: 'saffron',
          });
        }}
      />

      {/* Phase 20: Vihar Hold Modal */}
      <ViharHoldModal
        visible={holdModalVisible}
        onClose={() => setHoldModalVisible(false)}
        vihar={activeVihar}
        currentSubVihar={currentSubVihar}
        userId={user?.id}
        currentLocation={telemetry.lastPosition}
        onHoldStarted={handleHoldStarted}
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

  /* WOMEN SAFETY SECURITY STYLES */
  securityStatusCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    marginBottom: spacing.lg,
  },
  securityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  securityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 164, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityStatusTextCol: {
    flex: 1,
  },
  securityStatusTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  securityStatusSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  safetyCheckPill: {
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
  },
  safetyCheckPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  idleSafetyStrip: {
    backgroundColor: '#FFF5F5',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    marginBottom: spacing.lg,
  },
  idleSafetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  idleSafetyTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.statusEmergency,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  idleHelplineRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  idleHelplineChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#EF9A9A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleHelplineText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.statusEmergency,
  },


  /* ACTIVE VIHAR STYLES */
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  mapCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.statusSafeBg,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 91, 0.3)',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.statusSafe,
  },
  liveBadgeText: {
    fontSize: 10,
    color: colors.statusSafe,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viharTypeBadge: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  viharTypeBadgeText: {
    fontSize: 10,
    color: '#8D4004',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  mapTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.deepMaroon,
    marginTop: 2,
    marginBottom: 2,
  },
  mapSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  liveMapFrame: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
    backgroundColor: '#E8E1D5',
  },
  liveMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapAttribution: {
    position: 'absolute',
    right: 4,
    bottom: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: '#333333',
    fontSize: 9,
    paddingHorizontal: 3,
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7F0',
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#EFE8DA',
    marginTop: 4,
  },
  telemetryText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
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
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#EFE5D5',
  },
  metricDivider: {
    width: 6,
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

  /* SUB-VIHAR & HANDOVER STYLES (PHASE 13) */
  subViharCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  subViharHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  subViharBadge: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subViharTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    marginTop: 2,
  },
  dutyPill: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: colors.statusSafe,
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dutyPillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.statusSafe,
  },
  subViharDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  handoverActionBtn: {
    backgroundColor: '#FFF8EC',
    borderWidth: 1.5,
    borderColor: colors.saffron,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  handoverActionBtnText: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },

  /* Phase 16 & 17 Telemetry Bar Styles */
  telemetryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  /* Phase 18 Route Deviation Styles */
  deviationWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1.5,
    borderColor: colors.warning,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  deviationWarningTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: '#8A5D00',
  },
  deviationWarningText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
    marginTop: 1,
  },
  deviationHoldBtn: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  deviationHoldBtnText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  deviationCriticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emergency,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  deviationCriticalTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  deviationCriticalText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.white,
    opacity: 0.95,
    marginTop: 1,
  },

  /* Phase 20 Hold Management Styles */
  activeHoldCard: {
    backgroundColor: '#FFFBEA',
    borderWidth: 2,
    borderColor: colors.warning,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  activeHoldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  activeHoldBadge: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: '#8A5D00',
    letterSpacing: 0.5,
  },
  activeHoldReason: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  holdTimePill: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  holdTimeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  activeHoldLocation: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: 2,
  },
  activeHoldNotes: {
    ...typography.caption,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: 2,
  },
  resumeHoldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.statusSafe,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  resumeHoldBtnText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.white,
  },
  initiateHoldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF7',
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: borderRadius.md,
    paddingVertical: 11,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  initiateHoldBtnText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.deepMaroon,
  },
});
