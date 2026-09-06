import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/contexts/FarmContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { FileBarChart, Loader2, FileDown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportAIReportToPDF, type AIReport } from "@/lib/ai-report-export";

const PRESETS = [
  "Full farm performance report for this year so far",
  "Monthly financial report with revenue, expenses and profit per month",
  "Crop production and harvest report by crop and location",
  "Livestock report: herd numbers, births, mortality and feed",
  "Inventory and input usage report with reorder list",
  "Profitability report per enterprise with break-even analysis",
];

export function IntelligenceReportDialog() {
  const { activeFarm } = useFarm();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);

  const generate = async (text?: string) => {
    const request = (text ?? prompt).trim();
    if (!request) {
      toast({ variant: "destructive", title: "Describe the report you want" });
      return;
    }
    if (!activeFarm?.id) {
      toast({ variant: "destructive", title: "Select a farm first" });
      return;
    }
    setPrompt(request);
    setLoading(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("farm-intelligence-report", {
        body: { prompt: request, farmId: activeFarm.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setReport((data as any).report as AIReport);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Report failed",
        description: e?.message || "Could not generate the report. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!report) return;
    try {
      await exportAIReportToPDF(report, prompt);
      toast({ title: "PDF downloaded", description: "Your report has been saved." });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Could not create the PDF." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <FileBarChart className="h-4 w-4" /> AI Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-farm-green" /> AI Farm Intelligence Report
          </DialogTitle>
          <DialogDescription>
            Ask for any report in plain language. It reads your live farm records and writes a professional,
            multi-page PDF you can print or share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. Give me a full performance report for the last 6 months with profit per crop"
          />
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Badge
                key={p}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/70 font-normal"
                onClick={() => generate(p)}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Analysing your farm records…
          </div>
        )}

        {report && !loading && (
          <ScrollArea className="flex-1 min-h-0 border rounded-md p-4">
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-base font-bold">{report.title}</h3>
                <p className="text-xs text-muted-foreground">{report.period_label}</p>
              </div>
              <p className="text-muted-foreground">{report.executive_summary}</p>

              {!!report.kpis?.length && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {report.kpis.map((k, i) => (
                    <div key={i} className="rounded-md border p-2">
                      <p className="text-[11px] text-muted-foreground">{k.label}</p>
                      <p className="font-semibold">{k.value}</p>
                      {k.note && <p className="text-[10px] text-muted-foreground">{k.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              {report.sections?.map((s, i) => (
                <div key={i} className="space-y-1">
                  <h4 className="font-semibold">{s.heading}</h4>
                  <p className="text-muted-foreground">{s.narrative}</p>
                  {!!s.bullets?.length && (
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                      {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )}
                  {s.table?.rows?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border mt-1">
                        <thead className="bg-muted">
                          <tr>{s.table.columns.map((c, j) => <th key={j} className="text-left p-1.5 border">{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {s.table.rows.map((r, j) => (
                            <tr key={j}>{r.map((cell, k) => <td key={k} className="p-1.5 border">{cell}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ))}

              {!!report.recommendations?.length && (
                <div>
                  <h4 className="font-semibold">Actionable Recommendations</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {!!report.risks?.length && (
                <div>
                  <h4 className="font-semibold">Risks &amp; Watch Points</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {report.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => generate()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {report ? "Regenerate" : "Generate report"}
          </Button>
          <Button onClick={download} disabled={!report || loading} className="gap-2">
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
