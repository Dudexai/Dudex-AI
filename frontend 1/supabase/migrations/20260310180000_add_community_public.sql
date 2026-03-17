-- Add is_community_public flag to publish startups to community explicitly
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS is_community_public BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policy to allow reading public startups universally
DROP POLICY IF EXISTS "Members can view their startups" ON public.startups;

CREATE POLICY "Community visibility for startups"
ON public.startups FOR SELECT
USING (
    is_community_public = true 
    OR 
    public.is_startup_member(auth.uid(), id)
);
