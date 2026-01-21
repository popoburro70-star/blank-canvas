import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/hooks/useWebSocketADB';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectionStatusProps {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

const statusConfig: Record<ConnectionStatus, { label: string; icon: React.ReactNode; color: string }> = {
  disconnected: {
    label: 'Desconectado',
    icon: <WifiOff className="w-4 h-4" />,
    color: 'text-muted-foreground',
  },
  connecting: {
    label: 'Conectando...',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: 'text-warning',
  },
  connected: {
    label: 'Conectado',
    icon: <Wifi className="w-4 h-4" />,
    color: 'text-success',
  },
  error: {
    label: 'Erro de Conexão',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-destructive',
  },
};

export function ConnectionStatusIndicator({ status, onConnect, onDisconnect }: ConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
            status === 'connected' && "bg-success/10 border-success/30",
            status === 'disconnected' && "bg-secondary/50 border-border",
            status === 'connecting' && "bg-warning/10 border-warning/30",
            status === 'error' && "bg-destructive/10 border-destructive/30"
          )}>
            <span className={config.color}>{config.icon}</span>
            <span className={cn("text-xs font-medium", config.color)}>
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Status da conexão com o script Python local</p>
          <p className="text-xs text-muted-foreground mt-1">
            Porta: ws://localhost:8765
          </p>
        </TooltipContent>
      </Tooltip>

      {status === 'disconnected' || status === 'error' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onConnect}
          className="h-8 text-xs font-gaming tracking-wide"
        >
          Conectar ADB
        </Button>
      ) : status === 'connected' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          className="h-8 text-xs text-muted-foreground hover:text-destructive"
        >
          Desconectar
        </Button>
      ) : null}
    </div>
  );
}
