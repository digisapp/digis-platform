# Supabase Storage Setup for Image Uploads

This guide explains how to set up Supabase Storage buckets for avatar and banner uploads.

## 1. Create Storage Buckets

Go to your Supabase dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets

### Create Avatars Bucket:
1. Click "New bucket"
2. Name: `avatars`
3. Public bucket: **Yes** (check the box)
4. Click "Create bucket"

### Create Banners Bucket:
1. Click "New bucket"
2. Name: `banners`
3. Public bucket: **Yes** (check the box)
4. Click "Create bucket"

## 2. Configure Row Level Security (RLS)

For each bucket, you need to set up policies:

### Avatars Bucket Policies:

Go to Storage → Policies → avatars

#### Policy 1: Public Read Access
- **Name**: Public read access for avatars
- **Allowed operation**: SELECT
- **Target roles**: public
- **Policy definition**:
```sql
true
```

#### Policy 2: Authenticated Upload
- **Name**: Authenticated users can upload their own avatars
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**:
```sql
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 3: Authenticated Update
- **Name**: Authenticated users can update their own avatars
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **Policy definition**:
```sql
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 4: Authenticated Delete
- **Name**: Authenticated users can delete their own avatars
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**:
```sql
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

### Banners Bucket Policies:

Repeat the same policies for the `banners` bucket (replace 'avatars' with 'banners' in the SQL).

## 3. Test the Setup

1. Go to Settings page: https://yourapp.com/settings
2. Try uploading an avatar (should see upload button)
3. Try uploading a banner
4. Verify images appear in your Supabase Storage dashboard
5. Check that images display on your profile page

## Quick Setup via SQL (Alternative)

You can also run this SQL in the Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Avatars: Public read
CREATE POLICY "Public Access for avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Avatars: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars: Authenticated users can update their own files
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars: Authenticated users can delete their own files
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Repeat for banners bucket
CREATE POLICY "Public Access for banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banners');

CREATE POLICY "Users can upload banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Troubleshooting

### "Failed to upload avatar" error:
- Check that buckets are created and marked as public
- Verify RLS policies are set up correctly
- Check browser console for detailed error messages

### Images not displaying:
- Verify the bucket is set to **public**
- Check that the URL returned by upload is accessible in a new tab
- Ensure your Supabase project URL is correct in `.env.local`

### Permission denied errors:
- Make sure the user is authenticated
- Check that the folder structure matches `{userId}/{timestamp}.{ext}`
- Verify RLS policies allow uploads for authenticated users

## File Structure

Uploaded files will be organized as:
```
avatars/
  ├── {userId}/
  │   ├── 1699564823123.jpg
  │   └── 1699565912345.png

banners/
  ├── {userId}/
  │   ├── 1699564823456.jpg
  │   └── 1699565912678.png
```

Each file is named with a timestamp to ensure cache busting and unique URLs.
