-- ============================================
-- FIX: Content Storage Bucket Policies
-- ============================================

-- Create storage bucket if it doesn't exist (public bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('content', 'content', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can upload content" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view content" ON storage.objects;
DROP POLICY IF EXISTS "Creators can upload content" ON storage.objects;
DROP POLICY IF EXISTS "Public content access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can upload to their own folder in content bucket
CREATE POLICY "Authenticated users can upload to content bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view files in content bucket (public bucket)
CREATE POLICY "Public can view content bucket files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content');

-- Policy: Users can update their own files
CREATE POLICY "Users can update own content files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own content files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
