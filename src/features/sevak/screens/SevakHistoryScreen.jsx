import React from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import { AppHeader } from '../../../shared/components/AppHeader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { MapPinIcon } from '../../../shared/components/CustomSvgIcons';
import { SAFETY_STATUS } from '../../../core/constants/safetyStatus';

const MOCK_HISTORY = [
  {
    id: '1',
    date: 'Yesterday, 6:00 AM - 7:15 AM',
    from: 'Palitana Upashray',
    to: 'Taleti Derasar',
    distance: '4.8 km',
    duration: '1h 15m',
    status: SAFETY_STATUS.SAFE,
  },
  {
    id: '2',
    date: '28 Aug, 5:45 AM - 7:30 AM',
    from: 'Vallabhi Sthanak',
    to: 'Songadh Tirth',
    distance: '6.2 km',
    duration: '1h 45m',
    status: SAFETY_STATUS.SAFE,
  },
  {
    id: '3',
    date: '25 Aug, 6:15 AM - 7:00 AM',
    from: 'Bhavnagar Derasar',
    to: 'Sihor Temple',
    distance: '3.5 km',
    duration: '45m',
    status: SAFETY_STATUS.SAFE,
  },
];

export const SevakHistoryScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.deepMaroon} barStyle="light-content" />
      <AppHeader title="Vihar History" />

      <FlatList
        data={MOCK_HISTORY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.historyCard, shadows.card]}>
            <View style={styles.cardHeader}>
              <Text style={styles.dateText}>{item.date}</Text>
              <StatusBadge status={item.status} />
            </View>

            <View style={styles.routeRow}>
              <MapPinIcon size={18} color={colors.saffron} />
              <Text style={styles.routeText}>
                {item.from} ➔ {item.to}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.statItem}>Distance: <Text style={styles.statBold}>{item.distance}</Text></Text>
              <Text style={styles.statItem}>Duration: <Text style={styles.statBold}>{item.duration}</Text></Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  listContent: {
    padding: spacing.lg,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  routeText: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
  },
  statItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statBold: {
    color: colors.deepMaroon,
    fontWeight: '700',
  },
});
