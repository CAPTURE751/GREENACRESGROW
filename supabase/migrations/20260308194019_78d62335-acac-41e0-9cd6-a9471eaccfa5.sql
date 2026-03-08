
-- Farm settings table (single row for the farm)
CREATE TABLE public.farm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_name text NOT NULL DEFAULT 'JEFF TRICKS FARM LTD',
  owner_name text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT 'Nyeri, Kenya',
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "All authenticated users can view farm settings"
  ON public.farm_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can update
CREATE POLICY "Admin can update farm settings"
  ON public.farm_settings FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Only admin can insert
CREATE POLICY "Admin can insert farm settings"
  ON public.farm_settings FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Insert default row
INSERT INTO public.farm_settings (farm_name, owner_name, location)
VALUES ('JEFF TRICKS FARM LTD', '', 'Nyeri, Kenya');

-- Create storage bucket for farm logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-logo', 'farm-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read farm logo
CREATE POLICY "Anyone can view farm logo"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'farm-logo');

-- Allow admin to upload farm logo
CREATE POLICY "Admin can upload farm logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'farm-logo' AND (SELECT get_user_role(auth.uid()) = 'admin'::user_role));

-- Allow admin to update farm logo
CREATE POLICY "Admin can update farm logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'farm-logo' AND (SELECT get_user_role(auth.uid()) = 'admin'::user_role));

-- Allow admin to delete farm logo
CREATE POLICY "Admin can delete farm logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'farm-logo' AND (SELECT get_user_role(auth.uid()) = 'admin'::user_role));
