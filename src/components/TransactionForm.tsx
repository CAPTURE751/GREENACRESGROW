import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Info } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";
import { useCapitalInjections } from "@/hooks/useCapitalInjections";
import { useCrops } from "@/hooks/useCrops";
import { useLivestock } from "@/hooks/useLivestock";
import { useEquipment } from "@/hooks/useEquipment";
import { useInventory } from "@/hooks/useInventory";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TransactionFormProps {
  onClose: () => void;
  editMode?: boolean;
  editType?: 'income' | 'expense' | 'capital_injection';
  editData?: any;
}

type LinkedModule = 'none' | 'crop' | 'livestock' | 'equipment' | 'inventory';

const INCOME_CATEGORIES = [
  { group: 'Crop Sales', items: ['crop', 'maize', 'beans', 'onion', 'vegetable', 'fruit'] },
  { group: 'Livestock', items: ['livestock', 'milk', 'eggs', 'meat', 'dairy', 'poultry'] },
  { group: 'Other', items: ['honey', 'seeds', 'processed', 'other'] },
];

const EXPENSE_CATEGORIES = [
  'seeds', 'fertilizer', 'pesticides', 'feed', 'medicine',
  'equipment', 'labor', 'fuel', 'transport', 'utilities', 'other',
];

export function TransactionForm({ onClose, editMode, editType, editData }: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'capital_injection'>(editType || 'income');
  const [linkedModule, setLinkedModule] = useState<LinkedModule>(editData?.linked_module || 'none');
  const [linkedRecordId, setLinkedRecordId] = useState<string>(editData?.linked_record_id || '');

  const [formData, setFormData] = useState({
    date: editData?.date || new Date().toISOString().split('T')[0],
    notes: editData?.notes || '',
    description: editData?.description || editData?.product_name || editData?.item_name || '',
    amount: (editData?.amount ?? editData?.total_amount ?? editData?.total_cost ?? '').toString(),
    category: editData?.category || editData?.product_type || 'other',
    capital_source: editData?.source || 'Owner',
  });

  const { createSale, updateSale, isCreating: isCreatingSale, isUpdating: isUpdatingSale } = useSales();
  const { createPurchase, updatePurchase, isCreating: isCreatingPurchase, isUpdating: isUpdatingPurchase } = usePurchases();
  const { createInjection, updateInjection, isCreating: isCreatingInjection, isUpdating: isUpdatingInjection } = useCapitalInjections();
  const { crops } = useCrops();
  const { livestock } = useLivestock();
  const { equipment } = useEquipment();
  const { inventory } = useInventory();

  const isLoading = isCreatingSale || isCreatingPurchase || isCreatingInjection || isUpdatingSale || isUpdatingPurchase || isUpdatingInjection;

  const resolveLinkedName = () => {
    if (linkedModule === 'none' || !linkedRecordId) return '';
    if (linkedModule === 'crop') {
      const c = crops.find(x => x.id === linkedRecordId);
      return c ? `${c.name}` : '';
    }
    if (linkedModule === 'livestock') {
      const l = livestock.find(x => x.id === linkedRecordId);
      return l ? `${l.type}${l.breed ? ' - ' + l.breed : ''}` : '';
    }
    if (linkedModule === 'equipment') {
      const e = equipment.find(x => x.id === linkedRecordId);
      return e ? e.name : '';
    }
    if (linkedModule === 'inventory') {
      const i = inventory.find(x => x.id === linkedRecordId);
      return i ? i.item_name : '';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = Number(formData.amount);
    if (!amount || amount <= 0) return;

    if (editMode && editData?.id) {
      if (transactionType === 'income') {
        updateSale({
          id: editData.id,
          updates: {
            product_name: formData.description || 'Income',
            product_type: formData.category,
            quantity: 1,
            unit_price: amount,
            sale_date: formData.date,
            payment_status: 'paid',
            notes: formData.notes,
          } as any,
        });
      } else if (transactionType === 'expense') {
        updatePurchase({
          id: editData.id,
          updates: {
            item_name: formData.description || 'Expense',
            category: formData.category,
            quantity: 1,
            unit_cost: amount,
            purchase_date: formData.date,
            payment_status: 'paid',
            notes: formData.notes,
          } as any,
        });
      } else {
        updateInjection({
          id: editData.id,
          updates: {
            amount,
            injection_date: formData.date,
            source: formData.capital_source,
            description: formData.description || undefined,
            notes: formData.notes || undefined,
          },
        });
      }
    } else {
      const linkedData = linkedModule !== 'none' && linkedRecordId ? {
        linked_module: linkedModule,
        linked_record_id: linkedRecordId,
        linked_record_name: resolveLinkedName(),
      } : {};

      if (transactionType === 'income') {
        createSale({
          product_name: formData.description || 'Income',
          product_type: formData.category as any,
          product_id: linkedRecordId || crypto.randomUUID(),
          buyer: 'N/A',
          quantity: 1,
          unit: 'unit',
          unit_price: amount,
          total_amount: amount,
          sale_date: formData.date,
          payment_status: 'paid' as any,
          notes: formData.notes,
          ...linkedData,
        } as any);
      } else if (transactionType === 'expense') {
        createPurchase({
          item_name: formData.description || 'Expense',
          category: formData.category,
          supplier: 'N/A',
          quantity: 1,
          unit: 'unit',
          unit_cost: amount,
          purchase_date: formData.date,
          payment_status: 'paid' as any,
          notes: formData.notes,
          ...linkedData,
        } as any);
      } else {
        createInjection({
          amount,
          injection_date: formData.date,
          source: formData.capital_source,
          description: formData.description || undefined,
          notes: formData.notes || undefined,
        });
      }
    }

    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const linkedOptions = (() => {
    if (linkedModule === 'crop') return crops.map(c => ({ id: c.id, label: `${c.name} (${c.type})` }));
    if (linkedModule === 'livestock') return livestock.map(l => ({ id: l.id, label: `${l.type}${l.breed ? ' - ' + l.breed : ''}` }));
    if (linkedModule === 'equipment') return equipment.map(e => ({ id: e.id, label: `${e.name} (${e.category})` }));
    if (linkedModule === 'inventory') return inventory.map(i => ({ id: i.id, label: `${i.item_name} (${i.category})` }));
    return [];
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Type */}
      <div className="space-y-2">
        <Label>Transaction Type</Label>
        <Select value={transactionType} onValueChange={(value: 'income' | 'expense' | 'capital_injection') => setTransactionType(value)} disabled={editMode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Income (Sale)</SelectItem>
            <SelectItem value="expense">Expense (Purchase)</SelectItem>
            <SelectItem value="capital_injection">Capital Injection</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Link to Module - only for income/expense */}
      {transactionType !== 'capital_injection' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Link to Module</Label>
            <Select value={linkedModule} onValueChange={(v: LinkedModule) => { setLinkedModule(v); setLinkedRecordId(''); }} disabled={editMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General (No link)</SelectItem>
                <SelectItem value="crop">Crop</SelectItem>
                <SelectItem value="livestock">Livestock</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {linkedModule !== 'none' && (
            <div className="space-y-2">
              <Label>Select Record *</Label>
              <Select value={linkedRecordId} onValueChange={setLinkedRecordId}>
                <SelectTrigger><SelectValue placeholder={`Choose a ${linkedModule}`} /></SelectTrigger>
                <SelectContent>
                  {linkedOptions.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">No {linkedModule} records yet</div>
                  ) : linkedOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {linkedRecordId && resolveLinkedName() && (
                <Badge variant="secondary" className="mt-1 capitalize">
                  {linkedModule}: {resolveLinkedName()}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Capital Injection Info Banner */}
      {transactionType === 'capital_injection' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Owner funds added to the business.</strong> This increases the farm's Cash/Bank balance and is recorded under Owner's Equity. Not treated as revenue.
          </AlertDescription>
        </Alert>
      )}

      {/* Simplified Core Fields: Amount + Description + Category + (Source for capital) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (KSh) *</Label>
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.00"
            required
            min="0.01"
            step="0.01"
          />
        </div>

        {transactionType === 'capital_injection' ? (
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={formData.capital_source} onValueChange={(value) => handleInputChange('capital_source', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Owner">Owner</SelectItem>
                <SelectItem value="Partner">Partner</SelectItem>
                <SelectItem value="Investor">Investor</SelectItem>
                <SelectItem value="Loan">Loan Disbursement</SelectItem>
                <SelectItem value="Grant">Grant / Subsidy</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {transactionType === 'income' ? (
                  INCOME_CATEGORIES.map(g => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{g.group}</SelectLabel>
                      {g.items.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                    </SelectGroup>
                  ))
                ) : (
                  EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder={
              transactionType === 'income' ? 'e.g., Maize harvest sold to local market'
              : transactionType === 'expense' ? 'e.g., DAP fertilizer for maize field'
              : 'e.g., Initial farm capital'
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="txn-date">Date *</Label>
          <Input
            id="txn-date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Additional notes..." rows={2} />
      </div>

      {transactionType !== 'capital_injection' && (
        <p className="text-xs text-muted-foreground">Payment is automatically marked as <strong>Paid</strong>.</p>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isLoading} className="bg-farm-green hover:bg-farm-green/90">
          {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (
            editMode ? 'Update Record' :
            transactionType === 'income' ? 'Record Income' :
            transactionType === 'expense' ? 'Record Expense' :
            'Record Capital Injection'
          )}
        </Button>
      </div>
    </form>
  );
}
