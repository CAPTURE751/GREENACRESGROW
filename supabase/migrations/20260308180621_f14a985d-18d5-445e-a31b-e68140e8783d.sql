
-- Re-create triggers (drop if exist first)
DROP TRIGGER IF EXISTS calculate_sale_total_trigger ON public.sales;
DROP TRIGGER IF EXISTS calculate_purchase_total_trigger ON public.purchases;
DROP TRIGGER IF EXISTS update_inventory_on_sale_trigger ON public.sales;
DROP TRIGGER IF EXISTS update_inventory_on_purchase_trigger ON public.purchases;

CREATE TRIGGER calculate_sale_total_trigger
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sale_total();

CREATE TRIGGER calculate_purchase_total_trigger
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_purchase_total();

CREATE TRIGGER update_inventory_on_sale_trigger
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_sale();

CREATE TRIGGER update_inventory_on_purchase_trigger
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_purchase();
