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
import { useInventory } from "@/hooks/useInventory";
import { useInventoryAlerts, useGenerateFarmReport, useProfitLossCalculation } from "@/hooks/useEdgeFunctions";

// Mock data for charts
const revenueData = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 3000, expenses: 1398 },
  { month: 'Mar', revenue: 5000, expenses: 2800 },
  { month: 'Apr', revenue: 2780, expenses: 3908 },
  { month: 'May', revenue: 1890, expenses: 4800 },
  { month: 'Jun', revenue: 6390, expenses: 3800 },
];

const cropYieldData = [
  { crop: 'Corn', yield: 85 },
  { crop: 'Wheat', yield: 70 },
  { crop: 'Soybeans', yield: 60 },
  { crop: 'Rice', yield: 90 },
];

const livestockData = [
  { name: 'Cattle', value: 45, color: '#8B4513' },
  { name: 'Pigs', value: 30, color: '#D2691E' },
  { name: 'Chickens', value: 150, color: '#DAA520' },
  { name: 'Sheep', value: 25, color: '#556B2F' },
];

export function Dashboard() {
  const { profile, signOut, hasRole } = useAuth();
  const { crops, isLoading: cropsLoading } = useCrops();
  const { livestock, isLoading: livestockLoading } = useLivestock();
  const { analytics, isLoading: salesLoading } = useSales();
  const { lowStockItems } = useInventory();
  
  // Edge Functions
  const inventoryAlerts = useInventoryAlerts();
  const generateReport = useGenerateFarmReport();
  const calculateProfitLoss = useProfitLossCalculation();

  const upcomingTasks = [
    { id: 1, task: "Fertilize corn field A", date: "Today", priority: "high" },
    { id: 2, task: "Vaccinate cattle group B", date: "Tomorrow", priority: "medium" },
    { id: 3, task: "Harvest wheat section 3", date: "In 3 days", priority: "high" },
    { id: 4, task: "Feed inventory check", date: "This week", priority: "low" },
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
            <p className="text-xs text-muted-foreground">
              Active crop records
            </p>
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
            <p className="text-xs text-muted-foreground">
              Total livestock count
            </p>
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
            <p className="text-xs text-muted-foreground">
              Total sales revenue
            </p>
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
            <p className="text-xs text-muted-foreground">
              Completed sales
            </p>
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(84 31% 44%)" strokeWidth={3} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(43 74% 66%)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="h-5 w-5" />
              Crop Yields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cropYieldData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="crop" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="yield" fill="hsl(84 31% 44%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Tasks & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
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
