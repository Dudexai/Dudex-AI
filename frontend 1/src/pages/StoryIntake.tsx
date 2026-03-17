import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/TopBar";
import { PageHeader } from "@/components/PageHeader";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Lightbulb,
  Heart,
  Target,
  AlertCircle,
  Clock,
  Users,
  Building
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStartup } from "@/hooks/useStartup";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/context/PlanContext";
// import { supabase } from "@/lib/supabase"; // Removed Supabase import

const STORAGE_KEY_STARTUPS = "dudex_startups";

const StoryIntake = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshStartups, setActiveStartupId } = useStartup();
  const { setPlan } = usePlan();
  const { toast } = useToast();

  const [story, setStory] = useState("");
  const [startupName, setStartupName] = useState("");
  const [planningDays, setPlanningDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [characterCount, setCharacterCount] = useState(0);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setStory(prev => prev + finalTranscript + interimTranscript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice input.",
            variant: "destructive",
          });
        }
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Update character count
  useEffect(() => {
    setCharacterCount(story.length);
  }, [story]);

  const toggleRecording = () => {
    if (!recognition) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice input. Please type your vision.",
        variant: "destructive",
      });
      return;
    }

    if (!isRecording) {
      try {
        recognition.start();
        setIsRecording(true);
        toast({
          title: "Recording Started",
          description: "Speak now. Click the microphone again to stop.",
        });
      } catch (error) {
        console.error('Failed to start recording:', error);
        toast({
          title: "Recording Failed",
          description: "Unable to start voice recording.",
          variant: "destructive",
        });
      }
    } else {
      recognition.stop();
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Voice input has been captured.",
      });
    }
  };

  const handleSubmit = async () => {
    if (!story.trim()) {
      toast({
        title: "Empty Vision",
        description: "Please describe your startup idea before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Auth check removed or mocked if needed, but keeping user check logic if implied
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in to create a startup.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const name = startupName.trim() || "My Startup";

    // Validate startup name
    if (name.length < 2) {
      toast({
        title: "Invalid Startup Name",
        description: "Please enter a valid startup name (minimum 2 characters).",
        variant: "destructive",
      });
      return;
    }

    // Check if story is too short
    if (story.length < 100) {
      toast({
        title: "Vision Too Short",
        description: "Please provide a more detailed description (minimum 100 characters).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to session storage for the Processing page to pick up
      const pendingVision = {
        name: name,
        vision: story,
        days: planningDays || 30,
        createdAt: new Date().toISOString()
      };

      sessionStorage.setItem("pendingVision", JSON.stringify(pendingVision));

      // Navigate to processing page
      navigate("/processing");

    } catch (error: any) {
      console.error("Error initiating startup creation:", error);
      toast({
        title: "Error",
        description: "Failed to proceed. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setStory("");
    setStartupName("");
    toast({
      title: "Cleared",
      description: "All fields have been cleared.",
    });
  };

  const insertExample = () => {
    const exampleStory = `I want to build an AI-powered inventory management platform for small business owners. The problem is that most small businesses struggle with stock management, leading to overstocking or stockouts. My solution uses machine learning to predict demand, automate reordering, and provide real-time inventory tracking through a simple mobile app. The target market includes retail stores, restaurants, and e-commerce businesses with 1-50 employees. What makes us unique is our focus on simplicity and affordability, with a freemium model for basic features and premium AI capabilities.`;

    setStory(exampleStory);
    setStartupName("InventoryPro AI");
    setPlanningDays(30);

    toast({
      title: "Example Added",
      description: "An example startup vision has been added. Feel free to edit it!",
    });
  };

  const handlePlanningDaysChange = (value: string) => {
    const numDays = parseInt(value);
    if (!isNaN(numDays)) {
      setPlanningDays(numDays);
    } else if (value === "") {
      setPlanningDays(0);
    }
  };

  return (
    <div className="min-h-screen gradient-hero pb-20">
      <TopBar />
      <div className="container mx-auto px-6 py-8">
        <PageHeader
          title="Share Your Vision"
          subtitle="Tell us about your startup idea. We'll help you structure and execute it."
        />

        {/* Quick Stats Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Takes 2-5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Used by 1,000+ founders</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={insertExample}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            See Example
          </Button>
        </div>

        <div className="mx-auto max-w-4xl">
          {/* Guidance Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Lightbulb,
                title: "What problem are you solving?",
                description: "Describe the pain point your target customers experience.",
                color: "text-primary bg-primary/10",
              },
              {
                icon: Heart,
                title: "Who will benefit?",
                description: "Identify your target market and ideal customer profile.",
                color: "text-pink-500 bg-pink-500/10",
              },
              {
                icon: Target,
                title: "What makes you unique?",
                description: "Explain your competitive advantage and differentiation.",
                color: "text-green-500 bg-green-500/10",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="animate-fade-in-up opacity-0 stagger-1 rounded-xl border border-border/50 bg-card p-4 hover:border-primary/30 transition-colors"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Form */}
          <div className="rounded-3xl border border-border bg-card shadow-elevated p-6 md:p-8">
            {/* Startup Name Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Startup Name
                </label>
                <span className="text-xs text-muted-foreground">
                  {startupName.length}/100 characters
                </span>
              </div>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value.slice(0, 50))}
                  placeholder="Enter a memorable name for your startup"
                  className="w-full rounded-xl border border-input bg-background px-10 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  maxLength={100}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a name that reflects your vision and is easy to remember.
              </p>
            </div>


            {/* Planning Days Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Number of Planning Days
                </label>
                <span className="text-xs text-muted-foreground">
                  How many days of planning do you need?
                </span>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-xl border-2 p-4 border-border bg-background">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={planningDays || ""}
                      onChange={(e) => handlePlanningDaysChange(e.target.value)}
                      placeholder="Enter days (e.g., 30, 60, 90)"
                      className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    />
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                </div>

                {/* Selected Duration Display */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Your startup will be planned for <strong className="text-foreground">{planningDays || 0} days</strong>
                    {planningDays >= 30 && ` (~${Math.round(planningDays / 30)} month${Math.round(planningDays / 30) > 1 ? 's' : ''})`}
                  </p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Your Vision & Idea
                </label>
                <span className={`text-xs ${characterCount < 100 ? "text-destructive" :
                  characterCount < 100 ? "text-amber-500" :
                    "text-green-500"
                  }`}>
                  {characterCount}/5000 characters
                </span>
              </div>

              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value.slice(0, 5000))}
                onKeyDown={handleKeyDown}
                placeholder="Describe your startup idea in detail. What problem does it solve? Who is it for? How does it work? What makes it special? The more details you provide, the better we can help you plan and execute."
                className="min-h-[300px] w-full rounded-2xl border border-input bg-background p-6 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                maxLength={5000}
              />

              {/* Character Progress */}
              <div className="mt-2">
                <div className="h-1 w-full rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min((characterCount / 5000) * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Start typing</span>
                  <span className={characterCount < 50 ? "text-destructive" : ""}>
                    {characterCount < 50 ? "Add more details" : "Good detail"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tips & Requirements */}
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Tips for a great vision:</h4>
                  <ul className="mt-1 space-y-1 text-sm text-amber-700">
                    <li>â€¢ Be specific about the problem and your solution</li>
                    <li>â€¢ Mention your target customers and their pain points</li>
                    <li>â€¢ Describe what makes your approach unique</li>
                    <li>â€¢ Include any relevant experience or research</li>
                    <li>â€¢ Minimum 50 characters recommended</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={toggleRecording}
                  className="gap-2"
                  disabled={!recognition || isSubmitting}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Voice Input
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="gap-2"
                  disabled={isSubmitting}
                >
                  Clear All
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  variant="hero"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !story.trim() || characterCount < 50}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating Startup...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Create Startup & Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Keyboard Shortcut Hint */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-2 py-1 text-xs bg-secondary rounded">Ctrl/Cmd + Enter</kbd> to submit
              </p>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="mt-8 rounded-xl border border-border/30 bg-card/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Your vision is private.</strong> Only you and your invited team members can see this information. We use AI to analyze your idea and generate personalized plans.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryIntake;
