import { BotStatus } from '@/types/bot';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: BotStatus;
}

const statusConfig: Record<BotStatus, { label: string; color: string; glow: string }> = {
  idle: { label: 'PARADO', color: 'bg-muted-foreground', glow: '' },
  running: { label: 'EXECUTANDO', color: 'bg-success', glow: 'box-glow-green' },
  paused: { label: 'PAUSADO', color: 'bg-warning', glow: '' },
  error: { label: 'ERRO', color: 'bg-destructive', glow: 'box-glow-red' },
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "relative w-4 h-4 rounded-full",
        config.color,
        config.glow,
        status === 'running' && 'animate-pulse'
      )}>
        {status === 'running' && (
          <div className={cn(
            "absolute inset-0 rounded-full animate-ping",
            config.color,
            "opacity-75"
          )} />
        )}
      </div>
      <span className={cn(
        "font-gaming text-sm tracking-wider",
        status === 'running' && 'text-success text-glow-green',
        status === 'paused' && 'text-warning',
        status === 'error' && 'text-destructive',
        status === 'idle' && 'text-muted-foreground'
      )}>
        {config.label}
      </span>
    </div>
  );
}
