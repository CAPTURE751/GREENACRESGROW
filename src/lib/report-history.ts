import type { AIReport } from "@/lib/ai-report-export";

export interface ReportHistoryEntry {
  id: string;
  createdAt: string;
  prompt: string;
  title: string;
  type: string;
  periodLabel: string;
  fileName: string;
  farmId: string | null;
  report: AIReport;
}

const KEY = "farmos_ai_report_history";
const MAX_ENTRIES = 40;

/** Rough report type from the request wording, used as the History "type" column. */
export function inferReportType(prompt: string, report?: AIReport): string {
  const t = `${prompt} ${report?.title || ""}`.toLowerCase();
  if (/(financ|revenue|profit|expense|cash)/.test(t)) return "Financial";
  if (/(crop|harvest|planting|nursery)/.test(t)) return "Crop Production";
  if (/(livestock|animal|herd|birth)/.test(t)) return "Livestock";
  if (/(inventor|input|stock)/.test(t)) return "Inventory";
  if (/(break-even|enterprise|profitab)/.test(t)) return "Profitability";
  if (/(week|sunday|monday|daily|weekly)/.test(t)) return "Weekly Summary";
  return "General";
}

export function reportFileName(report: AIReport, createdAt: string) {
  const slug = (report.title || "farm-intelligence-report")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug}-${createdAt.slice(0, 10)}.pdf`;
}

export function listReportHistory(farmId?: string | null): ReportHistoryEntry[] {
  try {
    const all: ReportHistoryEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const rows = Array.isArray(all) ? all : [];
    return farmId ? rows.filter((r) => !r.farmId || r.farmId === farmId) : rows;
  } catch {
    return [];
  }
}

export function saveReportToHistory(
  report: AIReport,
  prompt: string,
  farmId: string | null,
): ReportHistoryEntry {
  const createdAt = new Date().toISOString();
  const entry: ReportHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    prompt,
    title: report.title || "Farm Intelligence Report",
    type: inferReportType(prompt, report),
    periodLabel: report.period_label || "",
    fileName: reportFileName(report, createdAt),
    farmId,
    report,
  };
  try {
    const all = listReportHistory();
    localStorage.setItem(KEY, JSON.stringify([entry, ...all].slice(0, MAX_ENTRIES)));
  } catch { /* storage full — history is best-effort */ }
  return entry;
}

export function deleteReportFromHistory(id: string) {
  try {
    const all = listReportHistory().filter((r) => r.id !== id);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function clearReportHistory() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
