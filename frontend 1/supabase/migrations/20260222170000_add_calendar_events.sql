CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_day INTEGER NOT NULL,
    event_month INTEGER NOT NULL,
    event_year INTEGER NOT NULL,
    event_time TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'meeting',
    visibility TEXT NOT NULL DEFAULT 'team',
    description TEXT,
    link_or_poster TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team events for their startup or global events" ON public.calendar_events
    FOR SELECT USING (
        visibility = 'global' OR 
        startup_id IN (
            SELECT startup_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert events for their startup" ON public.calendar_events
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT startup_id FROM public.user_roles WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own events" ON public.calendar_events
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own events" ON public.calendar_events
    FOR DELETE USING (user_id = auth.uid());
