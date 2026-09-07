/**
 * Alarm & Pre-Vihar Preparation Alert Service
 * Calculates pre-vihar 30-minute alarm and manages preparation checklists.
 */

export const alarmService = {
  /**
   * Calculates the exact alarm timestamp (30 minutes before departure)
   */
  getAlarmTime(departureDateStr, departureTimeStr) {
    try {
      // Parse departure date and time
      const targetDate = new Date();
      if (departureDateStr === 'Tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      // Parse time string e.g. "05:30 AM"
      const match = departureTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3].toUpperCase();

        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        targetDate.setHours(hours, minutes, 0, 0);
      }

      // Alarm is 30 minutes before
      const alarmDate = new Date(targetDate.getTime() - 30 * 60 * 1000);
      return {
        departureDate: targetDate,
        alarmDate,
        alarmTimeString: this.formatTime(alarmDate),
      };
    } catch (e) {
      console.warn('[AlarmService] getAlarmTime error:', e);
      return {
        departureDate: new Date(),
        alarmDate: new Date(),
        alarmTimeString: '30 mins before',
      };
    }
  },

  /**
   * Format Date to standard readable string
   */
  formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  },

  /**
   * Pre-Vihar Seva Preparation Checklist Items (Clean typography without emojis)
   */
  getPreparationChecklist() {
    return [
      { id: '1', title: 'Navkar Mantra Recitation', detail: 'Begin with 3 Navkar Mantras for protection and reverence.' },
      { id: '2', title: 'Route and Upashray Verification', detail: 'Confirm destination and safe road pathways.' },
      { id: '3', title: 'Dandak and Ogho Seva Gear', detail: 'Inspect spiritual Seva instruments and white cloths.' },
      { id: '4', title: 'Battery 100% and GPS Active', detail: 'Ensure mobile phone is fully charged with GPS turned ON.' },
      { id: '5', title: 'Footwear and Cleanliness Check', detail: 'Ensure sacred footwear protocols are observed.' },
    ];
  },
};
