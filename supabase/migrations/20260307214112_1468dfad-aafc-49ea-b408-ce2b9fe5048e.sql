-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'staff', 'farmer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'farmer',
  farm_location TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crops table
CREATE TABLE public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  season TEXT,
  planting_date DATE,
  harvest_date DATE,
  farm_location TEXT NOT NULL,
  yield_quantity DECIMAL(10,2),
  yield_unit TEXT,
  status TEXT DEFAULT 'planted',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create livestock table
CREATE TABLE public.livestock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  health_status TEXT DEFAULT 'healthy',
  farm_location TEXT NOT NULL,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  weight DECIMAL(8,2),
  gender TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  date_of_birth DATE,
  date_of_arrival_at_farm DATE,
  date_of_birth_on_farm DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_at_least_one_date CHECK (date_of_arrival_at_farm IS NOT NULL OR date_of_birth_on_farm IS NOT NULL)
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  status TEXT DEFAULT 'available',
  assigned_to UUID REFERENCES auth.users(id),
  maintenance_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  location TEXT,
  min_threshold DECIMAL(10,2) DEFAULT 0,
  unit_cost DECIMAL(8,2),
  supplier TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('crop', 'livestock')),
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  buyer TEXT NOT NULL,
  buyer_contact TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  supplier TEXT NOT NULL,
  supplier_contact TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_cost DECIMAL(8,2) NOT NULL,
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT DEFAULT 'pending',
  received_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  file_url TEXT,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'generated',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_date DATE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('crop', 'livestock', 'maintenance', 'harvest')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = $1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS: Profiles
CREATE POLICY "Users can view own profile, admin/staff can view all" ON public.profiles FOR SELECT USING (
  auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS: Crops
CREATE POLICY "Admin and staff can view all crops" ON public.crops FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') OR created_by = auth.uid()
);
CREATE POLICY "Users can create crops" ON public.crops FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own crops, admin/staff can update all" ON public.crops FOR UPDATE USING (
  created_by = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Admin can delete crops" ON public.crops FOR DELETE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS: Livestock
CREATE POLICY "Admin and staff can view all livestock" ON public.livestock FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') OR created_by = auth.uid()
);
CREATE POLICY "Users can create livestock" ON public.livestock FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own livestock, admin/staff can update all" ON public.livestock FOR UPDATE USING (
  created_by = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Admin can delete livestock" ON public.livestock FOR DELETE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS: Equipment
CREATE POLICY "Admin and staff can view all equipment" ON public.equipment FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') OR assigned_to = auth.uid()
);
CREATE POLICY "Admin and staff can manage equipment" ON public.equipment FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- RLS: Inventory
CREATE POLICY "All authenticated users can view inventory" ON public.inventory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin and staff can manage inventory" ON public.inventory FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- RLS: Sales
CREATE POLICY "Admin and staff can view all sales" ON public.sales FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') OR created_by = auth.uid()
);
CREATE POLICY "Users can create sales" ON public.sales FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own sales, admin/staff can update all" ON public.sales FOR UPDATE USING (
  created_by = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Admin can delete sales" ON public.sales FOR DELETE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS: Purchases
CREATE POLICY "Admin and staff can view all purchases" ON public.purchases FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') OR created_by = auth.uid()
);
CREATE POLICY "Admin and staff can manage purchases" ON public.purchases FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- RLS: Reports
CREATE POLICY "All authenticated users can view reports" ON public.reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin and staff can manage reports" ON public.reports FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- RLS: Tasks
CREATE POLICY "Users can view tasks they created or admin/staff can view all" ON public.tasks FOR SELECT USING (
  created_by = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own tasks, admin/staff can update all" ON public.tasks FOR UPDATE USING (
  created_by = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Admin can delete tasks" ON public.tasks FOR DELETE USING (public.get_user_role(auth.uid()) = 'admin');

-- Trigger function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON public.crops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_livestock_updated_at BEFORE UPDATE ON public.livestock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SECURITY FIX: Auto-create profile on signup with hardcoded 'farmer' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    'farmer'::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inventory triggers
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_type = 'crop' THEN
    UPDATE public.inventory
    SET quantity = quantity - NEW.quantity, last_updated = now()
    WHERE item_name = NEW.product_name AND quantity >= NEW.quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient inventory for product: %', NEW.product_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_inventory_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_sale();

CREATE OR REPLACE FUNCTION public.update_inventory_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory (item_name, category, quantity, unit, unit_cost, supplier, created_by)
  VALUES (NEW.item_name, NEW.category, NEW.quantity, NEW.unit, NEW.unit_cost, NEW.supplier, NEW.created_by)
  ON CONFLICT (item_name) 
  DO UPDATE SET
    quantity = inventory.quantity + NEW.quantity,
    unit_cost = NEW.unit_cost,
    supplier = NEW.supplier,
    last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_inventory_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_purchase();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('farm-documents', 'farm-documents', false),
  ('crop-images', 'crop-images', true),
  ('livestock-images', 'livestock-images', true),
  ('receipts', 'receipts', false);

-- Storage policies
CREATE POLICY "Authenticated users can view farm documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'farm-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Admin and staff can upload farm documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'farm-documents' AND public.get_user_role(auth.uid()) IN ('admin', 'staff'));
CREATE POLICY "Anyone can view crop images" ON storage.objects FOR SELECT USING (bucket_id = 'crop-images');
CREATE POLICY "Authenticated users can upload crop images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'crop-images' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view livestock images" ON storage.objects FOR SELECT USING (bucket_id = 'livestock-images');
CREATE POLICY "Authenticated users can upload livestock images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'livestock-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can view their own receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.get_user_role(auth.uid()) IN ('admin', 'staff')));
CREATE POLICY "Users can upload their own receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Real-time for inventory
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;

-- Indexes
CREATE INDEX idx_crops_created_by ON public.crops(created_by);
CREATE INDEX idx_livestock_created_by ON public.livestock(created_by);
CREATE INDEX idx_sales_product_type ON public.sales(product_type);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX idx_purchases_purchase_date ON public.purchases(purchase_date);
CREATE INDEX idx_inventory_category ON public.inventory(category);
CREATE INDEX idx_profiles_role ON public.profiles(role);