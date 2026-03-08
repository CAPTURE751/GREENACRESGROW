
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
  Legend,
  ComposedChart
} from "recharts";

const productivityData = [
  { month: 'Jan', crops: 85, livestock: 92, efficiency: 78 },
  { month: 'Feb', crops: 88, livestock: 89, efficiency: 82 },
  { month: 'Mar', crops: 92, livestock: 94, efficiency: 85 },
  { month: 'Apr', crops: 96, livestock: 91, efficiency: 88 },
  { month: 'May', crops: 89, livestock: 96, efficiency: 90 },
  { month: 'Jun', crops: 94, livestock: 98, efficiency: 93 },
];

const revenueAnalysis = [
  { quarter: 'Q1', revenue: 45000, costs: 28000, profit: 17000 },
  { quarter: 'Q2', revenue: 52000, costs: 31000, profit: 21000 },
  { quarter: 'Q3', revenue: 58000, costs: 35000, profit: 23000 },
  { quarter: 'Q4', revenue: 61000, costs: 38000, profit: 23000 },
];

const cropDistribution = [
  { name: 'Wheat', value: 35, color: 'hsl(84 31% 44%)' },
  { name: 'Corn', value: 28, color: 'hsl(43 74% 66%)' },
  { name: 'Soybeans', value: 22, color: 'hsl(31 45% 58%)' },
  { name: 'Rice', value: 15, color: 'hsl(23 47% 42%)' },
];

const performanceMetrics = [
  {
    id: 1,
    title: "Crop Yield Efficiency",
    current: 94.2,
    target: 95.0,
    trend: "up",
    change: 2.3
  },
  {
    id: 2,
    title: "Livestock Health Score",
    current: 97.8,
    target: 98.0,
    trend: "up",
    change: 1.2
  },
  {
    id: 3,
    title: "Resource Utilization",
    current: 87.5,
    target: 90.0,
    trend: "down",
    change: -0.8
  },
  {
    id: 4,
    title: "Cost per Unit",
    current: 12.3,
    target: 11.8,
    trend: "down",
    change: -1.5
  }
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState('productivity');

  // Fetch real sales & purchases for break-even chart
  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchasesData, setPurchasesData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: sales }, { data: purchases }] = await Promise.all([
        supabase.from('sales').select('total_amount, sale_date, product_type').order('sale_date'),
        supabase.from('purchases').select('total_cost, purchase_date, category').order('purchase_date'),
      ]);
      setSalesData(sales || []);
      setPurchasesData(purchases || []);
    };
    fetchData();
  }, []);

  // Build monthly break-even data
  const breakEvenData = useMemo(() => {
    const monthlyMap = new Map<string, { revenue: number; fixedCosts: number; variableCosts: number }>();

    const opexKeys = ['permanent_labour', 'salaries', 'salary', 'machinery', 'equipment', 'maintenance',
      'utilities', 'electricity', 'water', 'transport', 'insurance', 'administration', 'marketing',
      'communication', 'land_costs', 'farm_supplies', 'loan_interest', 'bank_charges', 'depreciation', 'taxes'];

    salesData.forEach((s: any) => {
      const month = s.sale_date?.substring(0, 7);
      if (!month) return;
      if (!monthlyMap.has(month)) monthlyMap.set(month, { revenue: 0, fixedCosts: 0, variableCosts: 0 });
      monthlyMap.get(month)!.revenue += s.total_amount || 0;
    });

    purchasesData.forEach((p: any) => {
      const month = p.purchase_date?.substring(0, 7);
      if (!month) return;
      if (!monthlyMap.has(month)) monthlyMap.set(month, { revenue: 0, fixedCosts: 0, variableCosts: 0 });
      const isFixed = opexKeys.some(k => (p.category || '').toLowerCase().includes(k));
      if (isFixed) {
        monthlyMap.get(month)!.fixedCosts += p.total_cost || 0;
      } else {
        monthlyMap.get(month)!.variableCosts += p.total_cost || 0;
      }
    });

    // Calculate cumulative + break-even line
    let cumRevenue = 0, cumFixed = 0, cumVariable = 0;
    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => {
        cumRevenue += d.revenue;
        cumFixed += d.fixedCosts;
        cumVariable += d.variableCosts;
        const cmRatio = cumRevenue > 0 ? (cumRevenue - cumVariable) / cumRevenue : 0;
        const breakEvenRev = cmRatio > 0 ? cumFixed / cmRatio : cumFixed + cumVariable;
        return {
          month,
          revenue: cumRevenue,
          totalCosts: cumFixed + cumVariable,
          breakEven: Math.round(breakEvenRev),
        };
      });
  }, [salesData, purchasesData]);

  const latestBE = breakEvenData.length > 0 ? breakEvenData[breakEvenData.length - 1] : null;
  const isAboveBreakEven = latestBE ? latestBE.revenue >= latestBE.breakEven : false;
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' }
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Deep insights into farm performance and trends</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button className="bg-farm-green hover:bg-farm-green/90" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range.id}
              variant={timeRange === range.id ? "default" : "outline"}
              onClick={() => setTimeRange(range.id as typeof timeRange)}
              size="sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {range.label}
            </Button>
          ))}
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceMetrics.map((metric) => (
            <Card key={metric.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{metric.current}%</span>
                      <Badge 
                        className={`${
                          metric.trend === 'up' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {metric.trend === 'up' ? '+' : ''}{metric.change}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      Target: {metric.target}%
                    </div>
                  </div>
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productivity Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-farm-green" />
                Productivity Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={productivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="crops" 
                    stroke="hsl(84 31% 44%)" 
                    strokeWidth={2}
                    name="Crops"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="livestock" 
                    stroke="hsl(31 45% 58%)" 
                    strokeWidth={2}
                    name="Livestock"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="hsl(23 47% 42%)" 
                    strokeWidth={2}
                    name="Efficiency"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Crop Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-farm-barn" />
                Crop Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cropDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {cropDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Analysis */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-farm-harvest" />
                Quarterly Revenue Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatKES(Number(value)), '']} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="hsl(84 31% 44%)" 
                    fill="hsl(84 31% 44% / 0.6)"
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="costs" 
                    stackId="2"
                    stroke="hsl(31 45% 58%)" 
                    fill="hsl(31 45% 58% / 0.6)"
                    name="Costs"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stackId="3"
                    stroke="hsl(23 47% 42%)" 
                    fill="hsl(23 47% 42% / 0.6)"
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Key Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-farm-green">Performance Highlights</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Livestock health score improved by 1.2% this month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Crop yield efficiency is approaching target levels</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Cost per unit decreased by 1.5% due to optimization</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-farm-barn">Areas for Improvement</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span>Resource utilization needs attention to reach 90% target</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span>Consider diversifying crop portfolio for better risk management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span>Seasonal planning could improve quarterly consistency</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
