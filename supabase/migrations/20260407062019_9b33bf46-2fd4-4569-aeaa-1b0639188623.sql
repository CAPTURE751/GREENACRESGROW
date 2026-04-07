
-- Add linking columns to sales table
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS linked_module text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_record_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_record_name text DEFAULT NULL;

-- Add linking columns to purchases table  
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS linked_module text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_record_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_record_name text DEFAULT NULL;

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sales_linked ON public.sales(linked_module, linked_record_id) WHERE linked_module IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_linked ON public.purchases(linked_module, linked_record_id) WHERE linked_module IS NOT NULL;
