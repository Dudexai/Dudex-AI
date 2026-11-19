import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Lightbulb, Target, Rocket } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero">
      {/* Navigation */}
      <nav className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3 animate-fade-in">
          <img src="https://res.cloudinary.com/dtbsyy5zm/image/upload/v1773155396/website_logo_lctco7.jpg" alt="DudexAI Logo" className="h-12 md:h-14 lg:h-16 w-auto object-contain mix-blend-multiply" />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/auth?mode=login")}>
            Login
          </Button>
          <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>
            Sign Up
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-fade-in opacity-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              AI-Powered Startup Execution
            </span>
          </div>

          <h1 className="mt-8 font-display text-5xl font-bold leading-tight text-foreground animate-fade-in opacity-0 stagger-1 md:text-6xl lg:text-7xl">
            Turn Your Ideas Into
            <span className="block text-gradient">Structured Execution</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in opacity-0 stagger-2">
            Share your startup vision, and our AI transforms it into actionable plans,
            organized tasks, and a clear roadmap to success.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in opacity-0 stagger-3">
            <Button variant="hero" onClick={() => navigate("/auth?mode=signup")} className="group">
              Get Started
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="xl" variant="outline">
              See How It Works
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mx-auto mt-24 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              icon: Lightbulb,
              title: "Share Your Vision",
              description: "Tell us about your startup idea in your own words. Our AI listens and understands.",
            },
            {
              icon: Target,
              title: "AI-Powered Planning",
              description: "We analyze your idea and create structured plans, tasks, and milestones automatically.",
            },
            {
              icon: Rocket,
              title: "Execute & Track",
              description: "Follow your personalized roadmap with clear daily actions and progress tracking.",
            },
          ].map((feature, index) => (
            <div
              key={feature.title}
              className={`rounded-2xl border border-border/50 bg-card p-8 shadow-card transition-all duration-300 hover:shadow-elevated animate-fade-in-up opacity-0 stagger-${index + 3}`}
            >
              <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto border-t border-border/50 px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 DudexAI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
