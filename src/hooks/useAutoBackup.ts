// Auto-backup configuration + scheduler hook.
import { useEffect, useRef } from 'react';
import { useFarm } from '@/contexts/FarmContext';
import { exportFarmData } from '@/lib/farm-backup';
import { saveBackup, pruneBackups } from '@/lib/backup-store';

export interface AutoBackupSettings {
  enabled: boolean;
  runOnAppOpen: boolean;
  preferredHour: number;    // 0-23 local time
  retentionDays: number;    // backups older than this are pruned
  frequencyDays: number;    // minimum days between auto-backups
}

const KEY = 'auto_backup_settings_v1';

export const DEFAULT_AUTO_BACKUP: AutoBackupSettings = {
  enabled: false,
  runOnAppOpen: true,
  preferredHour: 2,
  retentionDays: 14,
  frequencyDays: 1,
};

export function loadAutoBackupSettings(): AutoBackupSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AUTO_BACKUP;
    return { ...DEFAULT_AUTO_BACKUP, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AUTO_BACKUP;
  }
}

export function saveAutoBackupSettings(s: AutoBackupSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function lastAutoKey(farmId: string) {
  return `auto_backup_last_${farmId}`;
}

export function getLastAutoBackup(farmId: string): string | null {
  return localStorage.getItem(lastAutoKey(farmId));
}

function setLastAutoBackup(farmId: string, iso: string) {
  localStorage.setItem(lastAutoKey(farmId), iso);
}

export async function runAutoBackupIfDue(farmId: string, reason: 'app-open' | 'scheduled'): Promise<boolean> {
  const s = loadAutoBackupSettings();
  if (!s.enabled) return false;
  if (reason === 'app-open' && !s.runOnAppOpen) return false;

  const last = getLastAutoBackup(farmId);
  const now = new Date();
  if (last) {
    const ageMs = Date.now() - Date.parse(last);
    if (ageMs < s.frequencyDays * 86400000) return false;
  }
  // Only run once we've reached the preferred hour on scheduled checks.
  if (reason === 'scheduled' && now.getHours() < s.preferredHour) return false;

  try {
    const backup = await exportFarmData(farmId);
    await saveBackup(farmId, backup, 'auto');
    await pruneBackups(farmId, s.retentionDays);
    setLastAutoBackup(farmId, now.toISOString());
    return true;
  } catch (e) {
    console.error('Auto-backup failed:', e);
    return false;
  }
}

/** Runs once on mount when the active farm changes, and every hour while the app is open. */
export function useAutoBackup() {
  const { activeFarm } = useFarm();
  const ranOnce = useRef<string | null>(null);

  useEffect(() => {
    if (!activeFarm) return;
    if (ranOnce.current !== activeFarm.id) {
      ranOnce.current = activeFarm.id;
      runAutoBackupIfDue(activeFarm.id, 'app-open');
    }
    const id = setInterval(() => {
      runAutoBackupIfDue(activeFarm.id, 'scheduled');
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [activeFarm?.id]);
}
