import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, Monitor, Check, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  applyTheme, loadTheme, saveTheme, loadSavedThemes, persistSavedThemes,
  getActiveThemeId, setActiveThemeId, BUILTIN_THEMES, DEFAULT_THEME,
  type ThemeConfig, type SavedTheme,
} from '@/lib/theme-manager';

const modes = [
  { id: 'light', name: 'Light', icon: Sun },
  { id: 'dark', name: 'Dark', icon: Moon },
  { id: 'system', name: 'System', icon: Monitor },
] as const;

const densities = ['compact', 'comfortable', 'spacious'] as const;
const fonts = ['Inter', 'Roboto', 'Poppins', 'System', 'Georgia'] as const;
const buttonStyles = ['rounded', 'pill', 'square'] as const;
const sidebarStyles = [
  { id: 'navy-trust', name: 'Navy Trust', color: '#1e3a8a' },
  { id: 'emerald-prestige', name: 'Emerald Prestige', color: '#047857' },
  { id: 'midnight-indigo', name: 'Midnight Indigo', color: '#4338ca' },
  { id: 'cloud-white', name: 'Cloud White', color: '#e0f2fe' },
  { id: 'forest-green', name: 'Forest Green', color: '#4a7c59' },
] as const;
const cardStyles = ['elevated', 'flat', 'bordered', 'glass'] as const;

export function ThemeManagement() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<ThemeConfig>(() => loadTheme());
  const [saved, setSaved] = useState<SavedTheme[]>(() => loadSavedThemes());
  const [activeId, setActiveId] = useState<string | null>(() => getActiveThemeId());
  const [newName, setNewName] = useState('');

  useEffect(() => {
    applyTheme(cfg);
    saveTheme(cfg);
  }, [cfg]);

  const update = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    setCfg((c) => ({ ...c, [key]: value }));
    setActiveId(null);
    setActiveThemeId(null);
  };

  const allThemes: SavedTheme[] = [...BUILTIN_THEMES, ...saved];

  const applyPreset = (t: SavedTheme) => {
    setCfg(t.config);
    setActiveId(t.id);
    setActiveThemeId(t.id);
    toast({ title: 'Theme applied', description: t.name });
  };

  const saveCurrent = () => {
    const name = newName.trim();
    if (!name) {
      toast({ title: 'Name required', description: 'Enter a name for the theme.', variant: 'destructive' });
      return;
    }
    const item: SavedTheme = { id: `custom-${Date.now()}`, name, config: cfg };
    const next = [...saved, item];
    setSaved(next);
    persistSavedThemes(next);
    setActiveId(item.id);
    setActiveThemeId(item.id);
    setNewName('');
    toast({ title: 'Theme saved', description: name });
  };

  const deleteTheme = (id: string) => {
    const next = saved.filter((t) => t.id !== id);
    setSaved(next);
    persistSavedThemes(next);
    if (activeId === id) { setActiveId(null); setActiveThemeId(null); }
  };

  const resetDefaults = () => {
    setCfg(DEFAULT_THEME);
    setActiveId(null);
    setActiveThemeId(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Management</CardTitle>
          <CardDescription>Customize appearance, typography, colors, and saved theme presets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Appearance */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold">Appearance</h3>

            <div className="space-y-2">
              <Label>Theme mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => update('mode', m.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      cfg.mode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    )}
                  >
                    <m.icon className={cn('h-5 w-5', cfg.mode === m.id ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-xs font-medium">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Layout density</Label>
                <Select value={cfg.density} onValueChange={(v) => update('density', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {densities.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font family</Label>
                <Select value={cfg.fontFamily} onValueChange={(v) => update('fontFamily', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fonts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex justify-between">
                  <Label>Font size</Label>
                  <span className="text-sm text-muted-foreground">{cfg.fontSize}px</span>
                </div>
                <Slider
                  min={12} max={20} step={1}
                  value={[cfg.fontSize]}
                  onValueChange={(v) => update('fontSize', v[0])}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Button style</Label>
                <div className="grid grid-cols-3 gap-2">
                  {buttonStyles.map((b) => (
                    <button
                      key={b}
                      onClick={() => update('buttonStyle', b)}
                      className={cn(
                        'p-3 border-2 capitalize text-sm font-medium transition-all',
                        b === 'rounded' && 'rounded-lg',
                        b === 'pill' && 'rounded-full',
                        b === 'square' && 'rounded-sm',
                        cfg.buttonStyle === b ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Brand colors */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold">Brand colors</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={cfg.primaryColor}
                    onChange={(e) => update('primaryColor', e.target.value)}
                    className="h-10 w-14 rounded-md border cursor-pointer bg-transparent" />
                  <Input value={cfg.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Accent</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={cfg.accentColor}
                    onChange={(e) => update('accentColor', e.target.value)}
                    className="h-10 w-14 rounded-md border cursor-pointer bg-transparent" />
                  <Input value={cfg.accentColor} onChange={(e) => update('accentColor', e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar & Card */}
          <section className="space-y-4">
            <div className="space-y-2">
              <Label>Sidebar style</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {sidebarStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update('sidebarStyle', s.id as any)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      cfg.sidebarStyle === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="h-8 w-8 rounded-md" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-medium text-center">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Card style</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {cardStyles.map((c) => (
                  <button
                    key={c}
                    onClick={() => update('cardStyle', c)}
                    className={cn(
                      'p-3 rounded-lg border-2 capitalize text-sm font-medium transition-all',
                      cfg.cardStyle === c ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved themes</CardTitle>
          <CardDescription>Quickly switch between built-in or custom themes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allThemes.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'relative p-4 rounded-lg border-2 transition-all',
                  activeId === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <button onClick={() => applyPreset(t)} className="w-full text-left">
                  <div className="flex gap-1 mb-3">
                    <div className="h-6 w-6 rounded" style={{ backgroundColor: t.config.primaryColor }} />
                    <div className="h-6 w-6 rounded" style={{ backgroundColor: t.config.accentColor }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t.name}</span>
                    {activeId === t.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.builtin ? 'Built-in' : 'Custom'}
                  </p>
                </button>
                {!t.builtin && (
                  <button
                    onClick={() => deleteTheme(t.id)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Input
              placeholder="Name your current theme..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button onClick={saveCurrent} className="gap-2">
              <Save className="h-4 w-4" /> Save current
            </Button>
            <Button variant="outline" onClick={resetDefaults}>Reset</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
