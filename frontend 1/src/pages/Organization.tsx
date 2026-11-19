import { PageHeader } from "@/components/PageHeader";
import { NavCard } from "@/components/NavCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ListTodo,
  Briefcase,
  Calendar,
  Video,
  Shield,
  CheckCircle2,
  Users,
  Sparkles
} from "lucide-react";

const Organization = () => {
  // Mock organization data
  const organization = {
    name: "InventoryPro",
    description: "AI-powered inventory management platform for small business owners, helping them track stock levels, predict demand, and reduce waste through intelligent automation.",
    members: [
      { name: "John Doe", role: "Founder", initials: "JD" },
      { name: "Sarah Chen", role: "Co-Founder", initials: "SC" },
      { name: "Mike Wilson", role: "Tech Lead", initials: "MW" },
    ],
  };

  const navigationOptions = [
    {
      title: "Plans & Tasks",
      description: "View monthly and weekly plans with daily actions",
      icon: ListTodo,
      to: "/plans",
    },
    {
      title: "Works",
      description: "Manage your ongoing work items and deliverables",
      icon: Briefcase,
      to: "/works",
    },
    {
      title: "Calendar",
      description: "View tasks and meetings in calendar format",
      icon: Calendar,
      to: "/calendar",
    },
    {
      title: "Meetings",
      description: "Schedule and manage your meetings",
      icon: Video,
      to: "/meetings",
    },
    {
      title: "Vault",
      description: "Secure storage for credentials and personal links",
      icon: Shield,
      to: "/vault",
    },
  ];

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader
          title="Organization Created"
          backTo="/story-intake"
        />

        {/* Success Banner */}
        <div className="mb-6 sm:mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-6 animate-fade-in opacity-0">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="rounded-xl bg-primary p-2 sm:p-3 shrink-0">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground">
                Organization Created Successfully!
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Your startup execution plan is ready. Let's get started!
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Organization Info */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Startup Card */}
            <Card className="animate-fade-in-up opacity-0 stagger-1">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">{organization.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {organization.description}
                </p>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card className="animate-fade-in-up opacity-0 stagger-2">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {organization.members.map((member) => (
                    <div key={member.name} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary shrink-0">
                        {member.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">{member.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Options */}
          <div className="lg:col-span-2">
            <h3 className="mb-3 sm:mb-4 font-display text-base sm:text-lg font-semibold text-foreground">
              Quick Access
            </h3>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {navigationOptions.map((option, index) => (
                <div
                  key={option.title}
                  className={`animate-fade-in-up opacity-0 stagger-${index + 2}`}
                >
                  <NavCard {...option} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Organization;
