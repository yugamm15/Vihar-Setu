import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { formatKolkataDateTime, TIMEZONE } from '../utils/reportDateUtils';
import { superAdminExportService } from '../services/superAdminExportService';

export const SuperAdminReportPreviewModal = ({
  visible,
  onClose,
  title = 'Operational Governance Report',
  period = 'All Recorded Time',
  summaryMetrics = [],
  headers = [],
  rows = [],
}) => {
  const generatedTime = formatKolkataDateTime(new Date().toISOString());

  const handleExportCSV = () => {
    const csv = superAdminExportService.generateCSV({
      title,
      period,
      headers,
      rows,
      summaryMetrics,
    });
    superAdminExportService.shareReport({
      title: `${title} (CSV)`,
      filename: `${title.toLowerCase().replace(/\s+/g, '_')}.csv`,
      content: csv,
    });
  };

  const handleShareDoc = () => {
    const docText = superAdminExportService.generateDocumentText({
      title,
      period,
      summaryMetrics,
      headers,
      rows,
    });
    superAdminExportService.shareReport({
      title: `${title} (Document)`,
      filename: `${title.toLowerCase().replace(/\s+/g, '_')}.txt`,
      content: docText,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, shadows.elevated]}>
          {/* Official Letterhead Header */}
          <View style={styles.letterhead}>
            <View style={styles.headerTop}>
              <Text style={styles.appTitle}>જિનાર્ય વિહાર સેતુ • JINAARYA VIHAR SETU</Text>
              <Text style={styles.badge}>OFFICIAL REPORT</Text>
            </View>
            <Text style={styles.reportTitle}>{title}</Text>
            <Text style={styles.metaText}>
              Generated: {generatedTime} ({TIMEZONE}) • Period: {period}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={true}>
            {/* Summary Metrics Section */}
            {summaryMetrics.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>EXECUTIVE SUMMARY</Text>
                <View style={styles.metricsGrid}>
                  {summaryMetrics.map((m, idx) => (
                    <View key={`sum-${idx}`} style={styles.metricItem}>
                      <Text style={styles.metricVal}>{m.value}</Text>
                      <Text style={styles.metricLbl}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Detailed Records Table */}
            <View style={styles.section}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.sectionHeader}>DETAILED RECORDS ({rows.length})</Text>
              </View>

              {rows.length === 0 ? (
                <Text style={styles.emptyText}>No records found for the selected period.</Text>
              ) : (
                <View style={styles.table}>
                  {/* Column Headers */}
                  <View style={styles.headerRow}>
                    <Text style={[styles.colHeader, styles.numCol]}>#</Text>
                    {headers.map((h, i) => (
                      <Text key={`h-${i}`} style={styles.colHeader} numberOfLines={1}>
                        {h}
                      </Text>
                    ))}
                  </View>

                  {/* Rows */}
                  {rows.slice(0, 100).map((row, rIdx) => (
                    <View key={`r-${rIdx}`} style={[styles.dataRow, rIdx % 2 === 1 && styles.altRow]}>
                      <Text style={[styles.cellText, styles.numCol]}>{rIdx + 1}</Text>
                      {row.map((cell, cIdx) => (
                        <Text key={`c-${cIdx}`} style={styles.cellText} numberOfLines={2}>
                          {cell === null || cell === undefined ? '—' : String(cell)}
                        </Text>
                      ))}
                    </View>
                  ))}
                  {rows.length > 100 && (
                    <Text style={styles.truncatedNotice}>
                      Showing first 100 records. Full dataset available in CSV Export.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Confidentiality Footer */}
            <View style={styles.footerNote}>
              <Text style={styles.footerText}>
                CONFIDENTIAL — STRICTLY FOR AUTHORIZED SUPER ADMINISTRATOR GOVERNANCE ONLY.
              </Text>
              <Text style={styles.footerSub}>
                Jinaarya Vihar Seva Group • Life-Safety Ecosystem for Jain Sadhvijis
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleExportCSV}>
              <Text style={styles.btnSecondaryText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleShareDoc}>
              <Text style={styles.btnPrimaryText}>Share PDF / Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnClose} onPress={onClose}>
              <Text style={styles.btnCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.warmIvory,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
    minHeight: '75%',
    display: 'flex',
  },
  letterhead: {
    backgroundColor: colors.deepMaroon,
    padding: spacing.md,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appTitle: {
    color: colors.goldLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badge: {
    backgroundColor: colors.gold,
    color: colors.deepMaroon,
    fontSize: 8.5,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  reportTitle: {
    ...typography.h3,
    color: colors.warmIvory,
    fontWeight: '800',
  },
  metaText: {
    ...typography.caption,
    color: colors.goldMuted,
    fontSize: 10,
    marginTop: 2,
  },
  scrollBody: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    backgroundColor: colors.cardBackground,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricItem: {
    width: '48%',
    padding: spacing.xs,
  },
  metricVal: {
    ...typography.body,
    fontWeight: '800',
    color: colors.deepMaroon,
  },
  metricLbl: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.softCream,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  colHeader: {
    flex: 1,
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.deepMaroon,
    paddingHorizontal: 2,
  },
  numCol: {
    flex: 0.35,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
    alignItems: 'center',
  },
  altRow: {
    backgroundColor: '#FAF7F0',
  },
  cellText: {
    flex: 1,
    fontSize: 9.5,
    color: colors.textPrimary,
    paddingHorizontal: 2,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  truncatedNotice: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
    fontStyle: 'italic',
  },
  footerNote: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: spacing.sm,
  },
  footerText: {
    fontSize: 8.5,
    color: colors.statusEmergency,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerSub: {
    fontSize: 8.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.softCream,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  btnSecondaryText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '800',
  },
  btnPrimary: {
    flex: 1.2,
    backgroundColor: colors.saffron,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  btnPrimaryText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  btnClose: {
    flex: 0.7,
    backgroundColor: colors.deepMaroon,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  btnCloseText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '700',
  },
});
