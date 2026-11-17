import { Share, Alert, Platform } from 'react-native';
import { formatKolkataDateTime, TIMEZONE } from '../utils/reportDateUtils';

/**
 * Super Admin Export Service
 * Supports CSV export with UTF-8 BOM (for Gujarati, Hindi, English)
 * and formatted PDF / printable document export with metadata.
 */

/**
 * Escape a value for CSV cell according to RFC 4180
 */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const superAdminExportService = {
  /**
   * Build a CSV string with UTF-8 BOM
   * @param {Object} options
   * @param {string} options.title - Report title
   * @param {string} options.period - Time period description
   * @param {Array<string>} options.headers - Column header labels
   * @param {Array<Array<any>>} options.rows - Data rows
   * @param {Array<{label: string, value: any}>} [options.summaryMetrics] - Optional summary rows
   * @returns {string} - CSV string with \uFEFF BOM
   */
  generateCSV({ title, period, headers = [], rows = [], summaryMetrics = [] }) {
    const BOM = '\uFEFF';
    const lines = [];

    // Header metadata
    lines.push(escapeCSV(`JINAARYA VIHAR SETU — ${title}`));
    lines.push(`${escapeCSV('Generated At (Asia/Kolkata)')},${escapeCSV(formatKolkataDateTime(new Date().toISOString()))}`);
    if (period) {
      lines.push(`${escapeCSV('Reporting Period')},${escapeCSV(period)}`);
    }
    lines.push('');

    // Summary metrics if provided
    if (summaryMetrics.length > 0) {
      lines.push(escapeCSV('--- SUMMARY METRICS ---'));
      summaryMetrics.forEach((m) => {
        lines.push(`${escapeCSV(m.label)},${escapeCSV(m.value)}`);
      });
      lines.push('');
    }

    // Table header and rows
    lines.push(headers.map(escapeCSV).join(','));
    rows.forEach((row) => {
      lines.push(row.map(escapeCSV).join(','));
    });

    lines.push('');
    lines.push(escapeCSV('Confidential — Jinaarya Vihar Setu Central Super Administrator Governance Suite'));

    return BOM + lines.join('\r\n');
  },

  /**
   * Build a structured document text layout suitable for PDF / printable viewing
   */
  generateDocumentText({ title, period, summaryMetrics = [], headers = [], rows = [] }) {
    const divider = '================================================================================';
    const subDivider = '--------------------------------------------------------------------------------';
    const nowStr = formatKolkataDateTime(new Date().toISOString());

    const lines = [];
    lines.push(divider);
    lines.push('                   JINAARYA VIHAR SETU — SUPER ADMINISTRATOR REPORT');
    lines.push('               Life-Safety & Protection Platform for Jain Sadhvijis');
    lines.push(divider);
    lines.push(`REPORT:           ${title}`);
    lines.push(`GENERATED AT:     ${nowStr} (${TIMEZONE})`);
    lines.push(`REPORTING PERIOD: ${period || 'All Recorded Time'}`);
    lines.push(`AUTHORITY:        CENTRAL GOVERNANCE SUITE — SUPER ADMINISTRATOR`);
    lines.push(divider);

    if (summaryMetrics.length > 0) {
      lines.push('');
      lines.push('EXECUTIVE SUMMARY:');
      lines.push(subDivider);
      summaryMetrics.forEach((m) => {
        const paddedLabel = (m.label + ':').padEnd(36, ' ');
        lines.push(`  ${paddedLabel} ${m.value}`);
      });
      lines.push(subDivider);
    }

    if (headers.length > 0 && rows.length > 0) {
      lines.push('');
      lines.push(`DETAILED RECORDS (Total: ${rows.length}):`);
      lines.push(subDivider);
      lines.push(headers.join(' | '));
      lines.push(subDivider);
      rows.forEach((row, idx) => {
        lines.push(`${idx + 1}. ` + row.join(' | '));
      });
      lines.push(subDivider);
    } else {
      lines.push('');
      lines.push('No individual line records to display for the selected criteria.');
    }

    lines.push('');
    lines.push(divider);
    lines.push('CONFIDENTIALITY NOTICE:');
    lines.push('This report contains sensitive operational and life-safety governance data.');
    lines.push('Strictly for verified Super Administrators of Jinaarya Vihar Seva Group.');
    lines.push(divider);

    return lines.join('\n');
  },

  /**
   * Share the export using React Native Share API
   */
  async shareReport({ title, filename, content }) {
    try {
      const shareTitle = `Vihar Setu - ${title}`;
      const result = await Share.share(
        Platform.select({
          ios: {
            title: shareTitle,
            message: content,
          },
          default: {
            title: shareTitle,
            message: content,
          },
        }),
        {
          dialogTitle: `Export ${title}`,
          subject: shareTitle,
        }
      );
      return { success: true, result };
    } catch (error) {
      Alert.alert('Export Error', error.message || 'Failed to export report.');
      return { success: false, error };
    }
  },
};
