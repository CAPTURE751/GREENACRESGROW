import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Settings, User, Download, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useFarm } from "@/contexts/FarmContext";
import { useToast } from "@/hooks/use-toast";
import { exportFarmData, downloadBackup, importFarmData } from "@/lib/farm-backup";
import { saveBackup, pruneBackups } from "@/lib/backup-store";
import { loadAutoBackupSettings } from "@/hooks/useAutoBackup";

export function Header() {
  const { activeFarm } = useFarm();
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const farmName = activeFarm?.name || 'My Farm';
  const farmLocation = activeFarm?.location || '';
  const logoUrl = activeFarm?.logo_url;

  const handleExport = async () => {
    if (!activeFarm) return;
    setExporting(true);
    try {
      const backup = await exportFarmData(activeFarm.id);
      downloadBackup(backup);
      await saveBackup(activeFarm.id, backup, 'manual');
      await pruneBackups(activeFarm.id, loadAutoBackupSettings().retentionDays);
      toast({ title: 'Backup exported', description: 'Download started and saved to history.' });
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
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Import failed', description: e.message });
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <header className="h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Farm logo" className="h-10 w-10 rounded-md object-contain" />
          )}
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold text-farm-green">{farmName}</h1>
            <p className="text-xs text-muted-foreground">{farmLocation}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || !activeFarm}
          title="Export entire farm"
        >
          {exporting ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <Download className="h-4 w-4 sm:mr-2" />}
          <span className="hidden sm:inline">Export</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={importing || !activeFarm}
          title="Import farm backup"
        >
          {importing ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <Upload className="h-4 w-4 sm:mr-2" />}
          <span className="hidden sm:inline">Import</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
        />
        <NotificationCenter />
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings?tab=backup')} title="Backup & Restore settings">
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
