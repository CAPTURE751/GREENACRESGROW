import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  label: string;
  onExport: () => Promise<void>;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  disabled?: boolean;
}

/** Download button for the branded module PDF reports (with charts). */
export function ModuleReportButton({ label, onExport, variant = "outline", size = "sm", disabled }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
          toast.success(`${label} downloaded`);
        } catch (e) {
          console.error(e);
          toast.error(`Failed to generate ${label.toLowerCase()}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
      {label}
    </Button>
  );
}
