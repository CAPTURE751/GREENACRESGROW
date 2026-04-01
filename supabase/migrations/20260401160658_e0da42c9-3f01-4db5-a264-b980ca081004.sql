
-- 1. Add INSERT policy on profiles to prevent privilege escalation
-- Only allow users to insert their own profile with 'farmer' role
CREATE POLICY "Users can only insert own profile with farmer role"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'farmer'::user_role
);

-- 2. Fix farm-documents SELECT policy: restrict to admin/staff or document owner
-- First drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Admin and staff can view farm documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view farm documents" ON storage.objects;

-- Re-create scoped SELECT for farm-documents bucket
CREATE POLICY "Admin and staff can view farm documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'farm-documents'
  AND (
    (SELECT get_user_role(auth.uid())) = ANY(ARRAY['admin'::user_role, 'staff'::user_role])
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- 3. Fix farm-documents INSERT policy: change from public to authenticated
DROP POLICY IF EXISTS "Admin and staff can upload farm documents" ON storage.objects;

CREATE POLICY "Admin and staff can upload farm documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'farm-documents'
  AND (SELECT get_user_role(auth.uid())) = ANY(ARRAY['admin'::user_role, 'staff'::user_role])
);

-- 4. Fix crop-images upload: add path-based isolation
DROP POLICY IF EXISTS "Authenticated users can upload crop images" ON storage.objects;

CREATE POLICY "Authenticated users can upload crop images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'crop-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Fix livestock-images upload: add path-based isolation
DROP POLICY IF EXISTS "Authenticated users can upload livestock images" ON storage.objects;

CREATE POLICY "Authenticated users can upload livestock images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'livestock-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
