UPDATE public.purchases SET quantity = 1 WHERE quantity = 0 AND unit_cost > 0;
UPDATE public.sales SET quantity = 1 WHERE quantity = 0 AND unit_price > 0;