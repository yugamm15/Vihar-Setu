import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';

export const BriefingCard = ({ briefing, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);

  if (!briefing || !briefing.items || briefing.items.length === 0) {
    return null;
  }

  const displayedItems = expanded ? briefing.items : briefing.items.slice(0, 3);

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'FACT':
        return { bg: '#EBF3FB', text: '#1976D2', label: 'FACT' };
      case 'PREDICTION':
        return { bg: '#FFF8E7', text: colors.saffronDark, label: 'PREDICTION' };
      case 'RECOMMENDATION':
        return { bg: '#FFF3F0', text: colors.deepMaroon, label: 'ADVISORY' };
      default:
        return { bg: '#F5F5F5', text: colors.textSecondary, label: type };
    }
  };

  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>☸</Text>
          <Text style={styles.title}>Vihar Briefing & Advisory</Text>
        </View>
        {briefing.items.length > 3 && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
            <Text style={styles.expandText}>{expanded ? 'Show Less' : `+${briefing.items.length - 3} More`}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {displayedItems.map((item, idx) => {
          const badge = getBadgeStyle(item.type);
          return (
            <View key={idx} style={styles.row}>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
              <Text style={styles.detailText}>{item.text}</Text>
            </View>
          );
        })}
      </View>

      {briefing.weatherAttribution && (
        <TouchableOpacity
          onPress={() => Linking.openURL('https://open-meteo.com/')}
          style={styles.attributionRow}
        >
          <Text style={styles.attributionText}>
            {briefing.weatherAttribution} · Free & Open License
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    paddingBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    color: colors.deepMaroon,
    marginRight: spacing.xs,
  },
  title: {
    ...typography.h4,
    color: colors.deepMaroon,
    fontSize: 14,
  },
  expandBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  expandText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  list: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  attributionRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  attributionText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
