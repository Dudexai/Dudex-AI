import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export const MeetingNotifier = () => {
    const { user } = useAuth();
    const { activeStartup } = useStartup();
    const { toast } = useToast();
    const notifiedMeetings = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!user || !activeStartup) return;

        const checkMeetings = async () => {
            const { data } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('startup_id', activeStartup.id)
                .eq('event_type', 'meeting')
                .eq('status', 'Scheduled');

            if (data) {
                const now = new Date();
                
                data.forEach((meeting: any) => {
                    if (notifiedMeetings.current.has(meeting.id)) return;

                    const [hours, minutes] = meeting.event_time.split(':').map(Number);
                    // meeting.event_month is 0-indexed as inserted in Meetings.tsx
                    const meetingDate = new Date(meeting.event_year, meeting.event_month, meeting.event_day, hours, minutes);
                    
                    const diffMinutes = (meetingDate.getTime() - now.getTime()) / (1000 * 60);

                    // Notify if meeting is exactly now or within the next 10 minutes
                    if (diffMinutes >= 0 && diffMinutes <= 10) {
                        toast({
                            title: "🚀 Meeting Starting Soon!",
                            description: `${meeting.title} is starting in ${Math.round(diffMinutes)} minutes.`,
                            duration: 15000,
                            action: meeting.link_or_poster ? (
                                <Button 
                                    variant="outline"
                                    onClick={() => window.open(meeting.link_or_poster, '_blank')}>
                                    Join Call
                                </Button>
                            ) : undefined
                        });
                        
                        notifiedMeetings.current.add(meeting.id);
                    }
                });
            }
        };

        checkMeetings();
        const interval = setInterval(checkMeetings, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [user, activeStartup, toast]);

    return null;
};
