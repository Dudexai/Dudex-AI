-- Migration to add fields replacing LocalStorage

-- Add fields to startups table
ALTER TABLE public.startups
ADD COLUMN plan_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN progress JSONB DEFAULT '{}'::jsonb;

-- Add fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN notes TEXT,
ADD COLUMN guide_data JSONB;
