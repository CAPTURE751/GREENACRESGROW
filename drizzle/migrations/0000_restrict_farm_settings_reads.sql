DROP POLICY IF EXISTS "All authenticated users can view farm settings" ON public.farm_settings;
CREATE POLICY "Admins can view farm settings"
ON public.farm_settings
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);