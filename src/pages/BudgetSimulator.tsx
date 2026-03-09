import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatKES } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportVenturePDF } from "@/lib/venture-export";
import { useVentureBudgets } from "@/hooks/useVentureBudgets";
import { ventureTemplates, getMonthLabels, type VentureTemplate } from "@/lib/venture-templates";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calculator, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle,
  Download, Sparkles, Loader2, BarChart3, Target, Save, FolderOpen, Trash2,
  FileText, GitCompare, ArrowRight, LayoutTemplate,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";

interface VentureInputs {
  name: string;
  type: string;
  farmSize: number;
  seasonDuration: string;
  ploughingCost: number;
  harrowingCost: number;
  seedType: string;
  seedQuantity: number;
  seedCostPerUnit: number;
  basalFertilizer: number;
  topDressingFertilizer: number;
  herbicides: number;
  pesticides: number;
  fungicides: number;
  plantingLabour: number;
  weedingLabour: number;
  harvestingLabour: number;
  waterCost: number;
  pumpFuel: number;
  transport: number;
  packaging: number;
  storage: number;
  expectedYieldPerAcre: number;
  yieldUnit: string;
  marketPricePerUnit: number;
}

const defaultInputs: VentureInputs = {
  name: "", type: "maize", farmSize: 1, seasonDuration: "3 months",
  ploughingCost: 0, harrowingCost: 0, seedType: "", seedQuantity: 0, seedCostPerUnit: 0,
  basalFertilizer: 0, topDressingFertilizer: 0, herbicides: 0, pesticides: 0, fungicides: 0,
  plantingLabour: 0, weedingLabour: 0, harvestingLabour: 0, waterCost: 0, pumpFuel: 0,
  transport: 0, packaging: 0, storage: 0, expectedYieldPerAcre: 0, yieldUnit: "bags",
  marketPricePerUnit: 0,
};

const ventureTypes = [
  { value: "maize", label: "Maize Farming" },
  { value: "beans", label: "Beans Farming" },
  { value: "onions", label: "Onion Farming" },
  { value: "dairy", label: "Dairy Farming" },
  { value: "poultry", label: "Poultry Farming" },
  { value: "greenhouse", label: "Greenhouse Farming" },
  { value: "vegetables", label: "Vegetable Farming" },
  { value: "fruit", label: "Fruit Farming" },
];

function calcCosts(inputs: VentureInputs) {
  const landPrep = inputs.ploughingCost + inputs.harrowingCost;
  const seeds = inputs.seedQuantity * inputs.seedCostPerUnit;
  const fertilizer = inputs.basalFertilizer + inputs.topDressingFertilizer;
  const chemicals = inputs.herbicides + inputs.pesticides + inputs.fungicides;
  const labour = inputs.plantingLabour + inputs.weedingLabour + inputs.harvestingLabour;
  const irrigation = inputs.waterCost + inputs.pumpFuel;
  const other = inputs.transport + inputs.packaging + inputs.storage;
  const total = landPrep + seeds + fertilizer + chemicals + labour + irrigation + other;
  return { landPrep, seeds, fertilizer, chemicals, labour, irrigation, other, total };
}

function calcRevenue(inputs: VentureInputs, costs: ReturnType<typeof calcCosts>) {
  const totalProduction = inputs.expectedYieldPerAcre * inputs.farmSize;
  const totalRevenue = totalProduction * inputs.marketPricePerUnit;
  const profit = totalRevenue - costs.total;
  const profitPerAcre = inputs.farmSize > 0 ? profit / inputs.farmSize : 0;
  const breakEvenPrice = totalProduction > 0 ? costs.total / totalProduction : 0;
  return { totalProduction, totalRevenue, profit, profitPerAcre, breakEvenPrice };
}

