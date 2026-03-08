
-- Add unique constraint on inventory item_name so the purchase trigger works
ALTER TABLE public.inventory ADD CONSTRAINT inventory_item_name_unique UNIQUE (item_name);
