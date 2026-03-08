
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const themes = [
  { id: 'light' as const, name: 'Light', icon: Sun, description: 'Clean and bright interface' },
  { id: 'dark' as const, name: 'Dark', icon: Moon, description: 'Easy on the eyes in low light' },
  { id: 'system' as const, name: 'System', icon: Monitor, description: 'Follow your device settings' },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of your farm management system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">Theme</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                  theme === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <t.icon className={cn("h-8 w-8", theme === t.id ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <p className={cn("font-medium text-sm", theme === t.id ? "text-primary" : "text-foreground")}>{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
