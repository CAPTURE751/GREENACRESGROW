import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2 } from 'lucide-react';
import { useFarm } from '@/contexts/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { exportFarmData, downloadBackup, importFarmData } from '@/lib/farm-backup';

export function BackupRestore() {
  const { activeFarm } = useFarm();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(
    localStorage.getItem('last_backup_at')
  );

  const handleExport = async () => {
    if (!activeFarm) return;
    setExporting(true);
    try {
      const backup = await exportFarmData(activeFarm.id);
      downloadBackup(backup);
      const now = new Date().toISOString();
      localStorage.setItem('last_backup_at', now);
      setLastBackup(now);
      toast({ title: 'Backup exported', description: 'Your farm data has been downloaded.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Export failed', description: e.message });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!activeFarm) return;
    if (!confirm(`This will import data into "${activeFarm.name}". Existing records are kept and new ones added. Continue?`)) return;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/30">
          <p className="font-medium mb-1">Last Backup</p>
          <p className="text-sm text-muted-foreground">
            {lastBackup ? new Date(lastBackup).toLocaleString() : 'No backup yet'}
          </p>
          {activeFarm && <p className="text-xs text-muted-foreground mt-1">Active farm: <span className="font-medium">{activeFarm.name}</span></p>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1" onClick={handleExport} disabled={exporting || !activeFarm}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export Farm Data
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => inputRef.current?.click()}
            disabled={importing || !activeFarm}
          >
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Import Farm Data
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
          />
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Export downloads a JSON file containing crops, livestock, inventory, finances, tasks, and notes for the active farm.</p>
          <p>• Import adds records into the currently active farm (does not overwrite existing data).</p>
        </div>
      </CardContent>
    </Card>
  );
}
