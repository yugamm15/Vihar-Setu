import { supabase } from '../../../core/config/supabase';

/**
 * Multi-Admin Sequential & Parallel Escalation Engine (Phase 22)
 *
 * Tier 1 (0s): Assigned Area Administrator (Surat Area)
 * Tier 2 (+90s unacknowledged): Broadcast to ALL Regional Administrators in Surat
 * Tier 3 (+180s unacknowledged): Critical escalation to Super Administrators
 */
class EscalationService {
  constructor() {
    this.activeTimers = new Map(); // emergencyId -> { tier1Timer, tier2Timer }
  }

  /**
   * Start multi-tiered escalation pipeline for an emergency
   * @param {string} emergencyId
   * @param {string} areaId (optional, defaults to Surat Area)
   */
  async initiateEscalation(emergencyId, areaId = null) {
    if (!emergencyId) return;

    try {
      // 1. Find assigned primary Area Administrator(s)
      let query = supabase
        .from('administrators')
        .select('user_id, area_id, profiles:user_id(full_name, phone)')
        .eq('status', 'ACTIVE');

      if (areaId) {
        query = query.eq('area_id', areaId);
      }

      const { data: areaAdmins } = await query;

      // 2. Insert Tier-1 Attempt records
      if (areaAdmins && areaAdmins.length > 0) {
        const attempts = areaAdmins.map((admin) => ({
          emergency_id: emergencyId,
          admin_id: admin.user_id,
          attempt_number: 1,
          status: 'NOTIFIED',
          notified_at: new Date().toISOString(),
        }));

        await supabase.from('emergency_attempts').insert(attempts);
      }

      // 3. Schedule Tier-2 Escalation at +90 seconds
      const tier1Timer = setTimeout(async () => {
        await this._escalateToTier2(emergencyId, areaId);
      }, 90000);

      this.activeTimers.set(emergencyId, { tier1Timer, tier2Timer: null });
    } catch (err) {
      console.warn('[EscalationService] Tier-1 initiation notice:', err);
    }
  }

  /**
   * Tier 2 Escalation: Broadcast to all regional administrators (+90s)
   */
  async _escalateToTier2(emergencyId, areaId) {
    try {
      // Check if emergency was already acknowledged or resolved
      const { data: em } = await supabase
        .from('emergencies')
        .select('status')
        .eq('id', emergencyId)
        .single();

      if (!em || em.status !== 'TRIGGERED') {
        this.clearTimers(emergencyId);
        return;
      }

      // Fetch all regional administrators
      const { data: regionalAdmins } = await supabase
        .from('administrators')
        .select('user_id')
        .eq('status', 'ACTIVE');

      if (regionalAdmins && regionalAdmins.length > 0) {
        const attempts = regionalAdmins.map((admin) => ({
          emergency_id: emergencyId,
          admin_id: admin.user_id,
          attempt_number: 2,
          status: 'NOTIFIED',
          notified_at: new Date().toISOString(),
        }));

        await supabase.from('emergency_attempts').insert(attempts);
      }

      // Schedule Tier-3 Escalation at +180s from start (+90s from now)
      const tier2Timer = setTimeout(async () => {
        await this._escalateToTier3(emergencyId);
      }, 90000);

      const entry = this.activeTimers.get(emergencyId) || {};
      this.activeTimers.set(emergencyId, { ...entry, tier2Timer });
    } catch (err) {
      console.warn('[EscalationService] Tier-2 escalation notice:', err);
    }
  }

  /**
   * Tier 3 Escalation: Critical escalation to Super Administrators (+180s)
   */
  async _escalateToTier3(emergencyId) {
    try {
      const { data: em } = await supabase
        .from('emergencies')
        .select('status')
        .eq('id', emergencyId)
        .single();

      if (!em || em.status !== 'TRIGGERED') {
        this.clearTimers(emergencyId);
        return;
      }

      // Fetch Super Admins
      const { data: superAdmins } = await supabase
        .from('user_roles')
        .select('user_id, roles!inner(name)')
        .eq('roles.name', 'SUPER_ADMIN');

      if (superAdmins && superAdmins.length > 0) {
        const attempts = superAdmins.map((sa) => ({
          emergency_id: emergencyId,
          admin_id: sa.user_id,
          attempt_number: 3,
          status: 'NOTIFIED',
          notified_at: new Date().toISOString(),
        }));

        await supabase.from('emergency_attempts').insert(attempts);
      }
    } catch (err) {
      console.warn('[EscalationService] Tier-3 escalation notice:', err);
    } finally {
      this.clearTimers(emergencyId);
    }
  }

  /**
   * Acknowledge Emergency by an Administrator
   * Stops the escalation timers and records acknowledgment
   */
  async acknowledgeEmergency(emergencyId, adminId, notes = 'Help dispatched by Admin') {
    this.clearTimers(emergencyId);

    try {
      const now = new Date().toISOString();

      // 1. Update emergency attempt status
      await supabase
        .from('emergency_attempts')
        .update({
          status: 'ACKNOWLEDGED',
          responded_at: now,
        })
        .eq('emergency_id', emergencyId)
        .eq('admin_id', adminId);

      // 2. Update emergency record
      await supabase
        .from('emergencies')
        .update({
          status: 'ACKNOWLEDGED',
          resolved_by: adminId,
          resolution_notes: notes,
        })
        .eq('id', emergencyId);

      return { success: true };
    } catch (err) {
      console.warn('[EscalationService] Acknowledge error:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Clear running escalation timers
   */
  clearTimers(emergencyId) {
    const timers = this.activeTimers.get(emergencyId);
    if (timers) {
      if (timers.tier1Timer) clearTimeout(timers.tier1Timer);
      if (timers.tier2Timer) clearTimeout(timers.tier2Timer);
      this.activeTimers.delete(emergencyId);
    }
  }
}

export const escalationService = new EscalationService();

