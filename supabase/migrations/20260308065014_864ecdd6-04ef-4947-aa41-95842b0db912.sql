-- Enable realtime for sales and purchases tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;

-- Add updated_at trigger for purchases (sales doesn't have updated_at column)
-- Add total_cost auto-calculation trigger for purchases
CREATE OR REPLACE FUNCTION public.calculate_purchase_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total_cost = NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_purchase_total_trigger
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_purchase_total();

-- Add total_amount auto-calculation trigger for sales
CREATE OR REPLACE FUNCTION public.calculate_sale_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total_amount = NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_sale_total_trigger
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sale_total();

-- Add farmer INSERT policy for purchases (currently only admin/staff can manage)
CREATE POLICY "Users can create purchases"
  ON public.purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Add farmer UPDATE policy for own purchases  
CREATE POLICY "Users can update own purchases"
  ON public.purchases
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());
