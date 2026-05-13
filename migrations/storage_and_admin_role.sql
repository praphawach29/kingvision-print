-- ================================================================
-- 1. Create storage bucket policies for "products" bucket
--    (Create the bucket manually in Supabase Dashboard first:
--     Storage → New bucket → name: "products" → Public: ON)
-- ================================================================

-- Allow admin users to upload product images
CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow admin users to update/replace product images
CREATE POLICY "Admin can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow admin users to delete product images
CREATE POLICY "Admin can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow public read access for product images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- ================================================================
-- 2. Create storage bucket policies for "payment-slips" bucket
--    (Create the bucket manually too: name: "payment-slips" → Public: ON)
-- ================================================================

CREATE POLICY "Authenticated users can upload payment slips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "Public can view payment slips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-slips');

CREATE POLICY "Admin can delete payment slips"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-slips'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- ================================================================
-- 3. Grant admin role to owner account
--    Replace the email below with your actual account email
-- ================================================================

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'praphawach@gmail.com'
);

-- Verify (should return 1 row with role = 'admin')
SELECT u.email, p.role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'praphawach@gmail.com';
