import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  FileText,
  Globe,
  Lock,
  Plus,
  Info,
  Link as LinkIcon,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CalendarEvent {
  id: string;
  date: number;
  month: number;
  year: number;
  title: string;
  type: "meeting" | "task";
  time: string;
  visibility: "team" | "global";
  creator?: string;
  description?: string;
  linkOrPoster?: string;
}

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";

const CalendarView = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeStartup } = useStartup();

  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarFilter, setCalendarFilter] = useState<"team" | "global">("global");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "",
    visibility: "team" as "team" | "global",
    description: "",
    linkOrPoster: "",
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!user || !activeStartup) return;

    const fetchEvents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
           id, event_day, event_month, event_year, title,
           event_type, event_time, visibility, description, link_or_poster,
           user_id
        `)
        .neq('event_type', 'meeting')
        .or(`visibility.eq.global,startup_id.eq.${activeStartup.id}`);

      if (!error && data) {
        // Fetch profiles separately because calendar_events foreign key points to auth.users, not public.profiles
        const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
        let profilesMap: Record<string, string> = {};
        
        if (userIds.length > 0) {
           const { data: profilesData } = await supabase
             .from('profiles')
             .select('id, full_name')
             .in('id', userIds);
             
           if (profilesData) {
             profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p.full_name]));
           }
        }

        setEvents(data.map((e: any) => ({
           id: e.id,
           date: e.event_day,
           month: e.event_month,
           year: e.event_year,
           title: e.title,
           type: e.event_type as "meeting" | "task",
           time: e.event_time,
           visibility: e.visibility as "team" | "global",
           creator: e.visibility === "global" ? "Global Community" : profilesMap[e.user_id] || "Team Member",
           description: e.description || undefined,
           linkOrPoster: e.link_or_poster || undefined
        })));
      }
      setIsLoading(false);
    };

    fetchEvents();
  }, [user, activeStartup]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    const filtered = events.filter(e =>
      e.date === day &&
      e.month === currentDate.getMonth() &&
      e.year === currentDate.getFullYear()
    );

    if (calendarFilter === "team") {
      return filtered.filter(e => e.visibility === "team");
    }
    // "global" filter shows BOTH global AND team events
    return filtered;
  };

  const handleAddEvent = async () => {
    setIsLoading(true);
    if (!newEvent.title || !newEvent.date || !newEvent.time || !activeStartup || !user) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    let finalLinkOrPoster = newEvent.linkOrPoster;

    if (posterFile) {
      const fileExt = posterFile.name.split('.').pop();
      const filePath = `posters/${activeStartup.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, posterFile);

      if (uploadError) {
        toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const { data } = supabase.storage.from('events').getPublicUrl(filePath);
      finalLinkOrPoster = data.publicUrl;
    }

    const day = parseInt(newEvent.date, 10);

    const { data: inserted, error } = await supabase
      .from('calendar_events')
      .insert({
        title: newEvent.title,
        event_day: day,
        event_month: currentDate.getMonth(),
        event_year: currentDate.getFullYear(),
        event_time: newEvent.time,
        event_type: "event",
        visibility: newEvent.visibility,
        description: newEvent.description || null,
        link_or_poster: finalLinkOrPoster || null,
        startup_id: activeStartup.id,
        user_id: user.id
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
       return;
    }

    const event: CalendarEvent = {
      id: inserted.id,
      date: inserted.event_day,
      month: inserted.event_month,
      year: inserted.event_year,
      title: inserted.title,
      type: inserted.event_type as "meeting" | "task",
      time: inserted.event_time,
      visibility: inserted.visibility as "team" | "global",
      creator: inserted.visibility === "global" ? "Your Org" : undefined,
      description: inserted.description || undefined,
      linkOrPoster: inserted.link_or_poster || undefined,
    };

    setEvents([...events, event]);
    setNewEvent({
      title: "",
      date: "",
      time: "",
      visibility: "team",
      description: "",
      linkOrPoster: ""
    });
    setPosterFile(null);
    setShowAddDialog(false);

    toast({
      title: "Event Created",
      description: `Event added to ${newEvent.visibility === "team" ? "Team Calendar" : "Global Calendar"}.`,
    });
  };

  const filteredUpcomingEvents = events
    .filter(e => {
      const eventDate = new Date(e.year, e.month, e.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today && (calendarFilter === "global" || e.visibility === "team");
    })
    .sort((a, b) => {
      const dateA = new Date(a.year, a.month, a.date).getTime();
      const dateB = new Date(b.year, b.month, b.date).getTime();
      return dateA - dateB;
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPosterFile(file);
      setNewEvent({ ...newEvent, linkOrPoster: URL.createObjectURL(file) });
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar backTo="/organization" />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader
          title="Calendar"
          subtitle="View and manage your schedule"
          showBack={false}
        />

        {/* Calendar Controls */}
        <Card className="mb-6 animate-fade-in opacity-0">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-display text-xl font-semibold text-foreground min-w-[200px] text-center">
                  {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={calendarFilter === "team" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarFilter("team")}
                  className="rounded-full px-4"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Team Calendar
                </Button>
                <Button
                  variant={calendarFilter === "global" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarFilter("global")}
                  className="rounded-full px-4"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Global Calendar
                </Button>

                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm" className="ml-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby="create-event-description">
                    <DialogHeader>
                      <DialogTitle>Create New Event</DialogTitle>
                      <p id="create-event-description" className="sr-only">Form to create a new calendar event</p>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Event Title *</Label>
                        <Input
                          placeholder="Enter event title"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Day of Month *</Label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="e.g., 15"
                            value={newEvent.date}
                            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Time *</Label>
                          <Input
                            placeholder="e.g., 2:00 PM"
                            value={newEvent.time}
                            onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Event Description</Label>
                        <textarea
                          placeholder="What is this event about?"
                          className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Event Link or Poster</Label>
                        <div className="flex flex-col gap-2">
                          <Input
                            placeholder="https://event-link.com"
                            value={newEvent.linkOrPoster}
                            onChange={(e) => setNewEvent({ ...newEvent, linkOrPoster: e.target.value })}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Or upload poster:</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="poster-upload"
                              onChange={handleFileChange}
                            />
                            <Label
                              htmlFor="poster-upload"
                              className="h-8 px-3 rounded-lg border border-[#FFE0B2] bg-[#FFF8F0] text-[#5D4037] flex items-center justify-center cursor-pointer hover:bg-[#FFF0E0] transition-colors text-xs"
                            >
                              <ImageIcon className="h-3 w-3 mr-1.5" />
                              Choose File
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Event Visibility</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={newEvent.visibility === "team" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNewEvent({ ...newEvent, visibility: "team" })}
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Team Calendar
                          </Button>
                          <Button
                            variant={newEvent.visibility === "global" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNewEvent({ ...newEvent, visibility: "global" })}
                          >
                            <Globe className="h-4 w-4 mr-1" />
                            Global Calendar
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Global events are visible to all startups on the platform
                        </p>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                        <Button variant="hero" onClick={handleAddEvent}>
                          Create Event
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 animate-fade-in opacity-0 stagger-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Team Calendar</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-5 gap-1 border-primary/50">
              <Globe className="h-3 w-3" />
              Global Calendar
            </Badge>
            <span className="text-sm text-muted-foreground">Visible to everyone</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <Card className="animate-fade-in-up opacity-0 stagger-1">
              <CardContent className="p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-12">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    return (
                      <div
                        key={index}
                        className={`min-h-[100px] rounded-lg border border-border/50 p-2 transition-colors ${day ? "bg-card hover:border-primary/30 cursor-pointer" : "bg-transparent border-transparent"
                          }`}
                        onClick={() => {
                          if (day) {
                            const firstEvent = dayEvents[0];
                            if (firstEvent) setSelectedEvent(firstEvent);
                          }
                        }}
                      >
                        {day && (
                          <>
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${day === new Date().getDate() &&
                              currentDate.getMonth() === new Date().getMonth() &&
                              currentDate.getFullYear() === new Date().getFullYear()
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-foreground"
                              }`}>
                              {day}
                            </span>
                            <div className="mt-1 space-y-1">
                              {dayEvents.slice(0, 3).map((event, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                  }}
                                  className={`rounded px-1.5 py-0.5 text-xs truncate flex items-center gap-1 ${event.visibility === "global"
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : event.type === "meeting"
                                      ? "bg-primary/10 text-primary"
                                      : "bg-secondary text-secondary-foreground"
                                    }`}
                                >
                                  {event.visibility === "global" && <Globe className="h-2.5 w-2.5" />}
                                  <span className="truncate">{event.title}</span>
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[10px] text-muted-foreground block text-center">
                                  +{dayEvents.length - 3} more
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 animate-fade-in-up opacity-0 stagger-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Upcoming
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {calendarFilter.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {filteredUpcomingEvents.length > 0 ? (
                  filteredUpcomingEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3 group transition-all hover:shadow-md cursor-pointer ${event.visibility === "global"
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/50 bg-background"
                        }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {event.visibility === "global" ? (
                            <Globe className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Users className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            {months[event.month]} {event.date}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-semibold text-sm text-foreground line-clamp-1">{event.title}</p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {event.time}
                        </div>
                        {event.visibility === "global" && (
                          <Badge variant="outline" className="text-[8px] h-4 py-0 border-primary/30 text-primary">
                            GLOBAL
                          </Badge>
                        )}
                      </div>
                      
                      {event.linkOrPoster && (event.linkOrPoster.includes('supabase') || event.linkOrPoster.startsWith('data:') || event.linkOrPoster.startsWith('blob:')) && (
                        <div className="mt-3 h-24 w-full rounded-lg overflow-hidden border border-border/50">
                          <img src={event.linkOrPoster} alt="Poster" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No upcoming events</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent aria-describedby="event-details-description" className="sm:max-w-[450px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogTitle className="sr-only">Event Details</DialogTitle>
          <p id="event-details-description" className="sr-only">Event details modal</p>
          {selectedEvent?.linkOrPoster && (selectedEvent.linkOrPoster.startsWith('data:') || selectedEvent.linkOrPoster.startsWith('blob:') || selectedEvent.linkOrPoster.includes('image')) ? (
            <div className="relative h-48 w-full">
              <img src={selectedEvent.linkOrPoster} alt="Poster" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur-sm mb-2">
                  {selectedEvent.visibility === "global" ? "Global Calendar" : "Team Calendar"}
                </Badge>
                <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
              </div>
            </div>
          ) : (
            <div className="bg-primary/10 p-6">
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 mb-2">
                {selectedEvent?.visibility === "global" ? "Global Calendar" : "Team Calendar"}
              </Badge>
              <h2 className="text-2xl font-bold text-primary">{selectedEvent?.title}</h2>
            </div>
          )}

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-[#5D4037] bg-[#FFF0E0] px-3 py-1.5 rounded-lg border border-[#FFE0B2]">
                <CalendarIcon className="h-4 w-4" />
                {selectedEvent && `${months[selectedEvent.month]} ${selectedEvent.date}, ${selectedEvent.year}`}
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <Clock className="h-4 w-4" />
                {selectedEvent?.time}
              </div>
            </div>

            {selectedEvent?.description && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Description
                </Label>
                <div className="text-sm text-[#3E2723] leading-relaxed bg-[#FDF8F3] p-4 rounded-xl border border-dashed border-[#FFE0B2]">
                  {selectedEvent.description}
                </div>
              </div>
            )}

            {selectedEvent?.creator && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>Organized by <span className="font-semibold text-primary">{selectedEvent.creator}</span></span>
              </div>
            )}

            {selectedEvent?.linkOrPoster && !selectedEvent.linkOrPoster.startsWith('data:') && !selectedEvent.linkOrPoster.startsWith('blob:') && (
              <div className="pt-2">
                <Button asChild variant="hero" className="w-full rounded-xl">
                  <a href={selectedEvent.linkOrPoster.startsWith('http') ? selectedEvent.linkOrPoster : `https://${selectedEvent.linkOrPoster}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Event / Open Link
                  </a>
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 flex justify-end">
            <Button variant="outline" onClick={() => setSelectedEvent(null)} className="rounded-xl">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;