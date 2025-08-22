-- Create private bucket for CVs if it does not exist
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

-- Allow users to upload/update/delete their own avatars in the public 'avatars' bucket under developer-avatars/{userId}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = 'developer-avatars'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = 'developer-avatars'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = 'developer-avatars'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;

-- Policies for the private 'cvs' bucket under developer-cvs/{userId}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own CVs'
  ) THEN
    CREATE POLICY "Users can view their own CVs"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'cvs'
      AND (storage.foldername(name))[1] = 'developer-cvs'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own CVs'
  ) THEN
    CREATE POLICY "Users can upload their own CVs"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'cvs'
      AND (storage.foldername(name))[1] = 'developer-cvs'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own CVs'
  ) THEN
    CREATE POLICY "Users can update their own CVs"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'cvs'
      AND (storage.foldername(name))[1] = 'developer-cvs'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own CVs'
  ) THEN
    CREATE POLICY "Users can delete their own CVs"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'cvs'
      AND (storage.foldername(name))[1] = 'developer-cvs'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;