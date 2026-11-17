import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
  Vibration,
} from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../core/theme/spacing';
import { AlertTriangleIcon, ShieldIcon } from './CustomSvgIcons';

export const EmergencyButton = ({
  title = 'SOS',
  subtitle = 'Hold 2 seconds to activate Surat Control Room Alert',
  onPress,
  onSilentSos,
  disabled = false,
  style = {},
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimeoutRef = useRef(null);

  const startHold = () => {
    if (disabled) return;
    setIsHolding(true);
    Vibration.vibrate(50);

    Animated.timing(holdProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    holdTimeoutRef.current = setTimeout(() => {
      Vibration.vibrate([0, 200, 100, 200]);
      setIsHolding(false);
      holdProgress.setValue(0);
      if (onPress) onPress();
    }, 2000);
  };

  const cancelHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start(() => setIsHolding(false));
  };

  const progressWidth = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.outerWrapper, style]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={startHold}
        onPressOut={cancelHold}
        disabled={disabled}
        style={[styles.container, !disabled && shadows.prominent]}
      >
        {/* Animated 2-Second Hold Progress Fill */}
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressWidth },
          ]}
        />

        <View style={styles.innerButton}>
          <AlertTriangleIcon size={28} color="#FFFFFF" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {isHolding ? 'HOLDING... KEEP PRESSED' : subtitle}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Optional Silent SOS Trigger */}
      {onSilentSos ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSilentSos}
          style={styles.silentSosBtn}
        >
          <ShieldIcon size={14} color={colors.textSecondary} />
          <Text style={styles.silentSosText}>Silent SOS (No Alarm / Quiet Dispatch)</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    marginVertical: spacing.md,
  },
  container: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.statusEmergency,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF8A80',
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  innerButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: '#FFCDD2',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  silentSosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 6,
  },
  silentSosText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
