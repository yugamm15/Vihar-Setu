import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';

const DEFAULT_BAR_COLORS = [
  colors.saffron,
  colors.deepMaroon,
  colors.statusSafe,
  colors.gold,
  '#1976D2',
  '#7B1FA2',
  '#E65100',
  colors.statusEmergency,
];

/**
 * Horizontal Bar Chart for Category / Status Distributions
 */
export const SuperAdminReportBars = ({ series = [], empty = 'No data available', barColor = colors.saffron }) => {
  if (!series || !series.length) {
    return <Text style={styles.emptyText}>{empty}</Text>;
  }

  const numericValues = series.map((item) => Number(item.value) || 0);
  const max = Math.max(...numericValues, 1);

  return (
    <View style={styles.barsContainer}>
      {series.map((item, index) => {
        const val = Number(item.value) || 0;
        const pct = Math.max((val / max) * 100, 3);
        const itemColor = Array.isArray(barColor) ? barColor[index % barColor.length] : barColor;

        return (
          <View key={`${item.label}-${index}`} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${pct}%`, backgroundColor: itemColor }]} />
            </View>
            <Text style={styles.barValue}>{val}</Text>
          </View>
        );
      })}
    </View>
  );
};

/**
 * Trend Line / Bar Chart over Time Periods
 */
export const SuperAdminReportTrend = ({ series = [], empty = 'No data available', accent = colors.deepMaroon }) => {
  if (!series || !series.length) {
    return <Text style={styles.emptyText}>{empty}</Text>;
  }

  const numericValues = series.map((item) => Number(item.value) || 0);
  const max = Math.max(...numericValues, 1);

  return (
    <View style={styles.trendContainer}>
      <View style={styles.trendBarsRow}>
        {series.map((item, index) => {
          const val = Number(item.value) || 0;
          const heightPct = Math.max((val / max) * 100, 6);
          const shortDate = item.label.length >= 10 ? item.label.slice(5) : item.label;

          return (
            <View key={`${item.label}-${index}`} style={styles.trendCol}>
              <Text style={styles.trendValue}>{val > 0 ? val : ''}</Text>
              <View style={styles.trendTrack}>
                <View style={[styles.trendBar, { height: `${heightPct}%`, backgroundColor: accent }]} />
              </View>
              <Text style={styles.trendLabel} numberOfLines={1}>{shortDate}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Segmented Distribution Bar (Donut alternative) with Color Legend
 */
export const SuperAdminDistributionDonut = ({ series = [], empty = 'No data available' }) => {
  if (!series || !series.length) {
    return <Text style={styles.emptyText}>{empty}</Text>;
  }

  const total = series.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  if (total === 0) {
    return <Text style={styles.emptyText}>{empty}</Text>;
  }

  return (
    <View style={styles.donutContainer}>
      {/* Segmented Bar */}
      <View style={styles.segmentedBar}>
        {series.map((item, index) => {
          const val = Number(item.value) || 0;
          if (val === 0) return null;
          const widthPct = (val / total) * 100;
          const color = DEFAULT_BAR_COLORS[index % DEFAULT_BAR_COLORS.length];

          return (
            <View
              key={`seg-${item.label}-${index}`}
              style={[styles.segment, { width: `${widthPct}%`, backgroundColor: color }]}
            />
          );
        })}
      </View>

      {/* Legend Chips */}
      <View style={styles.legendContainer}>
        {series.map((item, index) => {
          const val = Number(item.value) || 0;
          const pct = Math.round((val / total) * 100);
          const color = DEFAULT_BAR_COLORS[index % DEFAULT_BAR_COLORS.length];

          return (
            <View key={`leg-${item.label}-${index}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label}: <Text style={styles.legendValue}>{val} ({pct}%)</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Metric Card for Executive Summary
 */
export const SuperAdminMetricCard = ({ label, value, subtext, accent = colors.deepMaroon, width = '48%' }) => (
  <View style={[styles.metricCard, shadows.card, { width, borderLeftColor: accent, borderLeftWidth: 3.5 }]}>
    <Text style={styles.metricValue}>{value === null || value === undefined ? '—' : value}</Text>
    <Text style={[styles.metricLabel, { color: accent }]}>{label}</Text>
    {subtext ? <Text style={styles.metricSub}>{subtext}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  barsContainer: {
    paddingVertical: spacing.xs,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    width: 104,
    fontSize: 11,
  },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: colors.softCream,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: spacing.xs,
  },
  bar: {
    height: 10,
    borderRadius: 5,
  },
  barValue: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    width: 38,
    textAlign: 'right',
    fontSize: 11,
  },
  trendContainer: {
    paddingVertical: spacing.sm,
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: spacing.md,
    gap: 4,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendValue: {
    fontSize: 9,
    color: colors.deepMaroon,
    fontWeight: '700',
    marginBottom: 2,
  },
  trendTrack: {
    width: '100%',
    maxHeight: 75,
    flex: 1,
    backgroundColor: colors.softCream,
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBar: {
    width: '100%',
    borderRadius: 3,
  },
  trendLabel: {
    fontSize: 8.5,
    color: colors.textSecondary,
    marginTop: 4,
  },
  donutContainer: {
    paddingVertical: spacing.xs,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.softCream,
    marginBottom: spacing.md,
  },
  segment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    marginBottom: 4,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 6,
  },
  legendLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  legendValue: {
    fontWeight: '700',
    color: colors.deepMaroon,
  },
  metricCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  metricValue: {
    ...typography.h3,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  metricLabel: {
    ...typography.caption,
    fontWeight: '700',
    marginTop: 2,
    fontSize: 11,
  },
  metricSub: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
