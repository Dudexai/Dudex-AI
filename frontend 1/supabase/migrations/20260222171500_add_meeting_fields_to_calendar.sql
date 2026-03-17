ALTER TABLE public.calendar_events
ADD COLUMN status TEXT DEFAULT 'Scheduled',
ADD COLUMN attendees JSONB DEFAULT '[]'::jsonb,
ADD COLUMN meeting_format TEXT DEFAULT 'video';
