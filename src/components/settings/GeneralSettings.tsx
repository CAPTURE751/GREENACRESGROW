import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Upload, Image, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmSettings';
import { useToast } from '@/hooks/use-toast';

export function GeneralSettings() {
  const { hasRole } = useAuth();
  const { settings, isLoading, updateSettings, uploadLogo } = useFarmSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = hasRole('admin');

  const [farmName, setFarmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [location, setLocation] = useState('');
  const [slogan, setSlogan] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFarmName(settings.farm_name);
      setOwnerName(settings.owner_name);
      setLocation(settings.location);
      setSlogan(settings.slogan);
      setLogoPreview(settings.logo_url);
    }
  }, [settings]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Logo must be under 2MB.' });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      let logoUrl = settings?.logo_url ?? null;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      await updateSettings.mutateAsync({
        farm_name: farmName,
        owner_name: ownerName,
        location,
        logo_url: logoUrl,
      });
      setLogoFile(null);
    } catch {
      // error handled by hook
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>General Settings</CardTitle>
        {!isAdmin && (
          <Badge variant="outline" className="text-muted-foreground">
            <Lock className="h-3 w-3 mr-1" />
            Admin Only
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Section */}
        <div className="space-y-2">
          <Label>Farm Logo</Label>
          <p className="text-sm text-muted-foreground">This logo appears on the system header and all exported reports.</p>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/50">
              {logoPreview ? (
                <img src={logoPreview} alt="Farm logo" className="h-full w-full object-contain" />
              ) : (
                <Image className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            {isAdmin && (
              <div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="farm-name">Farm Name</Label>
            <Input
              id="farm-name"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-name">Owner Name</Label>
            <Input
              id="owner-name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
        </div>

        {isAdmin && (
          <Button onClick={handleSave} disabled={saving} className="bg-farm-green hover:bg-farm-green/90">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
