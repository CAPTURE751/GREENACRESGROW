import { Layout } from "@/components/Layout";
import { BudgetItemsPanel } from "@/components/budget/BudgetItemsPanel";

export default function BudgetItems() {
  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Budget Items</h1>
          <p className="text-muted-foreground text-sm">Line items come from your saved budgets. Link Finance expenses to them to track actual spending.</p>
        </div>
        <BudgetItemsPanel />
      </div>
    </Layout>
  );
}
