import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/useSales";
import { usePurchases } from "@/hooks/usePurchases";

interface TransactionFormProps {
  onClose: () => void;
}

export function TransactionForm({ onClose }: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [formData, setFormData] = useState({
    date: new Date(),
    notes: '',
    
    // Sale fields
    product_name: '',
    product_type: 'crop',
    buyer: '',
    buyer_contact: '',
    quantity: '',
    unit: '',
    unit_price: '',
    payment_status: 'pending',

    // Purchase fields
    item_name: '',
    category: '',
    supplier: '',
    supplier_contact: '',
    received_date: new Date(),
  });

  const { createSale, isCreating: isCreatingSale } = useSales();
  const { createPurchase, isCreating: isCreatingPurchase } = usePurchases();

  const isLoading = isCreatingSale || isCreatingPurchase;

  // Compute total amount dynamically
  const totalAmount = Number(formData.quantity) * Number(formData.unit_price);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (transactionType === 'income') {
      // Include total_amount in the sale
      createSale({
        product_name: formData.product_name,
        product_type: formData.product_type as any,
        product_id: crypto.randomUUID(),
        buyer: formData.buyer,
        buyer_contact: formData.buyer_contact,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        unit_price: Number(formData.unit_price),
        total_amount: totalAmount, // <-- Added total_amount
        sale_date: formData.date.toISOString().split('T')[0],
        payment_status: formData.payment_status as any,
        notes: formData.notes,
      });
    } else {
      createPurchase({
        item_name: formData.item_name,
        category: formData.category,
        supplier: formData.supplier,
        supplier_contact: formData.supplier_contact,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        unit_cost: Number(formData.unit_price),
        purchase_date: formData.date.toISOString().split('T')[0],
        received_date: formData.received_date ? formData.received_date.toISOString().split('T')[0] : undefined,
        payment_status: formData.payment_status as any,
        notes: formData.notes,
      });
    }

    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Type */}
      <div className="space-y-2">
        <Label>Transaction Type</Label>
        <Select value={transactionType} onValueChange={(value: 'income' | 'expense') => setTransactionType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Income (Sale)</SelectItem>
            <SelectItem value="expense">Expense (Purchase)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Form Fields */}
      <div key={transactionType} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {transactionType === 'income' ? (
          <>
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => handleInputChange('product_name', e.target.value)}
                placeholder="e.g., Wheat, Corn"
                required
              />
            </div>

            {/* Product Type */}
            <div className="space-y-2">
              <Label htmlFor="product_type">Product Type</Label>
              <Select value={formData.product_type} onValueChange={(value) => handleInputChange('product_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Crop Sales</SelectLabel>
                    <SelectItem value="crop">Crop</SelectItem>
                    <SelectItem value="maize">Maize</SelectItem>
                    <SelectItem value="beans">Beans</SelectItem>
                    <SelectItem value="onion">Onion</SelectItem>
                    <SelectItem value="vegetable">Vegetable</SelectItem>
                    <SelectItem value="fruit">Fruit</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Livestock</SelectLabel>
                    <SelectItem value="livestock">Livestock</SelectItem>
                    <SelectItem value="milk">Milk</SelectItem>
                    <SelectItem value="eggs">Eggs</SelectItem>
                    <SelectItem value="meat">Meat</SelectItem>
                    <SelectItem value="dairy">Dairy</SelectItem>
                    <SelectItem value="poultry">Poultry</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    <SelectItem value="honey">Honey</SelectItem>
                    <SelectItem value="seeds">Seeds</SelectItem>
                    <SelectItem value="processed">Processed Products</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Buyer */}
            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer *</Label>
              <Input
                id="buyer"
                value={formData.buyer}
                onChange={(e) => handleInputChange('buyer', e.target.value)}
                placeholder="Buyer name"
                required
              />
            </div>

            {/* Buyer Contact */}
            <div className="space-y-2">
              <Label htmlFor="buyer_contact">Buyer Contact</Label>
              <Input
                id="buyer_contact"
                value={formData.buyer_contact}
                onChange={(e) => handleInputChange('buyer_contact', e.target.value)}
                placeholder="Phone or email"
              />
            </div>
          </>
        ) : (
          <>
            {/* Purchase Fields */}
            <div className="space-y-2">
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => handleInputChange('item_name', e.target.value)}
                placeholder="e.g., Seeds, Fertilizer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {/* ... same as before ... */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="Supplier name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_contact">Supplier Contact</Label>
              <Input
                id="supplier_contact"
                value={formData.supplier_contact}
                onChange={(e) => handleInputChange('supplier_contact', e.target.value)}
                placeholder="Phone or email"
              />
            </div>
          </>
        )}

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            placeholder="0"
            required
            min="0"
            step="0.1"
          />
        </div>

        {/* Unit */}
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => handleInputChange('unit', e.target.value)}
            placeholder="e.g., kg, lbs, pieces"
          />
        </div>

        {/* Unit Price */}
        <div className="space-y-2">
          <Label htmlFor="unit_price">{transactionType === 'income' ? 'Unit Price' : 'Unit Cost'} *</Label>
          <Input
            id="unit_price"
            type="number"
            value={formData.unit_price}
            onChange={(e) => handleInputChange('unit_price', e.target.value)}
            placeholder="0.00"
            required
            min="0"
            step="0.01"
          />
        </div>

        {/* Total Amount (Read-Only) */}
        {transactionType === 'income' && (
          <div className="space-y-2">
            <Label>Total Amount</Label>
            <Input
              type="number"
              value={totalAmount}
              readOnly
              className="bg-gray-100"
            />
          </div>
        )}

        {/* Payment Status */}
        <div className="space-y-2">
          <Label htmlFor="payment_status">Payment Status</Label>
          <Select value={formData.payment_status} onValueChange={(value) => handleInputChange('payment_status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Picker, Notes, Buttons remain unchanged */}

    </form>
  );
}
