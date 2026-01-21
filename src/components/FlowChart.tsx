import { FLOW_STEPS, BotStep, FlowStep } from '@/types/bot';
import { cn } from '@/lib/utils';
import { 
  Play, 
  HelpCircle, 
  MousePointer, 
  Eye, 
  RefreshCw, 
  Clock,
  CheckCircle2
} from 'lucide-react';

interface FlowChartProps {
  currentStep: BotStep;
}

const typeIcons: Record<FlowStep['type'], React.ReactNode> = {
  start: <Play className="w-3 h-3" />,
  condition: <HelpCircle className="w-3 h-3" />,
  action: <MousePointer className="w-3 h-3" />,
  detection: <Eye className="w-3 h-3" />,
  loop: <RefreshCw className="w-3 h-3" />,
  wait: <Clock className="w-3 h-3" />,
  end: <CheckCircle2 className="w-3 h-3" />,
};

const typeColors: Record<FlowStep['type'], string> = {
  start: 'border-success bg-success/10 text-success',
  condition: 'border-primary bg-primary/10 text-primary',
  action: 'border-accent bg-accent/10 text-accent',
  detection: 'border-blue-500 bg-blue-500/10 text-blue-400',
  loop: 'border-purple-500 bg-purple-500/10 text-purple-400',
  wait: 'border-muted-foreground bg-muted/20 text-muted-foreground',
  end: 'border-destructive bg-destructive/10 text-destructive',
};

export function FlowChart({ currentStep }: FlowChartProps) {
  const currentStepIndex = FLOW_STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
      {FLOW_STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isPast = index < currentStepIndex;
        
        return (
          <div key={step.id} className="relative">
            {/* Connection line */}
            {index < FLOW_STEPS.length - 1 && (
              <div className={cn(
                "absolute left-5 top-10 w-0.5 h-4 transition-colors duration-300",
                isPast ? "bg-primary" : "bg-border"
              )} />
            )}
            
            {/* Step card */}
            <div className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-300",
              isActive && "border-primary box-glow-gold scale-[1.02]",
              isPast && "border-primary/50 bg-primary/5",
              !isActive && !isPast && "border-border bg-card/50 opacity-60"
            )}>
              {/* Step type icon */}
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-md border shrink-0",
                typeColors[step.type],
                isActive && "animate-pulse"
              )}>
                {typeIcons[step.type]}
              </div>
              
              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-xs font-gaming tracking-wide truncate",
                  isActive && "text-primary text-glow-gold"
                )}>
                  {step.name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {step.description}
                </div>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
