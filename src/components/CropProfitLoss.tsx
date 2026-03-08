import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKES } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportModulePnLToPDF } from "@/lib/pnl-module-export";
import { toast } from "sonner";

export function CropProfitLoss() {
  const [selectedCrop, setSelectedCrop] = useState<string>("all");

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["crop-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("product_type", "crop")
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["crop-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .in("category", ["seeds", "fertilizer", "chemicals", "casual_labour"])
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = salesLoading || purchasesLoading;

  // Get unique crop names from sales
  const cropNames = useMemo(() => {
    const names = new Set(sales.map((s) => s.product_name));
    return Array.from(names).sort();
  }, [sales]);

  // Build P&L per crop
  const cropPnL = useMemo(() => {
    const map: Record<string, { revenue: number; costs: number; salesCount: number; salesDetails: typeof sales; costDetails: typeof purchases }> = {};

    for (const sale of sales) {
      const name = sale.product_name;
      if (!map[name]) map[name] = { revenue: 0, costs: 0, salesCount: 0, salesDetails: [], costDetails: [] };
      map[name].revenue += sale.total_amount || 0;
      map[name].salesCount += 1;
      map[name].salesDetails.push(sale);
    }

    // Distribute costs: if we can match by item_name containing crop name, assign there; else spread evenly
    for (const purchase of purchases) {
      const matchedCrop = Object.keys(map).find(
        (crop) =>
          purchase.item_name.toLowerCase().includes(crop.toLowerCase()) ||
          purchase.notes?.toLowerCase().includes(crop.toLowerCase())
      );
      if (matchedCrop) {
        map[matchedCrop].costs += purchase.total_cost || 0;
        map[matchedCrop].costDetails.push(purchase);
      }
    }

    return map;
  }, [sales, purchases]);

  const filteredData = selectedCrop === "all" ? cropPnL : { [selectedCrop]: cropPnL[selectedCrop] };

  // Summary totals
  const totals = useMemo(() => {
    const data = selectedCrop === "all" ? cropPnL : { [selectedCrop]: cropPnL[selectedCrop] };
    let totalRevenue = 0, totalCosts = 0;
    for (const key of Object.keys(data)) {
      if (data[key]) {
        totalRevenue += data[key].revenue;
        totalCosts += data[key].costs;
      }
    }
    return { totalRevenue, totalCosts, netProfit: totalRevenue - totalCosts };
  }, [cropPnL, selectedCrop]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-farm-green" />
        <span className="ml-2 text-muted-foreground">Loading P&L data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter & Download */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await exportModulePnLToPDF("crop", filteredData, totals, selectedCrop);
              toast.success("Crop P&L PDF downloaded successfully");
            } catch (e) {
              toast.error("Failed to generate PDF");
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Select value={selectedCrop} onValueChange={setSelectedCrop}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by crop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Crops</SelectItem>
            {cropNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatKES(totals.totalRevenue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-600 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Costs</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatKES(totals.totalCosts)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 shadow-sm ${totals.netProfit >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {totals.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                </p>
                <p className={`text-2xl font-bold mt-1 ${totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatKES(Math.abs(totals.netProfit))}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${totals.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <DollarSign className={`h-6 w-6 ${totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Crop Breakdown */}
      {Object.keys(filteredData).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No crop sales data yet</h3>
            <p className="text-muted-foreground">Record crop sales in the Finances module to see P&L reports here.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(filteredData).map(([cropName, data]) => {
          if (!data) return null;
          const profit = data.revenue - data.costs;
          const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

          return (
            <Card key={cropName} className={`shadow-sm border-t-4 ${profit >= 0 ? 'border-t-green-500' : 'border-t-red-500'}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-3">
                    {cropName}
                    <Badge variant={profit >= 0 ? "default" : "destructive"} className={profit >= 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                      {profit >= 0 ? "Profitable" : "Loss"}
                    </Badge>
                  </CardTitle>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatKES(profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">Margin: {margin.toFixed(1)}%</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Revenue Details */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Sales Revenue</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.salesDetails.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                          <TableCell>{sale.buyer}</TableCell>
                          <TableCell>{sale.quantity} {sale.unit}</TableCell>
                          <TableCell>{formatKES(sale.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium text-blue-600">{formatKES(sale.total_amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={4}>Total Revenue</TableCell>
                        <TableCell className="text-right text-blue-600">{formatKES(data.revenue)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Cost Details */}
                {data.costDetails.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Associated Costs</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.costDetails.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell>{new Date(purchase.purchase_date).toLocaleDateString()}</TableCell>
                            <TableCell>{purchase.item_name}</TableCell>
                            <TableCell className="capitalize">{purchase.category}</TableCell>
                            <TableCell>{purchase.supplier}</TableCell>
                            <TableCell className="text-right font-medium text-orange-600">{formatKES(purchase.total_cost)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2">
                          <TableCell colSpan={4}>Total Costs</TableCell>
                          <TableCell className="text-right text-orange-600">{formatKES(data.costs)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
