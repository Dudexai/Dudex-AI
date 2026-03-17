-- ==========================================
-- PHASE 5: STORAGE BUCKETS
-- ==========================================

-- 1. Create a bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars (Publicly readable, Users can upload/update/delete their own)
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar." 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can update their own avatar."
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Anyone can delete their own avatar."
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid() = owner);


-- 2. Create a private bucket for vault files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for vault (Authenticated users only, strictly scoped by RLS)
CREATE POLICY "Authenticated users can upload vault files" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'vault' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can view their own vault files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vault' AND auth.uid() = owner );

CREATE POLICY "Users can update their own vault files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'vault' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own vault files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'vault' AND auth.uid() = owner );
