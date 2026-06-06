import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Target, PieChart as PieIcon,
  Download, FileText, Plus, Trash2, Sparkles, AlertTriangle, Award,
} from "lucide-react";
import { useCrops } from "@/hooks/useCrops";
import { useLivestock } from "@/hooks/useLivestock";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { formatKES } from "@/lib/currency";
import {
  buildProjects, computeProjectMetrics, distribute, equalSplit,
  DEFAULT_BUCKETS, type DistributionBucket, type Scenario,
} from "@/lib/profit-analytics";
import { exportProfitDistributionPDF, exportProjectsCSV } from "@/lib/profit-distribution-export";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["hsl(var(--primary))", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899", "#84cc16", "#f97316", "#6366f1"];

export default function ProfitDistribution() {
  const { crops } = useCrops();
  const { livestock } = useLivestock();
  const { sales } = useSales();
  const { purchases } = usePurchases();
  const { toast } = useToast();

  const projects = useMemo(
    () => buildProjects(crops, livestock, sales, purchases).map(computeProjectMetrics),
    [crops, livestock, sales, purchases]
  );

  const totals = useMemo(() => {
    const totalRevenue = sales.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const totalExpenses = purchases.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roi = totalExpenses > 0 ? (totalProfit / totalExpenses) * 100 : 0;
    const profitable = projects.filter((p) => p.profit > 0);
    const losing = projects.filter((p) => p.profit < 0);
    const topCrop = [...projects.filter((p) => p.kind === "crop")].sort((a, b) => b.profit - a.profit)[0];
    const topLivestock = [...projects.filter((p) => p.kind === "livestock")].sort((a, b) => b.profit - a.profit)[0];
    const topRevenue = [...projects].sort((a, b) => b.revenue - a.revenue)[0];
    const avgRoi = projects.length ? projects.reduce((s, p) => s + p.roi, 0) / projects.length : 0;
    return { totalRevenue, totalExpenses, totalProfit, margin, roi, profitable, losing, topCrop, topLivestock, topRevenue, avgRoi };
  }, [sales, purchases, projects]);

  // Distribution model state
  const [buckets, setBuckets] = useState<DistributionBucket[]>(DEFAULT_BUCKETS);
  const [mode, setMode] = useState<"percent" | "equal">("percent");
  const [equalParts, setEqualParts] = useState(4);

  const onEqualChange = (n: number) => {
    setEqualParts(n);
    setBuckets(equalSplit(n));
  };

  const updateBucket = (i: number, patch: Partial<DistributionBucket>) => {
    setBuckets((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };
  const addBucket = () =>
    setBuckets((b) => [...b, { key: `b_${Date.now()}`, label: `Bucket ${b.length + 1}`, percent: 0 }]);
  const removeBucket = (i: number) => setBuckets((b) => b.filter((_, idx) => idx !== i));

  const totalPct = buckets.reduce((s, b) => s + (Number(b.percent) || 0), 0);
  const dist = distribute(totals.totalProfit, buckets);

  // Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: "default", name: "Balanced (25/25/25/25)", buckets: DEFAULT_BUCKETS },
    { id: "reinvest", name: "Reinvestment Heavy", buckets: [
      { key: "loan", label: "Loan Repayment", percent: 10 },
      { key: "salary", label: "Salary", percent: 20 },
      { key: "consultation", label: "Consultation", percent: 10 },
      { key: "reinvestment", label: "Farm Reinvestment", percent: 60 },
    ]},
    { id: "debt", name: "Debt Priority", buckets: [
      { key: "loan", label: "Loan Repayment", percent: 50 },
      { key: "salary", label: "Salary", percent: 20 },
      { key: "consultation", label: "Consultation", percent: 10 },
      { key: "reinvestment", label: "Farm Reinvestment", percent: 20 },
    ]},
  ]);
  const saveCurrentAsScenario = () => {
    const name = window.prompt("Name this scenario", `Scenario ${scenarios.length + 1}`);
    if (!name) return;
    setScenarios((s) => [...s, { id: `s_${Date.now()}`, name, buckets: [...buckets] }]);
    toast({ title: "Scenario saved", description: `Saved "${name}" for comparison.` });
  };

  // Forecasting
  const [forecastRevenue, setForecastRevenue] = useState<number>(0);
  const [forecastExpenses, setForecastExpenses] = useState<number>(0);
  const forecastProfit = forecastRevenue - forecastExpenses;
  const forecastDist = distribute(forecastProfit, buckets);

  // Monthly profit trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; expenses: number; profit: number }>();
    sales.forEach((s: any) => {
      const k = (s.sale_date || "").slice(0, 7);
      if (!k) return;
      const e = map.get(k) || { month: k, revenue: 0, expenses: 0, profit: 0 };
      e.revenue += Number(s.total_amount) || 0;
      map.set(k, e);
    });
    purchases.forEach((p: any) => {
      const k = (p.purchase_date || "").slice(0, 7);
      if (!k) return;
      const e = map.get(k) || { month: k, revenue: 0, expenses: 0, profit: 0 };
      e.expenses += Number(p.total_cost) || 0;
      map.set(k, e);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ ...m, profit: m.revenue - m.expenses }));
  }, [sales, purchases]);

  const breakEven = totals.totalRevenue >= totals.totalExpenses && totals.totalRevenue > 0;

  const handleExportPDF = async () => {
    try {
      await exportProfitDistributionPDF({
        projects, totalRevenue: totals.totalRevenue, totalExpenses: totals.totalExpenses,
        totalProfit: totals.totalProfit, buckets, scenarios,
      });
      toast({ title: "PDF exported", description: "Profit distribution report downloaded." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export failed", description: e.message });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <PieIcon className="h-7 w-7 text-primary" />
              Profit Distribution Analytics
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              What-if projections, forecasting & decision support — analytics only, never modifies records.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportProjectsCSV(projects)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-1" /> Export PDF
            </Button>
          </div>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Analytics-only module</AlertTitle>
          <AlertDescription>
            All figures here are projections. Nothing on this page changes finance, wallet, crop, livestock, expense, revenue, loan, salary or consultation records.
          </AlertDescription>
        </Alert>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Revenue" value={formatKES(totals.totalRevenue)} icon={<DollarSign className="h-4 w-4" />} tone="success" />
          <KpiCard label="Total Expenses" value={formatKES(totals.totalExpenses)} icon={<TrendingDown className="h-4 w-4" />} tone="danger" />
          <KpiCard label="Net Profit" value={formatKES(totals.totalProfit)} icon={<TrendingUp className="h-4 w-4" />} tone={totals.totalProfit >= 0 ? "success" : "danger"} />
          <KpiCard label="Avg ROI" value={`${totals.avgRoi.toFixed(1)}%`} icon={<Target className="h-4 w-4" />} />
          <KpiCard label="Profit Margin" value={`${totals.margin.toFixed(1)}%`} />
          <KpiCard label="Top Crop" value={totals.topCrop?.name || "—"} sub={totals.topCrop ? formatKES(totals.topCrop.profit) : ""} />
          <KpiCard label="Top Livestock" value={totals.topLivestock?.name || "—"} sub={totals.topLivestock ? formatKES(totals.topLivestock.profit) : ""} />
          <KpiCard label="Loss-Making" value={String(totals.losing.length)} icon={<AlertTriangle className="h-4 w-4" />} tone={totals.losing.length ? "danger" : "muted"} />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="forecast">Forecasting</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Revenue vs Expenses (Monthly)</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v: any) => formatKES(Number(v))} />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Profit Trend</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v: any) => formatKES(Number(v))} />
                      <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Distribution Breakdown</CardTitle></CardHeader>
                <CardContent className="h-72">
                  {breakEven ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dist} dataKey="amount" nameKey="label" outerRadius={90} label={(e: any) => `${e.label}: ${e.percent.toFixed(0)}%`}>
                          {dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatKES(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                      <div>
                        <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
                        <p className="font-semibold">Break-even not reached</p>
                        <p className="text-sm">No distribution available.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Top Performing Projects</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...projects].sort((a, b) => b.profit - a.profit).slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" fontSize={11} />
                      <YAxis dataKey="name" type="category" fontSize={10} width={110} />
                      <Tooltip formatter={(v: any) => formatKES(Number(v))} />
                      <Bar dataKey="profit" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DISTRIBUTION */}
          <TabsContent value="distribution" className="space-y-4">
            {!breakEven && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Not Yet Profitable — Break-Even Not Reached</AlertTitle>
                <AlertDescription>
                  Revenue ({formatKES(totals.totalRevenue)}) must exceed Expenses ({formatKES(totals.totalExpenses)}) before any distribution can be projected.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Distribution Model</CardTitle>
                <CardDescription>Adjust how the projected net profit would be allocated.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label>Mode</Label>
                    <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Custom Percentages</SelectItem>
                        <SelectItem value="equal">Equal Split</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {mode === "equal" && (
                    <div>
                      <Label>Parts</Label>
                      <Select value={String(equalParts)} onValueChange={(v) => onEqualChange(Number(v))}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {mode === "percent" && (
                    <Button variant="outline" onClick={addBucket}><Plus className="h-4 w-4 mr-1" /> Add Bucket</Button>
                  )}
                  <Button variant="outline" onClick={saveCurrentAsScenario}>Save as Scenario</Button>
                  <Badge variant={Math.abs(totalPct - 100) < 0.1 ? "default" : "destructive"}>
                    Total: {totalPct.toFixed(1)}%
                  </Badge>
                </div>

                <div className="space-y-3">
                  {buckets.map((b, i) => (
                    <div key={b.key} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-card">
                      <Input
                        className="col-span-12 md:col-span-3"
                        value={b.label}
                        onChange={(e) => updateBucket(i, { label: e.target.value })}
                      />
                      <div className="col-span-8 md:col-span-5">
                        <Slider value={[b.percent]} max={100} step={0.5} onValueChange={(v) => updateBucket(i, { percent: v[0] })} />
                      </div>
                      <Input
                        type="number"
                        className="col-span-2 md:col-span-1"
                        value={b.percent}
                        onChange={(e) => updateBucket(i, { percent: Number(e.target.value) })}
                      />
                      <div className="col-span-2 md:col-span-2 text-right text-sm font-semibold">
                        {formatKES(breakEven ? (totals.totalProfit * b.percent) / Math.max(totalPct, 1) : 0)}
                      </div>
                      <Button
                        variant="ghost" size="icon" className="col-span-12 md:col-span-1 ml-auto"
                        onClick={() => removeBucket(i)}
                      ><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {breakEven && (
              <Card>
                <CardHeader><CardTitle>Projected Allocation</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Bucket</TableHead><TableHead>%</TableHead><TableHead className="text-right">Projected Amount</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {dist.map((b) => (
                        <TableRow key={b.key}>
                          <TableCell className="font-medium">{b.label}</TableCell>
                          <TableCell>{b.percent.toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-semibold">{formatKES(b.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SCENARIOS */}
          <TabsContent value="scenarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Comparison</CardTitle>
                <CardDescription>Side-by-side projection of each scenario at the current profit of {formatKES(totals.totalProfit)}.</CardDescription>
              </CardHeader>
              <CardContent>
                {!breakEven ? (
                  <p className="text-muted-foreground text-sm">Break-even not reached — comparisons unavailable.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bucket</TableHead>
                          {scenarios.map((s) => (
                            <TableHead key={s.id} className="text-right">
                              {s.name}
                              <Button size="icon" variant="ghost" className="ml-1 h-6 w-6"
                                onClick={() => setScenarios((sc) => sc.filter((x) => x.id !== s.id))}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(new Set(scenarios.flatMap((s) => s.buckets.map((b) => b.label)))).map((label) => (
                          <TableRow key={label}>
                            <TableCell className="font-medium">{label}</TableCell>
                            {scenarios.map((s) => {
                              const b = s.buckets.find((x) => x.label === label);
                              if (!b) return <TableCell key={s.id} className="text-right text-muted-foreground">—</TableCell>;
                              const d = distribute(totals.totalProfit, s.buckets).find((x) => x.label === label);
                              return (
                                <TableCell key={s.id} className="text-right">
                                  <div className="font-semibold">{formatKES(d?.amount || 0)}</div>
                                  <div className="text-xs text-muted-foreground">{b.percent.toFixed(1)}%</div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROJECTS */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Per-Project Analytics</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No projects yet. Add crops or livestock to see analytics.
                      </TableCell></TableRow>
                    )}
                    {projects.map((p) => (
                      <TableRow key={`${p.kind}-${p.id}`}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.meta && <div className="text-xs text-muted-foreground">{p.meta}</div>}
                        </TableCell>
                        <TableCell><Badge variant="outline">{p.kind}</Badge></TableCell>
                        <TableCell className="text-right">{formatKES(p.revenue)}</TableCell>
                        <TableCell className="text-right">{formatKES(p.expenses)}</TableCell>
                        <TableCell className={`text-right font-semibold ${p.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {formatKES(p.profit)}
                        </TableCell>
                        <TableCell className="text-right">{p.margin.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{p.roi.toFixed(1)}%</TableCell>
                        <TableCell>
                          {p.breakEven ? (
                            <Badge className="bg-green-600"><Award className="h-3 w-3 mr-1" /> Profitable</Badge>
                          ) : (
                            <Badge variant="destructive">Below Break-Even</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FORECAST */}
          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>What-If Forecast</CardTitle>
                <CardDescription>Enter projected revenue & expenses to forecast profit and allocations. Nothing is saved.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Projected Revenue (KES)</Label>
                    <Input type="number" value={forecastRevenue || ""} onChange={(e) => setForecastRevenue(Number(e.target.value))} placeholder="e.g. 400000" />
                  </div>
                  <div>
                    <Label>Projected Expenses (KES)</Label>
                    <Input type="number" value={forecastExpenses || ""} onChange={(e) => setForecastExpenses(Number(e.target.value))} placeholder="e.g. 150000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Forecast Profit" value={formatKES(forecastProfit)} tone={forecastProfit >= 0 ? "success" : "danger"} />
                  <KpiCard label="Forecast Margin" value={forecastRevenue > 0 ? `${((forecastProfit / forecastRevenue) * 100).toFixed(1)}%` : "—"} />
                  <KpiCard label="Forecast ROI" value={forecastExpenses > 0 ? `${((forecastProfit / forecastExpenses) * 100).toFixed(1)}%` : "—"} />
                  <KpiCard label="Break-Even" value={forecastProfit >= 0 ? "Yes" : "No"} tone={forecastProfit >= 0 ? "success" : "danger"} />
                </div>

                {forecastProfit > 0 ? (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Bucket</TableHead><TableHead>%</TableHead><TableHead className="text-right">Projected Amount</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {forecastDist.map((b) => (
                        <TableRow key={b.key}>
                          <TableCell>{b.label}</TableCell>
                          <TableCell>{b.percent.toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-semibold">{formatKES(b.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Enter values where revenue exceeds expenses to see a forecast distribution.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function KpiCard({ label, value, sub, icon, tone }: {
  label: string; value: string; sub?: string; icon?: React.ReactNode;
  tone?: "success" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success" ? "text-green-600" :
    tone === "danger" ? "text-destructive" :
    tone === "muted" ? "text-muted-foreground" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>{icon}
        </div>
        <div className={`text-lg md:text-xl font-bold mt-1 truncate ${toneClass}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}
