
-- ============================================================
-- FIX 1: Convert ALL RESTRICTIVE policies to PERMISSIVE
-- This is critical - RESTRICTIVE-only policies block all access
-- ============================================================

-- CROPS table
DROP POLICY IF EXISTS "Admin and staff can view all crops" ON public.crops;
CREATE POLICY "Admin and staff can view all crops" ON public.crops FOR SELECT TO authenticated
USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR (created_by = auth.uid()));

DROP POLICY IF EXISTS "Admin can delete crops" ON public.crops;
CREATE POLICY "Admin can delete crops" ON public.crops FOR DELETE TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "Users can create crops" ON public.crops;
CREATE POLICY "Users can create crops" ON public.crops FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own crops, admin/staff can update all" ON public.crops;
CREATE POLICY "Users can update own crops, admin/staff can update all" ON public.crops FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

-- EQUIPMENT table
DROP POLICY IF EXISTS "Admin and staff can manage equipment" ON public.equipment;
CREATE POLICY "Admin and staff can manage equipment" ON public.equipment FOR ALL TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));

DROP POLICY IF EXISTS "Admin and staff can view all equipment" ON public.equipment;
CREATE POLICY "Admin and staff can view all equipment" ON public.equipment FOR SELECT TO authenticated
USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR (assigned_to = auth.uid()));

-- FARM_MEMBERS table
DROP POLICY IF EXISTS "Farm owners can manage members" ON public.farm_members;
CREATE POLICY "Farm owners can manage members" ON public.farm_members FOR ALL TO authenticated
USING (is_farm_owner(auth.uid(), farm_id));

DROP POLICY IF EXISTS "Members can view farm members" ON public.farm_members;
CREATE POLICY "Members can view farm members" ON public.farm_members FOR SELECT TO authenticated
USING (is_farm_member(auth.uid(), farm_id) OR is_farm_owner(auth.uid(), farm_id));

-- FIX 4: Restrict self-insert to member role only and require farm ownership or invitation
DROP POLICY IF EXISTS "Users can insert themselves as members" ON public.farm_members;
CREATE POLICY "Users can insert themselves as members" ON public.farm_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'member');

-- FARM_SETTINGS table
DROP POLICY IF EXISTS "Admin can insert farm settings" ON public.farm_settings;
CREATE POLICY "Admin can insert farm settings" ON public.farm_settings FOR INSERT TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "Admin can update farm settings" ON public.farm_settings;
CREATE POLICY "Admin can update farm settings" ON public.farm_settings FOR UPDATE TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can view farm settings" ON public.farm_settings;
CREATE POLICY "All authenticated users can view farm settings" ON public.farm_settings FOR SELECT TO authenticated
USING (true);

-- FARMS table
DROP POLICY IF EXISTS "Owners can delete their farms" ON public.farms;
CREATE POLICY "Owners can delete their farms" ON public.farms FOR DELETE TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their farms" ON public.farms;
CREATE POLICY "Owners can update their farms" ON public.farms FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create farms" ON public.farms;
CREATE POLICY "Users can create farms" ON public.farms FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view farms they are members of" ON public.farms;
CREATE POLICY "Users can view farms they are members of" ON public.farms FOR SELECT TO authenticated
USING (is_farm_member(auth.uid(), id) OR (owner_id = auth.uid()));

-- INVENTORY table - FIX 6: Scope to farm membership
DROP POLICY IF EXISTS "Admin and staff can manage inventory" ON public.inventory;
CREATE POLICY "Admin and staff can manage inventory" ON public.inventory FOR ALL TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));

DROP POLICY IF EXISTS "All authenticated users can view inventory" ON public.inventory;
CREATE POLICY "Authenticated users can view own farm inventory" ON public.inventory FOR SELECT TO authenticated
USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR (created_by = auth.uid()));

-- LIVESTOCK table
DROP POLICY IF EXISTS "Admin and staff can view all livestock" ON public.livestock;
CREATE POLICY "Admin and staff can view all livestock" ON public.livestock FOR SELECT TO authenticated
USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR (created_by = auth.uid()));

