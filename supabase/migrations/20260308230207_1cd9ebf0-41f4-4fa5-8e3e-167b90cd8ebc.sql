
-- 1. Create farms table
CREATE TABLE public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  slogan text NOT NULL DEFAULT '',
  logo_url text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- 2. Create farm_members table
CREATE TABLE public.farm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(farm_id, user_id)
);

ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;

-- 3. Add farm_id to all data tables (nullable initially)
ALTER TABLE public.crops ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.livestock ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.purchases ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.inventory ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.equipment ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;

-- 4. Security definer function to check farm membership
CREATE OR REPLACE FUNCTION public.is_farm_member(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_members
    WHERE user_id = _user_id AND farm_id = _farm_id
  );
$$;

-- 5. Security definer function to check farm ownership
CREATE OR REPLACE FUNCTION public.is_farm_owner(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = _farm_id AND owner_id = _user_id
  );
$$;

-- 6. RLS policies for farms
CREATE POLICY "Users can view farms they are members of"
  ON public.farms FOR SELECT
  TO authenticated
  USING (is_farm_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Users can create farms"
  ON public.farms FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their farms"
  ON public.farms FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their farms"
  ON public.farms FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 7. RLS policies for farm_members
CREATE POLICY "Members can view farm members"
  ON public.farm_members FOR SELECT
  TO authenticated
  USING (is_farm_member(auth.uid(), farm_id) OR is_farm_owner(auth.uid(), farm_id));

CREATE POLICY "Farm owners can manage members"
  ON public.farm_members FOR ALL
  TO authenticated
  USING (is_farm_owner(auth.uid(), farm_id));

CREATE POLICY "Users can insert themselves as members"
  ON public.farm_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. Trigger to auto-add owner as member when farm is created
CREATE OR REPLACE FUNCTION public.add_farm_owner_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.farm_members (farm_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_farm_created
  AFTER INSERT ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.add_farm_owner_as_member();

-- 9. Auto-create a default farm for existing users on first login
-- We'll handle this in application code instead

-- 10. Updated_at trigger for farms
CREATE TRIGGER update_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
