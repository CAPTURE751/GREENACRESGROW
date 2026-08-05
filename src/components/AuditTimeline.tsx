import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, Pencil, Trash2, History, User } from 'lucide-react';
import { useRecordAudit, describeChanges, type AuditEntry } from '@/hooks/useAuditLog';

interface AuditTimelineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  recordId: string | null;
  title?: string;
}

const ACTION_META: Record<string, { label: string; icon: any; classes: string }> = {
  insert: { label: 'Created', icon: PlusCircle, classes: 'bg-green-100 text-green-800 border-green-200' },
  update: { label: 'Edited', icon: Pencil, classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  delete: { label: 'Deleted', icon: Trash2, classes: 'bg-red-100 text-red-800 border-red-200' },
};

function fmt(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function label(field: string) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function EntryCard({ entry }: { entry: AuditEntry }) {
  const meta = ACTION_META[entry.action] || ACTION_META.update;
  const Icon = meta.icon;
  const changes = describeChanges(entry);

  return (
    <div className="relative pl-8 pb-5 last:pb-0">
      <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border last:hidden" />
      <span className="absolute left-0 top-1 h-6 w-6 rounded-full border bg-background flex items-center justify-center">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={meta.classes}>{meta.label}</Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" />
          {entry.actor_name || 'System'}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(entry.created_at).toLocaleString()}
        </span>
      </div>
      {changes.length > 0 && (
        <div className="mt-2 rounded-md border bg-muted/40 divide-y text-xs">
          {changes.map((c) => (
            <div key={c.field} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-1.5 items-center">
              <span className="font-medium">{label(c.field)}</span>
              <span className="text-muted-foreground">→</span>
              <span>
                <span className="line-through text-muted-foreground mr-1">{fmt(c.from)}</span>
                <span className="font-medium">{fmt(c.to)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {entry.action === 'insert' && (
        <p className="text-xs text-muted-foreground mt-1">Record added to the system.</p>
      )}
      {entry.action === 'delete' && (
        <p className="text-xs text-muted-foreground mt-1">Record permanently removed.</p>
      )}
    </div>
  );
}

export function AuditTimeline({ open, onOpenChange, tableName, recordId, title }: AuditTimelineProps) {
  const { data: entries = [], isLoading } = useRecordAudit(tableName, open ? recordId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Timeline
          </DialogTitle>
          {title && <p className="text-sm text-muted-foreground text-left">{title}</p>}
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-farm-green" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No audit history recorded for this record yet.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="pt-2">
              {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