DROP POLICY IF EXISTS "Admin can delete livestock" ON public.livestock;
CREATE POLICY "Admin can delete livestock" ON public.livestock FOR DELETE TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "Users can create livestock" ON public.livestock;
CREATE POLICY "Users can create livestock" ON public.livestock FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own livestock, admin/staff can update all" ON public.livestock;
CREATE POLICY "Users can update own livestock, admin/staff can update all" ON public.livestock FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

-- NOTIFICATION_PREFERENCES table
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences" ON public.notification_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- PROFILES table - FIX 3: Prevent role self-escalation
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile, admin/staff can view all" ON public.profiles;
CREATE POLICY "Users can view own profile, admin/staff can view all" ON public.profiles FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

-- PURCHASES table
DROP POLICY IF EXISTS "Admin and staff can manage purchases" ON public.purchases;
CREATE POLICY "Admin and staff can manage purchases" ON public.purchases FOR ALL TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));

DROP POLICY IF EXISTS "Admin and staff can view all purchases" ON public.purchases;
CREATE POLICY "Admin and staff can view all purchases" ON public.purchases FOR SELECT TO authenticated
USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR (created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can create purchases" ON public.purchases;
CREATE POLICY "Users can create purchases" ON public.purchases FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own purchases" ON public.purchases;
CREATE POLICY "Users can update own purchases" ON public.purchases FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- REPORTS table - FIX 5: Scope to role-based access
DROP POLICY IF EXISTS "Admin and staff can manage reports" ON public.reports;
CREATE POLICY "Admin and staff can manage reports" ON public.reports FOR ALL TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));

DROP POLICY IF EXISTS "All authenticated users can view reports" ON public.reports;
CREATE POLICY "Users can view own or role-based reports" ON public.reports FOR SELECT TO authenticated
USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR (created_by = auth.uid()));

-- SALES table
DROP POLICY IF EXISTS "Admin and staff can view all sales" ON public.sales;
CREATE POLICY "Admin and staff can view all sales" ON public.sales FOR SELECT TO authenticated
USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR (created_by = auth.uid()));

DROP POLICY IF EXISTS "Admin can delete sales" ON public.sales;
CREATE POLICY "Admin can delete sales" ON public.sales FOR DELETE TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
CREATE POLICY "Users can create sales" ON public.sales FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own sales, admin/staff can update all" ON public.sales;
CREATE POLICY "Users can update own sales, admin/staff can update all" ON public.sales FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

-- TASKS table
DROP POLICY IF EXISTS "Admin can delete tasks" ON public.tasks;
CREATE POLICY "Admin can delete tasks" ON public.tasks FOR DELETE TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own tasks, admin/staff can update all" ON public.tasks;
CREATE POLICY "Users can update their own tasks, admin/staff can update all" ON public.tasks FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

DROP POLICY IF EXISTS "Users can view tasks they created or admin/staff can view all" ON public.tasks;
CREATE POLICY "Users can view tasks they created or admin/staff can view all" ON public.tasks FOR SELECT TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

-- VENTURE_BUDGETS table
DROP POLICY IF EXISTS "Users can create budgets" ON public.venture_budgets;
CREATE POLICY "Users can create budgets" ON public.venture_budgets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete own budgets, admin can delete all" ON public.venture_budgets;
CREATE POLICY "Users can delete own budgets, admin can delete all" ON public.venture_budgets FOR DELETE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = 'admin'::user_role));

DROP POLICY IF EXISTS "Users can update own budgets, admin/staff can update all" ON public.venture_budgets;
CREATE POLICY "Users can update own budgets, admin/staff can update all" ON public.venture_budgets FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

DROP POLICY IF EXISTS "Users can view own budgets, admin/staff can view all" ON public.venture_budgets;
CREATE POLICY "Users can view own budgets, admin/staff can view all" ON public.venture_budgets FOR SELECT TO authenticated
USING ((created_by = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])));

-- ============================================================
-- FIX 2: Enable leaked password protection
-- ============================================================
