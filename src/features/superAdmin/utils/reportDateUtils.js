/**
 * Report Date and Period Utilities for Jinaarya Vihar Setu
 * Timezone: Asia/Kolkata (en-IN)
 */

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Format an ISO date/time string into Asia/Kolkata localized string
 */
export const formatKolkataDateTime = (isoString, options = {}) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    });
  } catch {
    return String(isoString);
  }
};

/**
 * Format an ISO date into YYYY-MM-DD
 */
export const formatKolkataDateOnly = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return String(isoString);
  }
};

/**
 * Get period date range in UTC ISO string for DB queries based on preset
 */
export const getPeriodRange = (preset = 'last_30_days') => {
  const now = new Date();
  const to = now.toISOString();

  switch (preset) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to, label: 'Today', key: 'today' };
    }
    case 'last_7_days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to, label: 'Last 7 Days', key: 'last_7_days' };
    }
    case 'last_30_days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to, label: 'Last 30 Days', key: 'last_30_days' };
    }
    case 'last_90_days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to, label: 'Last 90 Days', key: 'last_90_days' };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to, label: 'This Month', key: 'this_month' };
    }
    case 'prev_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString(), label: 'Previous Month', key: 'prev_month' };
    }
    default:
      return { from: '', to: '', label: 'All Time', key: 'all' };
  }
};

/**
 * Format duration in minutes into a human-readable string
 */
export const formatDurationMins = (minutes) => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '—';
  const mins = Math.round(Number(minutes));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
};

/**
 * Calculate difference in minutes between two ISO timestamps
 */
export const calculateDurationMins = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  const t1 = new Date(startIso).getTime();
  const t2 = new Date(endIso).getTime();
  if (isNaN(t1) || isNaN(t2) || t2 < t1) return null;
  return Math.round((t2 - t1) / (1000 * 60));
};
