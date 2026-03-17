-- Phase G: Complete Database Schema for DudexAI Multi-Startup Platform

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('founder', 'co_founder', 'team_member', 'viewer');

-- Create user_roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    startup_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, startup_id)
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    location TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organizations table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create startups table
CREATE TABLE public.startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    vision TEXT,
    description TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key to user_roles after startups exists
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_startup_id_fkey 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

-- Create organization_members table
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id)
);

-- Create invites table
CREATE TABLE public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'team_member',
    token TEXT NOT NULL UNIQUE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted BOOLEAN NOT NULL DEFAULT false,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vault_items table
CREATE TABLE public.vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'credential',
    encrypted_value TEXT,
    url TEXT,
    notes TEXT,
    is_personal BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_startup_id ON public.user_roles(startup_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_startups_org_id ON public.startups(organization_id);
CREATE INDEX idx_tasks_startup_id ON public.tasks(startup_id);
CREATE INDEX idx_vault_items_startup_id ON public.vault_items(startup_id);
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_organizations_code ON public.organizations(code);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has role in startup
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _startup_id UUID, _role app_role)
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
          AND role = _role
    )
$$;

-- Function to check if user is member of startup (any role)
CREATE OR REPLACE FUNCTION public.is_startup_member(_user_id UUID, _startup_id UUID)
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
    )
$$;

-- Function to check if user is founder or co-founder
CREATE OR REPLACE FUNCTION public.is_founder_or_cofounder(_user_id UUID, _startup_id UUID)
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
          AND role IN ('founder', 'co_founder')
    )
$$;

-- Function to generate org code
CREATE OR REPLACE FUNCTION public.generate_org_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := 'DDX-';
    i INTEGER;
BEGIN
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Organizations RLS policies
CREATE POLICY "Members can view their organizations"
ON public.organizations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = organizations.id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Founders can update their organizations"
ON public.organizations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.startups s
        JOIN public.user_roles ur ON ur.startup_id = s.id
        WHERE s.organization_id = organizations.id
        AND ur.user_id = auth.uid()
        AND ur.role = 'founder'
    )
);

-- Startups RLS policies
CREATE POLICY "Members can view their startups"
ON public.startups FOR SELECT
USING (public.is_startup_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create startups"
ON public.startups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Founders can update startups"
ON public.startups FOR UPDATE
USING (public.has_role(auth.uid(), id, 'founder'));

CREATE POLICY "Founders can delete startups"
ON public.startups FOR DELETE
USING (public.has_role(auth.uid(), id, 'founder'));

-- Organization members RLS policies
CREATE POLICY "Members can view organization members"
ON public.organization_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
);

CREATE POLICY "Can insert organization membership"
ON public.organization_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User roles RLS policies
CREATE POLICY "Members can view roles in their startups"
ON public.user_roles FOR SELECT
USING (public.is_startup_member(auth.uid(), startup_id));

CREATE POLICY "Founders/co-founders can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (
    public.is_founder_or_cofounder(auth.uid(), startup_id)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE startup_id = user_roles.startup_id)
);

CREATE POLICY "Founders can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), startup_id, 'founder'));

CREATE POLICY "Founders can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), startup_id, 'founder'));

-- Invites RLS policies
CREATE POLICY "Founders/co-founders can view invites"
ON public.invites FOR SELECT
USING (public.is_founder_or_cofounder(auth.uid(), startup_id));

CREATE POLICY "Founders/co-founders can create invites"
ON public.invites FOR INSERT
WITH CHECK (public.is_founder_or_cofounder(auth.uid(), startup_id));

CREATE POLICY "Anyone can view invite by token"
ON public.invites FOR SELECT
USING (true);

CREATE POLICY "Users can update invites they accept"
ON public.invites FOR UPDATE
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Tasks RLS policies
CREATE POLICY "Members can view tasks"
ON public.tasks FOR SELECT
USING (public.is_startup_member(auth.uid(), startup_id));

CREATE POLICY "Members can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (public.is_startup_member(auth.uid(), startup_id));

CREATE POLICY "Assigned users can update tasks"
ON public.tasks FOR UPDATE
USING (
    assigned_to = auth.uid()
    OR public.is_founder_or_cofounder(auth.uid(), startup_id)
);

CREATE POLICY "Founders can delete tasks"
ON public.tasks FOR DELETE
USING (public.is_founder_or_cofounder(auth.uid(), startup_id));

-- Vault items RLS policies
CREATE POLICY "Users can view their own vault items"
ON public.vault_items FOR SELECT
USING (
    (is_personal = true AND user_id = auth.uid())
    OR (is_personal = false AND public.is_startup_member(auth.uid(), startup_id))
);

CREATE POLICY "Users can create vault items"
ON public.vault_items FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_startup_member(auth.uid(), startup_id));

CREATE POLICY "Users can update their vault items"
ON public.vault_items FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their vault items"
ON public.vault_items FOR DELETE
USING (user_id = auth.uid());

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_startups_updated_at
    BEFORE UPDATE ON public.startups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vault_items_updated_at
    BEFORE UPDATE ON public.vault_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();