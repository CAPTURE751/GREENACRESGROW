import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Save, Package, CheckSquare, CreditCard, ClipboardCheck, Monitor, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPrefs {
  low_stock_alerts: boolean;
  task_reminders: boolean;
  payment_confirmations: boolean;
  audit_reminders: boolean;
  system_updates: boolean;
  financial_reports: boolean;
}

const defaultPrefs: NotificationPrefs = {
  low_stock_alerts: true,
  task_reminders: true,
  payment_confirmations: true,
  audit_reminders: true,
  system_updates: true,
  financial_reports: false,
};

const PREF_ITEMS: { key: keyof NotificationPrefs; label: string; description: string; icon: typeof Bell; adminOnly?: boolean }[] = [
  { key: 'low_stock_alerts', label: 'Low Stock Alerts', description: 'Get notified when inventory items fall below threshold', icon: Package },
  { key: 'task_reminders', label: 'Task Reminders', description: 'Reminders for upcoming and overdue tasks', icon: CheckSquare },
  { key: 'payment_confirmations', label: 'Payment Confirmations', description: 'Alerts when sales or purchase payments are confirmed', icon: CreditCard },
  { key: 'audit_reminders', label: 'Audit Reminders', description: 'Monthly audit and compliance reminders', icon: ClipboardCheck, adminOnly: true },
  { key: 'system_updates', label: 'System Updates', description: 'Important system changes and feature updates', icon: Monitor },
  { key: 'financial_reports', label: 'Financial Report Summaries', description: 'Periodic financial overview notifications', icon: BarChart3 },
];

export function NotificationSettings() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);

  useEffect(() => {
    if (user) loadPrefs();
  }, [user]);

  const loadPrefs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notification_preferences' as any)
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!error && data) {
      const d = data as any;
      setPrefs({
        low_stock_alerts: d.low_stock_alerts,
        task_reminders: d.task_reminders,
        payment_confirmations: d.payment_confirmations,
        audit_reminders: d.audit_reminders,
        system_updates: d.system_updates,
        financial_reports: d.financial_reports,
      });
      setHasRecord(true);
    }
    setLoading(false);
  };

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = { ...prefs, user_id: user.id, updated_at: new Date().toISOString() } as any;

    let error;
    if (hasRecord) {
      ({ error } = await supabase
        .from('notification_preferences' as any)
        .update(payload)
        .eq('user_id', user.id));
    } else {
      ({ error } = await supabase
        .from('notification_preferences' as any)
        .insert(payload));
      if (!error) setHasRecord(true);
    }

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save notification preferences.' });
    } else {
      toast({ title: 'Preferences Saved', description: 'Your notification settings have been updated.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const isAdmin = hasRole('admin');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>Choose which notifications you want to receive. These apply to your account only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {PREF_ITEMS.filter(item => !item.adminOnly || isAdmin).map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Switch
                id={item.key}
                checked={prefs[item.key]}
                onCheckedChange={() => handleToggle(item.key)}
              />
            </div>
          );
        })}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="bg-farm-green hover:bg-farm-green/90">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
