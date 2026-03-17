-- Migration to allow founders, co_founders, and team_members to update startups (e.g. to save task progress)

-- Function to check if user has permission to update startup
CREATE OR REPLACE FUNCTION public.can_update_startup(_user_id UUID, _startup_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND startup_id = _startup_id
          AND role IN ('founder', 'co_founder', 'team_member')
    )
$$;

DROP POLICY IF EXISTS "Founders can update startups" ON public.startups;

CREATE POLICY "Authorized members can update startups"
ON public.startups FOR UPDATE
USING (public.can_update_startup(auth.uid(), id));
