import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/currency";
import { AdminQuickAccess } from "@/components/AdminQuickAccess";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Wheat, 
  Beef, 
  DollarSign, 
  TrendingUp, 
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  LogOut,
  Loader2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useCrops } from "@/hooks/useCrops";
import { useLivestock } from "@/hooks/useLivestock";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { useCapitalInjections } from "@/hooks/useCapitalInjections";
import { useInventory } from "@/hooks/useInventory";
import { useInventoryAlerts, useGenerateFarmReport, useProfitLossCalculation } from "@/hooks/useEdgeFunctions";
import { format, parseISO } from "date-fns";

const LIVESTOCK_COLORS = ['hsl(84, 31%, 44%)', 'hsl(43, 74%, 49%)', 'hsl(25, 65%, 45%)', 'hsl(150, 40%, 40%)', 'hsl(200, 50%, 45%)', 'hsl(340, 50%, 50%)'];

export function Dashboard() {
  const { profile, signOut, hasRole } = useAuth();
  const { crops, isLoading: cropsLoading } = useCrops();
  const { livestock, isLoading: livestockLoading } = useLivestock();
  const { sales, analytics, isLoading: salesLoading } = useSales();
  const { purchases } = usePurchases();
  const { totalCapital } = useCapitalInjections();
  const { lowStockItems } = useInventory();
  
  const inventoryAlerts = useInventoryAlerts();
  const generateReport = useGenerateFarmReport();
  const calculateProfitLoss = useProfitLossCalculation();

  // Revenue vs Expenses chart — group by month from real sales & purchases
  const revenueData = useMemo(() => {
    const monthMap: Record<string, { revenue: number; expenses: number }> = {};

    for (const sale of sales) {
      const key = format(parseISO(sale.sale_date), 'MMM yyyy');
      if (!monthMap[key]) monthMap[key] = { revenue: 0, expenses: 0 };
      monthMap[key].revenue += sale.total_amount || 0;
    }

    for (const purchase of purchases) {
      const key = format(parseISO(purchase.purchase_date), 'MMM yyyy');
      if (!monthMap[key]) monthMap[key] = { revenue: 0, expenses: 0 };
      monthMap[key].expenses += purchase.total_cost || 0;
    }

    return Object.entries(monthMap)
      .sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateA.getTime() - dateB.getTime();
      })
      .map(([month, data]) => ({ month: month.split(' ')[0], ...data }));
  }, [sales, purchases]);

  // Crop Yields chart — real crops with yield data
  const cropYieldData = useMemo(() => {
    return crops
      .filter(c => c.yield_quantity && c.yield_quantity > 0)
      .map(c => ({ crop: c.name, yield: c.yield_quantity || 0 }));
  }, [crops]);

  // Livestock distribution — group by type
  const livestockData = useMemo(() => {
    const typeMap: Record<string, number> = {};
    for (const animal of livestock) {
      typeMap[animal.type] = (typeMap[animal.type] || 0) + 1;
    }
    return Object.entries(typeMap).map(([name, value], i) => ({
      name,
      value,
      color: LIVESTOCK_COLORS[i % LIVESTOCK_COLORS.length],
    }));
  }, [livestock]);

  const upcomingTasks = [
    ...lowStockItems.map(item => ({
      id: `stock-${item.id}`,
      task: `Restock ${item.item_name}`,
      date: "ASAP",
      priority: "high" as const
    }))
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="farm-gradient rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {profile?.name || 'Farmer'}!</h1>
            <p className="text-white/80 mt-1">Here's what's happening on your farm today</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={() => inventoryAlerts.mutate()}
              disabled={inventoryAlerts.isPending}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Check Alerts
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Crops</CardTitle>
            <Wheat className="h-5 w-5 text-farm-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cropsLoading ? '...' : crops.length}
            </div>
            <p className="text-xs text-muted-foreground">Active crop records</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livestock</CardTitle>
            <Beef className="h-5 w-5 text-farm-barn" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {livestockLoading ? '...' : livestock.length}
            </div>
            <p className="text-xs text-muted-foreground">Total livestock count</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-farm-harvest" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatKES(analytics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total sales revenue</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesLoading ? '...' : analytics?.completedSales || '0'}
            </div>
            <p className="text-xs text-muted-foreground">Completed sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatKES(value)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(84 31% 44%)" strokeWidth={3} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(43 74% 66%)" strokeWidth={3} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <TrendingUp className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No financial data yet</p>
                <p className="text-xs">Record sales and purchases to see trends</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {cropYieldData.length > 0 || livestockData.length === 0 ? (
                <><Wheat className="h-5 w-5" /> Crop Yields</>
              ) : (
                <><Beef className="h-5 w-5" /> Livestock Distribution</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cropYieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cropYieldData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="crop" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="yield" fill="hsl(84 31% 44%)" radius={[4, 4, 0, 0]} name="Yield" />
                </BarChart>
              </ResponsiveContainer>
            ) : livestockData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={livestockData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                    {livestockData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Wheat className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No crop or livestock data yet</p>
                <p className="text-xs">Add crops with yield data or livestock to see charts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {task.priority === 'high' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium">{task.task}</p>
                        <p className="text-sm text-muted-foreground">{task.date}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <p className="text-sm text-red-700 font-medium">
                      +{lowStockItems.length - 5} more low stock items require attention
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-3 opacity-40 text-green-500" />
                <p className="text-sm font-medium">All clear!</p>
                <p className="text-xs">No alerts or low-stock items at the moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                generateReport.mutate({
                  report_type: 'monthly',
                  start_date: thirtyDaysAgo.toISOString().split('T')[0],
                  end_date: now.toISOString().split('T')[0],
                });
              }}
              disabled={generateReport.isPending}
            >
              {generateReport.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => calculateProfitLoss.mutate({
                start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0]
              })}
              disabled={calculateProfitLoss.isPending}
            >
              {calculateProfitLoss.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Calculate P&L (30d)
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => inventoryAlerts.mutate()}
              disabled={inventoryAlerts.isPending}
            >
              {inventoryAlerts.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Run Inventory Check
            </Button>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">System Status</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Database: Connected</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Real-time: Active</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${lowStockItems.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span>Inventory: {lowStockItems.length === 0 ? 'Good' : `${lowStockItems.length} alerts`}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Admin Quick Access */}
      {hasRole('admin') && (
        <div className="mt-8">
          <AdminQuickAccess />
        </div>
      )}
    </div>
  );
}
