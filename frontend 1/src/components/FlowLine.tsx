import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface FlowStep {
  id: string;
  label: string;
  status: "pending" | "active" | "completed";
}

interface FlowLineProps {
  steps: FlowStep[];
  onComplete?: () => void;
}

export const FlowLine = ({ steps, onComplete }: FlowLineProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [internalSteps, setInternalSteps] = useState<FlowStep[]>(steps);

  useEffect(() => {
    if (currentStep < steps.length) {
      const timer = setTimeout(() => {
        setInternalSteps(prev => prev.map((step, idx) => {
          if (idx === currentStep) return { ...step, status: "active" as const };
          if (idx < currentStep) return { ...step, status: "completed" as const };
          return step;
        }));

        setTimeout(() => {
          setInternalSteps(prev => prev.map((step, idx) => {
            if (idx === currentStep) return { ...step, status: "completed" as const };
            return step;
          }));
          setCurrentStep(prev => prev + 1);
        }, 1500);
      }, 500);

      return () => clearTimeout(timer);
    } else if (currentStep === steps.length && onComplete) {
      setTimeout(onComplete, 500);
    }
  }, [currentStep, steps.length, onComplete]);

  return (
    <div className="relative py-8">
      {/* Connecting Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
      
      {/* Animated Progress Line */}
      <div 
        className="absolute left-8 top-0 w-0.5 bg-primary transition-all duration-1000 ease-out"
        style={{ 
          height: `${(currentStep / steps.length) * 100}%`,
        }}
      />

      {/* Steps */}
      <div className="space-y-12">
        {internalSteps.map((step, index) => (
          <div 
            key={step.id} 
            className={`relative flex items-center gap-6 transition-all duration-500 ${
              step.status === "pending" ? "opacity-40" : "opacity-100"
            }`}
          >
            {/* Step Indicator */}
            <div 
              className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                step.status === "completed" 
                  ? "border-primary bg-primary text-primary-foreground"
                  : step.status === "active"
                  ? "border-primary bg-primary/10 text-primary animate-pulse"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {step.status === "completed" ? (
                <Check className="h-6 w-6" />
              ) : step.status === "active" ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <span className="text-lg font-semibold">{index + 1}</span>
              )}
            </div>

            {/* Step Label */}
            <div className="flex-1">
              <h3 className={`font-display text-xl font-semibold transition-colors ${
                step.status === "active" ? "text-primary" : "text-foreground"
              }`}>
                {step.label}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.status === "completed" 
                  ? "Completed" 
                  : step.status === "active" 
                  ? "Processing..."
                  : "Waiting..."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
