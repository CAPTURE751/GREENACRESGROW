import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, Loader2, Trash2, RefreshCw, Clock, HardDrive } from 'lucide-react';
import { useFarm } from '@/contexts/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { exportFarmData, downloadBackup, importFarmData, type FarmBackup } from '@/lib/farm-backup';
import {
  loadAutoBackupSettings, saveAutoBackupSettings,
  runAutoBackupIfDue, getLastAutoBackup,
  type AutoBackupSettings,
} from '@/hooks/useAutoBackup';
import { listBackups, deleteBackup, pruneBackups, saveBackup, type StoredBackup } from '@/lib/backup-store';

export function BackupRestore() {
  const { activeFarm } = useFarm();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [settings, setSettings] = useState<AutoBackupSettings>(loadAutoBackupSettings);
  const [history, setHistory] = useState<StoredBackup[]>([]);
  const [lastAuto, setLastAuto] = useState<string | null>(null);

  const refreshHistory = async () => {
    if (!activeFarm) return;
    setHistory(await listBackups(activeFarm.id));
    setLastAuto(getLastAutoBackup(activeFarm.id));
  };

  useEffect(() => { refreshHistory(); }, [activeFarm?.id]);

  const updateSetting = <K extends keyof AutoBackupSettings>(key: K, value: AutoBackupSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveAutoBackupSettings(next);
  };

  const handleExport = async () => {
    if (!activeFarm) return;
    setExporting(true);
    try {
      const backup = await exportFarmData(activeFarm.id);
      downloadBackup(backup);
      await saveBackup(activeFarm.id, backup, 'manual');
      await pruneBackups(activeFarm.id, settings.retentionDays);
      await refreshHistory();
      toast({ title: 'Backup created', description: 'Downloaded and stored in history.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Export failed', description: e.message });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!activeFarm) return;
    if (!confirm(`Import data into "${activeFarm.name}"? Existing records are kept and new ones added.`)) return;
    setImporting(true);
    try {
      const result = await importFarmData(file, activeFarm.id);
      toast({
        title: 'Import complete',
        description: `Imported ${result.imported} records${result.errors.length ? `, ${result.errors.length} errors` : ''}.`,
        variant: result.errors.length ? 'destructive' : 'default',
      });
      if (result.errors.length) console.warn('Import errors:', result.errors);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Import failed', description: e.message });
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const restoreFromHistory = async (b: StoredBackup) => {
    if (!activeFarm) return;
    if (!confirm(`Restore from ${new Date(b.created_at).toLocaleString()}? Existing records are kept.`)) return;
    setImporting(true);
    try {
      const file = new File([JSON.stringify(b.backup)], 'backup.json', { type: 'application/json' });
      const result = await importFarmData(file, activeFarm.id);
      toast({ title: 'Restore complete', description: `Imported ${result.imported} records.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Restore failed', description: e.message });
    } finally {
      setImporting(false);
    }
  };

  const downloadStored = (b: StoredBackup) => downloadBackup(b.backup as FarmBackup);

  const runAutoNow = async () => {
    if (!activeFarm) return;
    setAutoRunning(true);
    try {
      // Force-run by temporarily clearing last timestamp
      localStorage.removeItem(`auto_backup_last_${activeFarm.id}`);
      const prev = settings.enabled;
      saveAutoBackupSettings({ ...settings, enabled: true });
      const ok = await runAutoBackupIfDue(activeFarm.id, 'scheduled');
      saveAutoBackupSettings({ ...settings, enabled: prev });
      await refreshHistory();
      toast({ title: ok ? 'Auto-backup ran' : 'Nothing to backup', description: ok ? 'A new backup was stored.' : 'Try again later.' });
    } finally {
      setAutoRunning(false);
    }
  };

  const formatBytes = (n: number) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/30">
            <p className="font-medium mb-1">Last automatic backup</p>
            <p className="text-sm text-muted-foreground">
              {lastAuto ? new Date(lastAuto).toLocaleString() : 'Never'}
            </p>
            {activeFarm && <p className="text-xs text-muted-foreground mt-1">Active farm: <span className="font-medium">{activeFarm.name}</span></p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" onClick={handleExport} disabled={exporting || !activeFarm}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Farm Data
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => inputRef.current?.click()} disabled={importing || !activeFarm}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import Farm Data
            </Button>
            <input ref={inputRef} type="file" accept="application/json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Automatic Backups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable daily auto-backup</Label>
              <p className="text-xs text-muted-foreground">Snapshots of your farm data are stored locally on this device.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(v) => updateSetting('enabled', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Run on app open</Label>
              <p className="text-xs text-muted-foreground">Take a backup whenever you open the app if one is due.</p>
            </div>
            <Switch checked={settings.runOnAppOpen} onCheckedChange={(v) => updateSetting('runOnAppOpen', v)} disabled={!settings.enabled} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hour">Preferred hour (0–23)</Label>
              <Input id="hour" type="number" min={0} max={23} value={settings.preferredHour}
                onChange={(e) => updateSetting('preferredHour', Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                disabled={!settings.enabled} />
              <p className="text-[11px] text-muted-foreground mt-1">Scheduled backups wait until this local hour.</p>
            </div>
            <div>
              <Label htmlFor="freq">Every N days</Label>
              <Input id="freq" type="number" min={1} max={30} value={settings.frequencyDays}
                onChange={(e) => updateSetting('frequencyDays', Math.max(1, Number(e.target.value) || 1))}
                disabled={!settings.enabled} />
              <p className="text-[11px] text-muted-foreground mt-1">Minimum gap between auto-backups.</p>
            </div>
            <div>
              <Label htmlFor="retention">Retention (days)</Label>
              <Input id="retention" type="number" min={1} max={365} value={settings.retentionDays}
                onChange={(e) => updateSetting('retentionDays', Math.max(1, Number(e.target.value) || 1))}
                disabled={!settings.enabled} />
              <p className="text-[11px] text-muted-foreground mt-1">Older backups are auto-deleted.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runAutoNow} disabled={autoRunning || !activeFarm}>
              {autoRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Run backup now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No stored backups yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((b) => (
                <div key={b.id} className="flex items-center justify-between border rounded-lg p-2 text-sm gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{new Date(b.created_at).toLocaleString()}</span>
                      <Badge variant={b.trigger === 'auto' ? 'secondary' : 'outline'}>{b.trigger}</Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(b.size)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => downloadStored(b)} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => restoreFromHistory(b)} title="Restore">
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await deleteBackup(b.id); refreshHistory(); }} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