export default function BudgetSimulator() {
  const [inputs, setInputs] = useState<VentureInputs>(defaultInputs);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { budgets, loading: budgetsLoading, save, saving, remove } = useVentureBudgets();

  const set = (field: keyof VentureInputs, value: string | number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };
  const numSet = (field: keyof VentureInputs, raw: string) => {
    set(field, parseFloat(raw) || 0);
  };

  const costs = useMemo(() => calcCosts(inputs), [inputs]);
  const revenue = useMemo(() => calcRevenue(inputs, costs), [inputs, costs]);

  const sensitivity = useMemo(() => {
    const prod = inputs.expectedYieldPerAcre * inputs.farmSize;
    const scenarios = [
      { scenario: "Low Yield (60%)", yield: Math.round(prod * 0.6), profit: Math.round(prod * 0.6) * inputs.marketPricePerUnit - costs.total },
      { scenario: "Average Yield", yield: prod, profit: revenue.profit },
      { scenario: "High Yield (130%)", yield: Math.round(prod * 1.3), profit: Math.round(prod * 1.3) * inputs.marketPricePerUnit - costs.total },
    ];
    const priceScenarios = [
      { scenario: "Worst Price (70%)", price: inputs.marketPricePerUnit * 0.7, profit: prod * (inputs.marketPricePerUnit * 0.7) - costs.total },
      { scenario: "Expected Price", price: inputs.marketPricePerUnit, profit: revenue.profit },
      { scenario: "Best Price (140%)", price: inputs.marketPricePerUnit * 1.4, profit: prod * (inputs.marketPricePerUnit * 1.4) - costs.total },
    ];
    return { scenarios, priceScenarios };
  }, [inputs, costs, revenue]);

  // Cash flow projection
  const cashFlow = useMemo(() => {
    const template = ventureTemplates[inputs.type];
    const numMonths = template?.cashFlowMonths || 4;
    const dist = template?.costDistribution || Array(numMonths).fill(100 / numMonths);
    const revMonth = template?.revenueMonth ?? numMonths - 1;
    const months = getMonthLabels(numMonths);

    let cumCost = 0;
    let cumRev = 0;
    return months.map((label, i) => {
      const monthlyCost = costs.total * ((dist[i] || 0) / 100);
      const monthlyRev = revMonth === -1
        ? revenue.totalRevenue / numMonths // monthly revenue (dairy)
        : i === revMonth ? revenue.totalRevenue : 0;
      cumCost += monthlyCost;
      cumRev += monthlyRev;
      return {
        month: label,
        cost: Math.round(monthlyCost),
        revenue: Math.round(monthlyRev),
        cumCost: Math.round(cumCost),
        cumRev: Math.round(cumRev),
        cashPosition: Math.round(cumRev - cumCost),
      };
    });
  }, [inputs.type, costs.total, revenue.totalRevenue]);

  const costChartData = [
    { name: "Land Prep", value: costs.landPrep },
    { name: "Seeds", value: costs.seeds },
    { name: "Fertilizer", value: costs.fertilizer },
    { name: "Chemicals", value: costs.chemicals },
    { name: "Labour", value: costs.labour },
    { name: "Irrigation", value: costs.irrigation },
    { name: "Other", value: costs.other },
  ].filter((d) => d.value > 0);

  const chartColors = [
    "hsl(84 31% 44%)", "hsl(43 74% 66%)", "hsl(31 45% 58%)",
    "hsl(23 47% 42%)", "hsl(160 40% 45%)", "hsl(200 50% 50%)", "hsl(280 30% 55%)",
  ];

  const recommendation = revenue.profit > 0
    ? { type: "profit", icon: CheckCircle2, color: "text-green-600", badge: "bg-green-100 text-green-800", title: "✅ Recommended Venture", msg: `Projected profit: ${formatKES(revenue.profit)}. This venture appears profitable. Proceed with production.` }
    : revenue.profit === 0
    ? { type: "breakeven", icon: AlertTriangle, color: "text-yellow-600", badge: "bg-yellow-100 text-yellow-800", title: "⚠️ Break-Even", msg: "The venture breaks even. Profitability depends on market price." }
    : { type: "loss", icon: XCircle, color: "text-red-600", badge: "bg-red-100 text-red-800", title: "❌ Not Recommended", msg: `Projected loss: ${formatKES(Math.abs(revenue.profit))}. Consider adjusting costs or increasing yield.` };

  const getAiAdvice = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const { data, error } = await supabase.functions.invoke("venture-ai-advisor", {
        body: {
          venture: inputs.name || ventureTypes.find((v) => v.value === inputs.type)?.label || inputs.type,
          type: inputs.type, farmSize: inputs.farmSize, totalCost: costs.total,
          totalRevenue: revenue.totalRevenue, profit: revenue.profit,
          profitPerAcre: revenue.profitPerAcre, breakEvenPrice: revenue.breakEvenPrice,
          yieldPerAcre: inputs.expectedYieldPerAcre, marketPrice: inputs.marketPricePerUnit,
        },
      });
      if (error) throw error;
      setAiAdvice(data?.advice || "No advice available.");
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Advisor Error", description: e.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await exportVenturePDF(inputs, costs, revenue, sensitivity, recommendation, aiAdvice);
      toast({ title: "PDF Downloaded" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "PDF Error", description: e.message });
    }
  };

  const handleSave = async () => {
    const budgetName = inputs.name || ventureTypes.find(v => v.value === inputs.type)?.label || inputs.type;
    await save({
      id: activeBudgetId || undefined,
      name: budgetName,
      venture_type: inputs.type,
      inputs,
      costs_total: costs.total,
      revenue_total: revenue.totalRevenue,
      profit: revenue.profit,
      ai_advice: aiAdvice,
    });
  };

  const handleLoad = (budget: any) => {
    setInputs(budget.inputs);
    setActiveBudgetId(budget.id);
    setAiAdvice(budget.ai_advice);
    setSavedDialogOpen(false);
    toast({ title: "Budget loaded", description: budget.name });
  };

  const handleApplyTemplate = (key: string) => {
    const t = ventureTemplates[key];
    if (!t) return;
    setInputs({
      ...defaultInputs,
      name: t.name,
      type: t.type,
      farmSize: 1,
      seasonDuration: t.seasonDuration,
      seedType: t.seedType,
      yieldUnit: t.yieldUnit,
      ploughingCost: t.ploughingCost,
      harrowingCost: t.harrowingCost,
      seedQuantity: t.seedQuantity,
      seedCostPerUnit: t.seedCostPerUnit,
      basalFertilizer: t.basalFertilizer,
      topDressingFertilizer: t.topDressingFertilizer,
      herbicides: t.herbicides,
      pesticides: t.pesticides,
      fungicides: t.fungicides,
      plantingLabour: t.plantingLabour,
      weedingLabour: t.weedingLabour,
      harvestingLabour: t.harvestingLabour,
      waterCost: t.waterCost,
      pumpFuel: t.pumpFuel,
      transport: t.transport,
      packaging: t.packaging,
      storage: t.storage,
      expectedYieldPerAcre: t.expectedYieldPerAcre,
      marketPricePerUnit: t.marketPricePerUnit,
    });
    setActiveBudgetId(null);
    setAiAdvice(null);
    setTemplateDialogOpen(false);
    toast({ title: "Template applied", description: t.name });
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const compareData = useMemo(() => {
    return budgets.filter(b => compareIds.includes(b.id)).map(b => {
      const bCosts = calcCosts(b.inputs);
      const bRev = calcRevenue(b.inputs, bCosts);
      return { name: b.name, cost: bCosts.total, revenue: bRev.totalRevenue, profit: bRev.profit, profitPerAcre: bRev.profitPerAcre, breakEven: bRev.breakEvenPrice };
    });
  }, [compareIds, budgets]);

  const hasData = costs.total > 0 || revenue.totalRevenue > 0;

  const numField = (label: string, field: keyof VentureInputs, placeholder?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={inputs[field] || ""} onChange={(e) => numSet(field, e.target.value)} placeholder={placeholder || "0"} className="h-9" />
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Farm Venture Budget Simulator</h1>
            <p className="text-muted-foreground mt-1">Simulate costs and profitability before investing</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Template Button */}
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><LayoutTemplate className="h-4 w-4 mr-1" /> Templates</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Load Venture Template</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground mb-4">Pre-filled cost estimates for common Kenyan farming ventures (per acre).</p>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {Object.entries(ventureTemplates).map(([key, t]) => {
                    const c = calcCosts({ ...defaultInputs, ...t, farmSize: 1 } as any);
                    const r = calcRevenue({ ...defaultInputs, ...t, farmSize: 1 } as any, c);
                    return (
                      <button key={key} onClick={() => handleApplyTemplate(key)} className="w-full p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 text-left transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.seasonDuration} • {t.yieldUnit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Est. Profit/Acre</p>
                            <p className={`text-sm font-bold ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatKES(r.profit)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>

            {/* Saved Budgets */}
            <Dialog open={savedDialogOpen} onOpenChange={setSavedDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FolderOpen className="h-4 w-4 mr-1" /> Saved ({budgets.length})</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Saved Budgets</DialogTitle></DialogHeader>
                {budgets.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No saved budgets yet. Fill in a budget and click Save.</p>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {budgets.map((b) => (
                      <div key={b.id} className="flex justify-between items-center p-3 rounded-lg border">
                        <button onClick={() => handleLoad(b)} className="text-left flex-1">
                          <p className="font-medium text-sm">{b.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Profit: <span className={b.profit >= 0 ? "text-green-600" : "text-red-600"}>{formatKES(b.profit)}</span>
                            {" • "}{new Date(b.updated_at).toLocaleDateString()}
                          </p>
                        </button>
                        <Button variant="ghost" size="icon" onClick={() => remove(b.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Compare */}
            <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={budgets.length < 2}><GitCompare className="h-4 w-4 mr-1" /> Compare</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Compare Ventures</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground mb-3">Select 2–4 saved budgets to compare side by side.</p>
                <div className="space-y-2 mb-4">
                  {budgets.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-accent/50">
                      <Checkbox checked={compareIds.includes(b.id)} onCheckedChange={() => toggleCompare(b.id)} />
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className={`ml-auto text-sm font-bold ${b.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatKES(b.profit)}</span>
                    </label>
                  ))}
                </div>
                {compareData.length >= 2 && (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={compareData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatKES(v)} />
                        <Legend />
                        <Bar dataKey="cost" name="Total Cost" fill="hsl(0 65% 50%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revenue" name="Revenue" fill="hsl(200 50% 50%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="Profit" fill="hsl(84 31% 44%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Metric</th>
                            {compareData.map((d, i) => <th key={i} className="text-right p-2">{d.name}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: "Total Cost", key: "cost" },
                            { label: "Revenue", key: "revenue" },
                            { label: "Profit", key: "profit" },
                            { label: "Profit/Acre", key: "profitPerAcre" },
                            { label: "Break-Even", key: "breakEven" },
                          ].map((row) => (
                            <tr key={row.key} className="border-b">
                              <td className="p-2 font-medium">{row.label}</td>
                              {compareData.map((d, i) => (
                                <td key={i} className={`p-2 text-right ${row.key === "profit" ? ((d as any)[row.key] >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold") : ""}`}>
                                  {formatKES((d as any)[row.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !hasData}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : activeBudgetId ? "Update" : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={getAiAdvice} disabled={aiLoading || !hasData}>
              {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              AI Advisor
            </Button>
            <Button className="bg-primary hover:bg-primary/90" size="sm" onClick={handleDownloadPDF} disabled={!hasData}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        <Tabs defaultValue="inputs" className="space-y-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="inputs"><Calculator className="h-4 w-4 mr-1" /> Inputs</TabsTrigger>
            <TabsTrigger value="results" disabled={!hasData}><BarChart3 className="h-4 w-4 mr-1" /> Results</TabsTrigger>
            <TabsTrigger value="cashflow" disabled={!hasData}><TrendingUp className="h-4 w-4 mr-1" /> Cash Flow</TabsTrigger>
            <TabsTrigger value="sensitivity" disabled={!hasData}><Target className="h-4 w-4 mr-1" /> Scenarios</TabsTrigger>
          </TabsList>

          {/* ========== INPUTS TAB ========== */}
          <TabsContent value="inputs" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Basic Venture Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Venture Name</Label>
                  <Input value={inputs.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rosecoco Beans" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Crop / Livestock Type</Label>
                  <Select value={inputs.type} onValueChange={(v) => set("type", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ventureTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {numField("Farm Size (Acres / Units)", "farmSize")}
                <div className="space-y-1">
                  <Label className="text-xs">Season Duration</Label>
                  <Input value={inputs.seasonDuration} onChange={(e) => set("seasonDuration", e.target.value)} placeholder="e.g. 3 months" className="h-9" />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Land Preparation</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {numField("Ploughing Cost", "ploughingCost")}
                  {numField("Harrowing Cost", "harrowingCost")}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Seeds / Planting Materials</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Seed Type</Label>
                    <Input value={inputs.seedType} onChange={(e) => set("seedType", e.target.value)} placeholder="e.g. H614" className="h-9" />
                  </div>
                  {numField("Seed Quantity", "seedQuantity")}
                  {numField("Cost per Unit", "seedCostPerUnit")}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Fertilizer</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {numField("Basal Fertilizer", "basalFertilizer")}
                  {numField("Top Dressing", "topDressingFertilizer")}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Chemicals</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  {numField("Herbicides", "herbicides")}
                  {numField("Pesticides", "pesticides")}
                  {numField("Fungicides", "fungicides")}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Labour</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  {numField("Planting Labour", "plantingLabour")}
                  {numField("Weeding Labour", "weedingLabour")}
                  {numField("Harvesting Labour", "harvestingLabour")}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Irrigation</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {numField("Water Cost", "waterCost")}
                  {numField("Pump Fuel / Electricity", "pumpFuel")}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Other Costs</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  {numField("Transport", "transport")}
                  {numField("Packaging", "packaging")}
                  {numField("Storage", "storage")}
                </CardContent>
              </Card>
              <Card className="border-primary/30">
                <CardHeader><CardTitle className="text-base">Expected Revenue</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  {numField("Yield per Acre", "expectedYieldPerAcre")}
                  <div className="space-y-1">
                    <Label className="text-xs">Yield Unit</Label>
                    <Input value={inputs.yieldUnit} onChange={(e) => set("yieldUnit", e.target.value)} placeholder="bags" className="h-9" />
                  </div>
                  {numField("Market Price per Unit", "marketPricePerUnit")}
                </CardContent>
              </Card>
            </div>

            {hasData && (
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    <div><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-lg font-bold">{formatKES(costs.total)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold">{formatKES(revenue.totalRevenue)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Profit</p><p className={`text-lg font-bold ${revenue.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatKES(revenue.profit)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Profit/Acre</p><p className="text-lg font-bold">{formatKES(revenue.profitPerAcre)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Break-Even Price</p><p className="text-lg font-bold">{formatKES(revenue.breakEvenPrice)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Production</p><p className="text-lg font-bold">{revenue.totalProduction} {inputs.yieldUnit}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== RESULTS TAB ========== */}
          <TabsContent value="results" className="space-y-6">
            <Card className={`border-2 ${revenue.profit > 0 ? "border-green-300" : revenue.profit === 0 ? "border-yellow-300" : "border-red-300"}`}>
              <CardContent className="pt-6 flex items-start gap-4">
                <recommendation.icon className={`h-10 w-10 ${recommendation.color} flex-shrink-0`} />
                <div>
                  <h3 className="text-lg font-bold">{recommendation.title}</h3>
                  <p className="text-muted-foreground mt-1">{recommendation.msg}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Cost", value: formatKES(costs.total) },
                { label: "Expected Revenue", value: formatKES(revenue.totalRevenue) },
                { label: "Net Profit", value: formatKES(revenue.profit), highlight: true },
                { label: "Profit per Acre", value: formatKES(revenue.profitPerAcre) },
                { label: "Break-Even Price", value: formatKES(revenue.breakEvenPrice) },
                { label: "Total Production", value: `${revenue.totalProduction} ${inputs.yieldUnit}` },
              ].map((c, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className={`text-base font-bold mt-1 ${c.highlight ? (revenue.profit >= 0 ? "text-green-600" : "text-red-600") : ""}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {costChartData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Cost Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [formatKES(v), "Cost"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {costChartData.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {aiAdvice && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Crop Advisor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">{aiAdvice}</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== CASH FLOW TAB ========== */}
          <TabsContent value="cashflow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Monthly Cash Flow Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatKES(v)} />
                    <Legend />
                    <Bar dataKey="cost" name="Monthly Cost" fill="hsl(0 65% 50%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" name="Monthly Revenue" fill="hsl(84 31% 44%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cumulative Cash Position</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatKES(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="cumCost" name="Cumulative Cost" stroke="hsl(0 65% 50%)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="cumRev" name="Cumulative Revenue" stroke="hsl(84 31% 44%)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="cashPosition" name="Cash Position" stroke="hsl(200 50% 50%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cashFlow.map((m, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="font-medium text-sm mb-2">{m.month}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Cost:</span><span className="text-red-600 font-medium">{formatKES(m.cost)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Revenue:</span><span className="text-green-600 font-medium">{formatKES(m.revenue)}</span></div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-muted-foreground">Cash Position:</span>
                        <span className={`font-bold ${m.cashPosition >= 0 ? "text-green-600" : "text-red-600"}`}>{formatKES(m.cashPosition)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ========== SENSITIVITY / SCENARIOS TAB ========== */}
          <TabsContent value="sensitivity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Yield Risk Simulation</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sensitivity.scenarios.map((s, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{s.scenario}</p>
                          <p className="text-xs text-muted-foreground">Yield: {s.yield} {inputs.yieldUnit}</p>
                        </div>
                        <Badge className={s.profit >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {s.profit >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {formatKES(s.profit)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Price Sensitivity Analysis</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sensitivity.priceScenarios.map((s, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{s.scenario}</p>
                          <p className="text-xs text-muted-foreground">Price: {formatKES(s.price)}/{inputs.yieldUnit}</p>
                        </div>
                        <Badge className={s.profit >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {s.profit >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {formatKES(s.profit)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Scenario Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[...sensitivity.scenarios.map((s) => ({ name: s.scenario, profit: s.profit })), ...sensitivity.priceScenarios.map((s) => ({ name: s.scenario, profit: s.profit }))]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [formatKES(v), "Profit"]} />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {[...sensitivity.scenarios, ...sensitivity.priceScenarios].map((s, i) => (
                        <Cell key={i} fill={s.profit >= 0 ? "hsl(84 31% 44%)" : "hsl(0 65% 50%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
