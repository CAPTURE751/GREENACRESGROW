
import { Layout } from "@/components/Layout";
import { Crops } from "@/components/Crops";
import { CropProfitLoss } from "@/components/CropProfitLoss";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CropsPage() {
  return (
    <Layout>
      <Tabs defaultValue="management" className="space-y-6">
        <TabsList>
          <TabsTrigger value="management">Crop Management</TabsTrigger>
          <TabsTrigger value="pnl">P&L Report</TabsTrigger>
        </TabsList>
        <TabsContent value="management">
          <Crops />
        </TabsContent>
        <TabsContent value="pnl">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Crop Profit & Loss</h1>
              <p className="text-muted-foreground">Revenue and costs breakdown per crop</p>
            </div>
            <CropProfitLoss />
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
