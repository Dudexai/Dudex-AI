import { useState } from "react";
import { usePlan, DayPlan, Task } from "@/context/PlanContext";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useStartup } from "@/hooks/useStartup";
import {
  BookOpen,
  Code,
  Rocket,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  Calendar as CalendarIcon,
  List,
  Flame,
  Trophy,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Plans = () => {
  const { plan, updateTaskStatus, markDayComplete } = usePlan();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const { activeStartup } = useStartup();

  const isFounderOrCoFounder = activeStartup?.userRole === "founder" || activeStartup?.userRole === "co_founder";


  if (!plan) return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <Rocket className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold">No Active Plan</h2>
      <p className="text-muted-foreground max-w-md">You haven't created a startup plan yet. Use the Story Intake to generate your roadmap.</p>
      <Button onClick={() => navigate("/story-intake")}>Create Startup Plan</Button>
    </div>
  );

  const getPhaseIcon = (phaseName: string) => {
    switch (phaseName) {
      case "Validation": return BookOpen;
      case "Build": return Code;
      case "Launch": return Rocket;
      default: return Circle;
    }
  };

  const getPhaseColor = (phaseName: string) => {
    switch (phaseName) {
      case "Validation": return "text-blue-500 bg-blue-50 border-blue-100";
      case "Build": return "text-purple-500 bg-purple-50 border-purple-100";
      case "Launch": return "text-green-500 bg-green-50 border-green-100";
      default: return "text-gray-500 bg-gray-50 border-gray-100";
    }
  };

  const handleTaskToggle = (taskId: string, currentStatus: string) => {
    if (!isFounderOrCoFounder) {
      toast({
        title: "Access Denied",
        description: "Only Founders and Co-founders can mark tasks as complete.",
        variant: "destructive",
      });
      return;
    }
    if (currentStatus === "locked") {
      toast({
        title: "Task Locked",
        description: "Please complete previous tasks first to unlock this step.",
        variant: "destructive",
      });
      return;
    }
    const newStatus = currentStatus === "completed" ? "available" : "completed";
    updateTaskStatus(taskId, newStatus);
  };

  const handleDayComplete = () => {
    if (!isFounderOrCoFounder) {
      toast({
        title: "Access Denied",
        description: "Only Founders and Co-founders can mark days as complete.",
        variant: "destructive",
      });
      return;
    }
    if (selectedDay) {
      markDayComplete(selectedDay.dayNumber);
      setSelectedDay(null); // Close sheet
    }
  };

  // Calculate stats
  const totalTasks = plan.phases.flatMap(p => p.days.flatMap(d => d.tasks)).length;
  const completedTasks = plan.phases.flatMap(p => p.days.flatMap(d => d.tasks)).filter(t => t.status === "completed").length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100) || 0;

  return (
    <div className="min-h-screen bg-background/50 pb-20">
      <TopBar backTo="/dashboard" />

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">

        {/* SECTION 1: Startup Overview Header */}
        <div className="relative overflow-hidden rounded-3xl bg-card border-border shadow-card mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-background/50 backdrop-blur">
                      Day {plan.currentDay} of {plan.totalDays}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                      <Flame className="h-3 w-3 fill-orange-500" />
                      {plan.streak} Day Streak
                    </div>
                  </div>
                  <h1 className="text-3xl font-display font-bold text-foreground">{plan.title}</h1>
                  <p className="text-muted-foreground line-clamp-1">{plan.summary}</p>


                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Overall Progress</span>
                    <span className="font-bold text-primary">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>
              </div>

              {/* View Toggle */}
              <div className="bg-muted/50 p-1 rounded-lg flex items-center self-start">
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "timeline" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <List className="h-4 w-4" /> Timeline
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "calendar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <CalendarIcon className="h-4 w-4" /> Calendar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Vertical Timeline */}
        {viewMode === "timeline" && (
          <div className="space-y-10">
            {plan.phases.map((phase) => {
              const Icon = getPhaseIcon(phase.name);
              const colorClass = getPhaseColor(phase.name);
              const isCurrentPhase = plan.currentDay >= phase.startDay && plan.currentDay <= phase.endDay;

              return (
                <div key={phase.id} className="relative">
                  {/* Phase Header */}
                  <div className="sticky top-20 z-10 bg-background/95 backdrop-blur py-4 mb-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl border ${colorClass}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-display text-foreground">{phase.name} Phase</h2>
                        <p className="text-sm text-muted-foreground">Days {phase.startDay} - {phase.endDay}</p>
                      </div>
                    </div>
                    {isCurrentPhase && (
                      <Badge className="bg-primary text-primary-foreground">Current Phase</Badge>
                    )}
                  </div>

                  {/* Days List */}
                  <div className="pl-6 ml-6 border-l-2 border-border/50 space-y-6 pb-8">
                    {phase.days.map((day) => {
                      const isToday = day.status === "active";
                      const isLocked = day.status === "locked";
                      const isCompleted = day.status === "completed";

                      return (
                        <div key={day.dayNumber} className="relative">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-background transition-colors ${isCompleted ? "bg-green-500" : isToday ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                            }`} />

                          <Card
                            className={`group transition-all duration-300 border-border/50 overflow-hidden ${isLocked ? "opacity-50 cursor-not-allowed bg-muted/20" : "cursor-pointer"} ${isToday ? "ring-2 ring-primary border-primary shadow-elevated scale-100" : isLocked ? "" : "hover:border-primary/30 hover:shadow-md opacity-90 hover:opacity-100"
                              }`}
                            onClick={() => !isLocked && setSelectedDay(day)}
                          >
                            <div className="p-5 flex items-start gap-4">

                              {/* Date Box */}
                              <div className={`flex flex-col items-center justify-center h-16 w-16 rounded-xl border shrink-0 ${isToday ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/30 border-border text-muted-foreground"
                                }`}>
                                <span className="text-xs font-bold uppercase">Day</span>
                                <span className="text-2xl font-bold font-display">{day.dayNumber}</span>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`text-lg font-semibold ${isCompleted ? "text-muted-foreground line-through decoration-primary/50" : "text-foreground"}`}>
                                    {day.objective}
                                  </h3>
                                  {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <List className="h-3 w-3" />
                                    {day.tasks.length} Tasks
                                  </span>
                                  {isCompleted && (
                                    <span className="flex items-center gap-1 text-green-600 font-medium">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Completed
                                    </span>
                                  )}
                                  {isToday && (
                                    <span className="flex items-center gap-1 text-primary font-medium">
                                      <Rocket className="h-3 w-3" />
                                      Current Focus
                                    </span>
                                  )}
                                </div>
                              </div>

                              {!isLocked && (
                                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground group-hover:text-primary">
                                  <ChevronRight className="h-5 w-5" />
                                </Button>
                              )}
                            </div>

                            {/* Mini Task Preview for Today */}
                            {isToday && (
                              <div className="bg-primary/5 px-5 py-3 border-t border-primary/10">
                                <div className="space-y-2">
                                  {day.tasks.slice(0, 2).map(task => (
                                    <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                      {task.status === "completed" ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Circle className="h-4 w-4" />
                                      )}
                                      <span className={task.status === "completed" ? "line-through opacity-70" : ""}>{task.title}</span>
                                    </div>
                                  ))}
                                  {day.tasks.length > 2 && (
                                    <p className="text-xs text-primary font-medium pl-6">+{day.tasks.length - 2} more tasks</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Simple Calendar Placeholder (Features logic same as Timeline) */}
        {viewMode === "calendar" && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {plan.phases.flatMap(p => p.days).map((day) => {
              const matchesCurrent = day.status === "active";
              const isCompleted = day.status === "completed";
              const isLocked = day.status === "locked";

              return (
                <Card
                  key={day.dayNumber}
                  className={`p-4 transition-all ${isLocked ? "opacity-50 cursor-not-allowed bg-muted/20" : "cursor-pointer hover:border-primary/50"} ${matchesCurrent ? "ring-2 ring-primary border-primary bg-primary/5" : ""
                    } ${isCompleted ? "bg-green-50/50 border-green-100" : ""}`}
                  onClick={() => !isLocked && setSelectedDay(day)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm">Day {day.dayNumber}</span>
                    {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{day.objective}</p>
                </Card>
              )
            })}
          </div>
        )}

      </div>

      {/* SECTION 3: Day Execution Panel (Sheet) */}
      <Sheet open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedDay && (
            <div className="space-y-6 pt-6">
              <SheetHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                    Day {selectedDay.dayNumber} Execution
                  </Badge>
                  {selectedDay.status === "completed" ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
                  ) : selectedDay.status === "active" ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">Active</Badge>
                  ) : (
                    <Badge variant="outline">Locked</Badge>
                  )}
                </div>
                <SheetTitle className="text-2xl font-display font-bold leading-tight">
                  {selectedDay.objective}
                </SheetTitle>
                <SheetDescription>
                  Stay focused. Complete these specific tasks to move your startup forward today.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 my-8">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Today's Tasks</h3>
                  <div className="space-y-3">
                    {selectedDay.tasks.map((task) => (
                      <div key={task.id}>
                        {task.status === "locked" ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-start gap-3 p-3 rounded-lg border transition-colors group bg-muted/50 border-dashed opacity-70 cursor-not-allowed">
                                  <div className="mt-1">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 space-y-1 text-left">
                                    <span className="text-sm font-medium leading-none text-muted-foreground">
                                      {task.title}
                                    </span>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {task.description}
                                    </p>
                                    <p className="text-[10px] text-orange-500/80 mt-1 flex items-center gap-1">
                                      <Lock className="h-3 w-3" /> Complete previous task to unlock
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {task.priority}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Complete previous task to unlock</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors group bg-card hover:bg-accent/50`}>
                            <div className="mt-1">
                                <Checkbox
                                  id={task.id}
                                  checked={task.status === "completed"}
                                  onCheckedChange={() => handleTaskToggle(task.id, task.status)}
                                  disabled={!isFounderOrCoFounder}
                                />
                            </div>

                            <div className="flex-1 space-y-1">
                              <label
                                htmlFor={task.id}
                                className={`text-sm font-medium leading-none cursor-pointer ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                                  }`}
                              >
                                {task.title}
                              </label>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>

                              <Button
                                variant="link"
                                className="h-auto p-0 text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  setSelectedDay(null); // Close sheet to nav
                                  navigate(`/work/day/${selectedDay.dayNumber}/task/${task.id}`);
                                }}
                              >
                                View Details & Guides <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </div>
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {task.priority}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <SheetFooter className="flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background pb-4">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedDay(null)}>
                  Close
                </Button>
                <Button
                  className="w-full sm:w-auto gap-2"
                  variant={selectedDay.status === "completed" ? "secondary" : "hero"}
                  onClick={handleDayComplete}
                  disabled={selectedDay.status === "completed" || !isFounderOrCoFounder}
                >
                  {selectedDay.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Day Completed
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4" /> Mark Day as Complete
                    </>
                  )}
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default Plans;
