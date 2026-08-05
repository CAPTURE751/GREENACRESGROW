import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ListTodo, NotebookPen, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface CopilotAction {
  action: 'create_task' | 'complete_task' | 'update_task' | 'delete_task' | 'create_note';
  [key: string]: any;
}

const BLOCK_RE = /```farm-action\s*([\s\S]*?)```/g;

/** Splits assistant content into markdown text and parsed action proposals. */
export function parseCopilotActions(content: string): { text: string; actions: CopilotAction[] } {
  const actions: CopilotAction[] = [];
  const text = content.replace(BLOCK_RE, (_m, body) => {
    try {
      const parsed = JSON.parse(String(body).trim());
      if (parsed && typeof parsed.action === 'string') actions.push(parsed);
    } catch { /* ignore malformed proposal */ }
    return '';
  });
  return { text: text.trim(), actions };
}

const META: Record<string, { label: string; icon: any; tone: string }> = {
  create_task: { label: 'Create task', icon: ListTodo, tone: 'bg-green-100 text-green-800' },
  complete_task: { label: 'Complete task', icon: CheckCircle2, tone: 'bg-blue-100 text-blue-800' },
  update_task: { label: 'Update task', icon: Pencil, tone: 'bg-amber-100 text-amber-800' },
  delete_task: { label: 'Delete task', icon: Trash2, tone: 'bg-red-100 text-red-800' },
  create_note: { label: 'Add note', icon: NotebookPen, tone: 'bg-purple-100 text-purple-800' },
};

const DETAIL_KEYS = ['title', 'task_date', 'task_time', 'task_type', 'priority', 'description', 'content'];

export function CopilotActionCard({ action, farmId }: { action: CopilotAction; farmId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<'pending' | 'running' | 'done' | 'declined'>('pending');

  const meta = META[action.action] || { label: action.action, icon: ListTodo, tone: 'bg-muted' };
  const Icon = meta.icon;

  const run = async () => {
    setState('running');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      if (action.action === 'create_task') {
        if (!action.title || !action.task_date) throw new Error('Task title and date are required');
        const { error } = await supabase.from('tasks').insert({
          title: action.title,
          description: action.description || null,
          task_date: action.task_date,
          task_time: action.task_time || null,
          task_type: action.task_type || 'general',
          priority: action.priority || 'medium',
          completed: false,
          created_by: user.id,
          farm_id: farmId,
        } as any);
        if (error) throw error;
      } else if (action.action === 'complete_task') {
        const { error } = await supabase.from('tasks')
          .update({ completed: true } as any)
          .eq('id', action.task_id).eq('farm_id', farmId);
        if (error) throw error;
      } else if (action.action === 'update_task') {
        const updates: any = {};
        for (const k of ['title', 'task_date', 'task_type', 'priority', 'description', 'task_time']) {
          if (action[k] !== undefined) updates[k] = action[k];
        }
        const { error } = await supabase.from('tasks').update(updates).eq('id', action.task_id).eq('farm_id', farmId);
        if (error) throw error;
      } else if (action.action === 'delete_task') {
        const { error } = await supabase.from('tasks').delete().eq('id', action.task_id).eq('farm_id', farmId);
        if (error) throw error;
      } else if (action.action === 'create_note') {
        const { error } = await supabase.from('notebook_notes' as any).insert({
          title: action.title || 'Copilot note',
          content: action.content || '',
          created_by: user.id,
          farm_id: farmId,
        } as any);
        if (error) throw error;
      } else {
        throw new Error('Unsupported action');
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['notebook-notes'] });
      setState('done');
      toast({ title: 'Action applied', description: meta.label });
    } catch (e: any) {
      setState('pending');
      toast({ variant: 'destructive', title: 'Action failed', description: e?.message || 'Could not apply' });
    }
  };

  return (
    <div className="mt-2 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <Badge className={meta.tone}>{meta.label}</Badge>
        {state === 'done' && <Badge variant="outline" className="text-green-700">Applied</Badge>}
        {state === 'declined' && <Badge variant="outline" className="text-muted-foreground">Dismissed</Badge>}
      </div>
      <div className="mt-2 space-y-0.5 text-xs">
        {DETAIL_KEYS.filter((k) => action[k]).map((k) => (
          <p key={k}>
            <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}: </span>
            {String(action[k])}
          </p>
        ))}
      </div>
      {state === 'pending' && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={run}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setState('declined')}>
            <XCircle className="h-4 w-4 mr-1" /> Dismiss
          </Button>
        </div>
      )}
      {state === 'running' && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Applying…
        </div>
      )}
    </div>
  );
}
