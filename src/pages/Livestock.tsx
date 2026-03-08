
import { Layout } from "@/components/Layout";
import { Livestock } from "@/components/Livestock";
import { LivestockProfitLoss } from "@/components/LivestockProfitLoss";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LivestockPage() {
  return (
    <Layout>
      <Tabs defaultValue="management" className="space-y-6">
        <TabsList>
          <TabsTrigger value="management">Livestock Management</TabsTrigger>
          <TabsTrigger value="pnl">P&L Report</TabsTrigger>
        </TabsList>
        <TabsContent value="management">
          <Livestock />
        </TabsContent>
        <TabsContent value="pnl">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Livestock Profit & Loss</h1>
              <p className="text-muted-foreground">Revenue and costs breakdown per livestock product</p>
            </div>
            <LivestockProfitLoss />
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
