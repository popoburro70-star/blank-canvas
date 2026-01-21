import { LogEntry } from '@/types/bot';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LogsPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

const logIcons: Record<LogEntry['type'], React.ReactNode> = {
  info: <Info className="w-3.5 h-3.5 text-blue-400" />,
  success: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-warning" />,
  error: <XCircle className="w-3.5 h-3.5 text-destructive" />,
};

const logColors: Record<LogEntry['type'], string> = {
  info: 'text-blue-400',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

export function LogsPanel({ logs, onClear }: LogsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-gaming text-sm tracking-wider text-muted-foreground uppercase">
          Logs
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Limpar
        </Button>
      </div>
      
      <ScrollArea className="flex-1 h-[300px]">
        <div className="space-y-1.5 pr-3">
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhum log ainda...
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md text-xs",
                  "bg-secondary/30 border border-transparent",
                  log.type === 'error' && 'border-destructive/30 bg-destructive/5',
                  log.type === 'warning' && 'border-warning/30 bg-warning/5'
                )}
              >
                <span className="shrink-0 mt-0.5">{logIcons[log.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {format(log.timestamp, 'HH:mm:ss')}
                    </span>
                    {log.step && (
                      <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-gaming tracking-wide">
                        {log.step}
                      </span>
                    )}
                  </div>
                  <p className={cn("mt-0.5", logColors[log.type])}>
                    {log.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
