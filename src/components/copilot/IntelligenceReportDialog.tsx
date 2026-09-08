import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/contexts/FarmContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { FileBarChart, Loader2, FileDown, Sparkles, History, RefreshCw, Trash2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportAIReportToPDF, type AIReport } from "@/lib/ai-report-export";
import {
  listReportHistory, saveReportToHistory, deleteReportFromHistory, type ReportHistoryEntry,
} from "@/lib/report-history";

const PRESETS = [
  "Generate my Sunday report",
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
  const [tab, setTab] = useState("new");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);

  const refreshHistory = () => setHistory(listReportHistory(activeFarm?.id ?? null));

  useEffect(() => {
    if (open) refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeFarm?.id]);

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
    setTab("new");
    setPrompt(request);
    setLoading(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("farm-intelligence-report", {
        body: { prompt: request, farmId: activeFarm.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const generated = (data as any).report as AIReport;
      setReport(generated);
      saveReportToHistory(generated, request, activeFarm.id);
      refreshHistory();
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

  const download = async (r?: AIReport, p?: string) => {
    const target = r ?? report;
    if (!target) return;
    try {
      await exportAIReportToPDF(target, p ?? prompt);
      toast({ title: "PDF downloaded", description: "Your report has been saved." });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Could not create the PDF." });
    }
  };

  const chartCount = (r: AIReport | null) =>
    (r?.charts?.length || 0) + (r?.sections || []).reduce((n, s) => n + (s.charts?.length || 0), 0);

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
            multi-page PDF with charts, your logo and branding.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="self-start">
            <TabsTrigger value="new">New report</TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-3.5 w-3.5" /> History{history.length ? ` (${history.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="flex-1 min-h-0 flex flex-col space-y-3 mt-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Generate my Sunday report"
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
                    {chartCount(report) > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <BarChart3 className="h-3.5 w-3.5" /> {chartCount(report)} charts included in the PDF
                      </p>
                    )}
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
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No reports yet. Generate one and it will be saved here.
              </p>
            ) : (
              <ScrollArea className="h-[50vh] border rounded-md">
                <div className="divide-y">
                  {history.map((h) => (
                    <div key={h.id} className="p-3 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{h.title}</span>
                          <Badge variant="secondary" className="text-[10px]">{h.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.createdAt).toLocaleString()} · {h.periodLabel}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{h.fileName}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => download(h.report, h.prompt)}>
                          <FileDown className="h-3.5 w-3.5" /> PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          disabled={loading}
                          onClick={() => generate(h.prompt)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { deleteReportFromHistory(h.id); refreshHistory(); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => generate()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {report ? "Regenerate" : "Generate report"}
          </Button>
          <Button onClick={() => download()} disabled={!report || loading} className="gap-2">
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
