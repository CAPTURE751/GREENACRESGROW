-- Receipts bucket: full, explicit, authenticated-only policy set
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;

CREATE POLICY "Receipts: owners upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Receipts: owners and admin staff read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])
  )
);

CREATE POLICY "Receipts: owners and admin staff update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])
  )
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])
  )
);

CREATE POLICY "Receipts: owners and admin staff delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])
  )
);