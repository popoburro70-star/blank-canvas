import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BotStatus } from '@/types/bot';

interface BotControlsProps {
  status: BotStatus;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
  /**
   * Mostra o botão PARAR mesmo se o status não estiver sincronizado.
   * Útil quando o script está rodando mas a UI não recebeu status=running.
   */
  forceStopVisible?: boolean;
}

export function BotControls({ status, onStart, onPause, onStop, onResume, forceStopVisible }: BotControlsProps) {
  const showStop = forceStopVisible || status === 'running' || status === 'paused';

  return (
    <div className="flex items-center gap-3">
      {status === 'idle' && (
        <Button
          onClick={onStart}
          className="gap-2 gradient-gold text-primary-foreground font-gaming tracking-wide hover:opacity-90 box-glow-gold transition-all"
          size="lg"
        >
          <Play className="w-5 h-5" />
          INICIAR
        </Button>
      )}

      {status === 'idle' && showStop && (
        <Button
          onClick={onStop}
          variant="destructive"
          className="gap-2 font-gaming tracking-wide"
          size="lg"
        >
          <Square className="w-5 h-5" />
          PARAR
        </Button>
      )}
      
      {status === 'running' && (
        <>
          <Button
            onClick={onPause}
            variant="secondary"
            className="gap-2 font-gaming tracking-wide"
            size="lg"
          >
            <Pause className="w-5 h-5" />
            PAUSAR
          </Button>
          <Button
            onClick={onStop}
            variant="destructive"
            className="gap-2 font-gaming tracking-wide"
            size="lg"
          >
            <Square className="w-5 h-5" />
            PARAR
          </Button>
        </>
      )}
      
      {status === 'paused' && (
        <>
          <Button
            onClick={onResume}
            className="gap-2 gradient-gold text-primary-foreground font-gaming tracking-wide hover:opacity-90 box-glow-gold transition-all"
            size="lg"
          >
            <RotateCcw className="w-5 h-5" />
            RETOMAR
          </Button>
          <Button
            onClick={onStop}
            variant="destructive"
            className="gap-2 font-gaming tracking-wide"
            size="lg"
          >
            <Square className="w-5 h-5" />
            PARAR
          </Button>
        </>
      )}
    </div>
  );
}
