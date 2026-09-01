import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { shadows, spacing } from '../../core/theme/spacing';
import { ArrowLeftIcon } from './CustomSvgIcons';

export const AppHeader = ({
  title,
  subtitle = null,
  showBack = false,
  onBack = () => {},
  rightElement = null,
  style = {},
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top + 8, spacing.md) },
        shadows.subtle,
        style,
      ]}
    >
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeftIcon size={22} color={colors.warmIvory} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.deepMaroon,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.maroonLight,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.warmIvory,
  },
  subtitle: {
    ...typography.caption,
    color: colors.goldMuted,
    marginTop: 1,
  },
  rightElement: {
    marginLeft: spacing.md,
  },
});
