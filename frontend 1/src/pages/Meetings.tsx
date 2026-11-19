import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  Users,
  Video,
  Plus,
  CheckCircle2,
  Circle,
  Mail,
  X,
  Check,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/context/TeamContext";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { useEffect } from "react";

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: string[];
  status: "Scheduled" | "Completed";
  type: "video" | "in-person";
  link: string | null;
}

const Meetings = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    date: "",
    time: "",
  });
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const { members } = useTeam();
  const { user } = useAuth();
  const { activeStartup } = useStartup();

  const [isLoading, setIsLoading] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (!user || !activeStartup) return;

    const fetchMeetings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('startup_id', activeStartup.id)
        .eq('event_type', 'meeting')
        .order('event_year', { ascending: false })
        .order('event_month', { ascending: false })
        .order('event_day', { ascending: false });

      if (!error && data) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const updatedMeetings: Meeting[] = [];

        for (const e of data) {
           const [hours, minutes] = (e.event_time || "00:00").split(':').map(Number);
           const meetingDate = new Date(e.event_year, e.event_month, e.event_day, hours, minutes);
           
           let currentStatus = e.status || "Scheduled";

           // If meeting has passed, auto-complete
           if (meetingDate < now && currentStatus === "Scheduled") {
               currentStatus = "Completed";
               // Fire and forget DB update
               supabase.from('calendar_events').update({ status: 'Completed' }).eq('id', e.id).then();
           }

           // If meeting was more than 48 hours (2 days) ago, hide it completely
           const isOlderThanTwoDays = now.getTime() - meetingDate.getTime() > 2 * 24 * 60 * 60 * 1000;
           if (isOlderThanTwoDays) {
               continue;
           }

           updatedMeetings.push({
            id: e.id,
            title: e.title,
            date: `${months[e.event_month]} ${e.event_day}, ${e.event_year}`,
            time: e.event_time,
            attendees: Array.isArray(e.attendees) ? (e.attendees as string[]) : [],
            status: currentStatus as "Scheduled" | "Completed",
            type: (e.meeting_format as "video" | "in-person") || "video",
            link: e.link_or_poster || null,
           });
        }
        setMeetings(updatedMeetings);
      }
      setIsLoading(false);
    };

    fetchMeetings();
  }, [user, activeStartup]);

  const handleScheduleMeeting = async () => {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.time || !user || !activeStartup) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const meetingDateTime = new Date(`${newMeeting.date}T${newMeeting.time}:00`);
    if (meetingDateTime < new Date()) {
      toast({
        title: "Invalid Time",
        description: "Cannot schedule a meeting in the past.",
        variant: "destructive",
      });
      return;
    }

    // Handle exact local date instead of problematic UTC midnight parsing
    const [yearStr, monthStr, dayStr] = newMeeting.date.split("-");
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed month
    const year = parseInt(yearStr, 10);

    const meetId = Math.random().toString(36).substring(2, 10);
    const jitsiLink = `https://meet.jit.si/DudexAI-${meetId}`;

    const { data: inserted, error } = await supabase
      .from('calendar_events')
      .insert({
        title: newMeeting.title,
        event_day: day,
        event_month: month,
        event_year: year,
        event_time: newMeeting.time,
        event_type: "meeting",
        visibility: "team",
        attendees: selectedAttendees,
        status: "Scheduled",
        meeting_format: "video",
        link_or_poster: jitsiLink,
        startup_id: activeStartup.id,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
       return;
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const meeting: Meeting = {
      id: inserted.id,
      title: inserted.title,
      date: `${months[inserted.event_month]} ${inserted.event_day}, ${inserted.event_year}`,
      time: inserted.event_time,
      attendees: Array.isArray(inserted.attendees) ? (inserted.attendees as unknown as string[]) : [],
      status: "Scheduled",
      type: "video",
      link: jitsiLink
    };

    setMeetings([meeting, ...meetings]);
    setNewMeeting({ title: "", date: "", time: "" });
    setShowForm(false);

    // Trigger automated backend invite
    if (selectedAttendees.length > 0) {
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/send-meeting-invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendees: selectedAttendees,
                    title: meeting.title,
                    date: meeting.date,
                    time: meeting.time,
                    link: jitsiLink,
                    inviter_email: user.email || "No Reply",
                    inviter_name: user?.user_metadata?.full_name || "",
                    startup_name: activeStartup.name || "",
                })
            });
        } catch (e) {
            console.error("Failed to blast meeting invites:", e);
            toast({ title: "Email Error", description: "Meeting scheduled but emails failed to send.", variant: "destructive" });
        }
    }
    
    setSelectedAttendees([]);

    toast({
      title: "Meeting Scheduled",
      description: `Invitations have been drafted for ${selectedAttendees.length} attendees with Jitsi link!`,
    });
  };

  const scheduledMeetings = meetings.filter(m => m.status === "Scheduled");
  const completedMeetings = meetings.filter(m => m.status === "Completed");

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/organization" />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader
          title="Meetings"
          subtitle="Schedule and track your meetings"
          showBack={false}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Schedule Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 animate-fade-in opacity-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Schedule Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showForm ? (
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => setShowForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Meeting
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Meeting Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Team Standup"
                        value={newMeeting.title}
                        onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                        value={newMeeting.date}
                        onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newMeeting.time}
                        onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Attendees</Label>
                      <div className="max-h-40 overflow-y-auto border rounded-xl p-3 space-y-2 bg-background/50 custom-scrollbar">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={selectedAttendees.includes(member.email)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAttendees([...selectedAttendees, member.email]);
                                } else {
                                  setSelectedAttendees(selectedAttendees.filter(e => e !== member.email));
                                }
                              }}
                            />
                            <label
                              htmlFor={`member-${member.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {member.full_name} ({member.email})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="hero"
                        className="flex-1"
                        onClick={handleScheduleMeeting}
                      >
                        Schedule
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Auto Invitations</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email invitations are automatically sent to all attendees when you schedule a meeting.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meetings List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scheduled */}
            <Card className="animate-fade-in-up opacity-0 stagger-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Scheduled ({scheduledMeetings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                <div className="space-y-4">
                  {scheduledMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center gap-4 rounded-xl border border-border/50 bg-background p-4 hover:border-primary/30 transition-colors"
                    >
                      <div className="rounded-xl bg-primary/10 p-3">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{meeting.title}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {meeting.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {meeting.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.attendees.length} attendees
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <Circle className="h-2 w-2 fill-current" />
                            {meeting.status}
                          </span>
                          {meeting.link && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(meeting.link || '', '_blank')}>
                                Join Meeting
                              </Button>
                          )}
                      </div>
                    </div>
                  ))}
                  {scheduledMeetings.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No scheduled meetings. Create one to get started!
                    </p>
                  )}
                </div>
                )}
              </CardContent>
            </Card>

            {/* Completed */}
            <Card className="animate-fade-in-up opacity-0 stagger-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Completed ({completedMeetings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                <div className="space-y-4">
                  {completedMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center gap-4 rounded-xl border border-border/50 bg-background/50 p-4"
                    >
                      <div className="rounded-xl bg-secondary p-3">
                        <Video className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{meeting.title}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {meeting.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {meeting.time}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        {meeting.status}
                      </span>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meetings;
