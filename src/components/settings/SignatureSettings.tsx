import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, Trash2, PenLine, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getSignatureSettings,
  saveSignatureSettings,
  REPORT_TYPES,
  type SignatureSettings,
} from "@/lib/signature-store";

const REPORT_LABELS: Record<string, string> = {
  inventory: "Inventory",
  calendar: "Calendar",
  "capital-injections": "Capital Injections",
  "profit-distribution": "Profit Distribution",
  notebook: "Notebook",
  venture: "Venture / Budget",
  analytics: "Analytics",
  pnl: "Profit & Loss",
  reports: "General Reports",
};

export function SignatureSettings() {
  const [s, setS] = useState<SignatureSettings>(() => getSignatureSettings());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setS(getSignatureSettings());
  }, []);

  const update = (patch: Partial<SignatureSettings>) => setS((prev) => ({ ...prev, ...patch }));

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image (PNG or JPG)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Signature must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ image: String(reader.result) });
      toast.success("Signature uploaded");
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    saveSignatureSettings(s);
    toast.success("Signature settings saved");
  };

  const clearImage = () => {
    update({ image: null });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-farm-green" />
          Signature for PDF Reports
        </CardTitle>
        <CardDescription>
          Upload a signature image to appear at the end of exported PDF reports. Configure placement
          and choose which reports include it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">Enable signature on PDFs</Label>
            <p className="text-sm text-muted-foreground">Master switch for all reports.</p>
          </div>
          <Switch checked={s.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>

        {/* Upload */}
        <div className="space-y-3">
          <Label>Signature image</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-48 items-center justify-center rounded-md border bg-muted/40">
              {s.image ? (
                <img src={s.image} alt="Signature" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No signature uploaded</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {s.image ? "Replace" : "Upload"}
              </Button>
              {s.image && (
                <Button variant="ghost" size="sm" onClick={clearImage}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use a transparent PNG for best results. Max 2 MB.
          </p>
        </div>

        {/* Signer details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signer-name">Signer name (optional)</Label>
            <Input
              id="signer-name"
              value={s.signerName}
              onChange={(e) => update({ signerName: e.target.value })}
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signer-title">Signer title (optional)</Label>
            <Input
              id="signer-title"
              value={s.signerTitle}
              onChange={(e) => update({ signerTitle: e.target.value })}
              placeholder="e.g. Farm Manager"
            />
          </div>
        </div>

        <Separator />

        {/* Placement */}
        <div className="space-y-4">
          <h4 className="font-semibold">Placement</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select value={s.align} onValueChange={(v: any) => update({ align: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Height: {s.heightMm} mm</Label>
              <Slider
                min={8} max={40} step={1}
                value={[s.heightMm]}
                onValueChange={([v]) => update({ heightMm: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bottom margin: {s.marginBottomMm} mm</Label>
              <Slider
                min={20} max={60} step={1}
                value={[s.marginBottomMm]}
                onValueChange={([v]) => update({ marginBottomMm: v })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Per-report toggles */}
        <div className="space-y-3">
          <h4 className="font-semibold">Per-report visibility</h4>
          <p className="text-sm text-muted-foreground">
            Disable individual report types where you don't want the signature to appear.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {REPORT_TYPES.map((rt) => (
              <div key={rt} className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor={`rt-${rt}`}>{REPORT_LABELS[rt] || rt}</Label>
                <Switch
                  id={`rt-${rt}`}
                  checked={s.perReport[rt] !== false}
                  onCheckedChange={(v) =>
                    update({ perReport: { ...s.perReport, [rt]: v } })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} className="bg-farm-green hover:bg-farm-green/90">
            <Save className="h-4 w-4 mr-2" />
            Save Signature Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
