import { Bot, Shield } from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';
import { ConnectionStatusIndicator } from './ConnectionStatus';
import { BotStatus } from '@/types/bot';
import { ConnectionStatus } from '@/hooks/useWebSocketADB';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface HeaderProps {
  status: BotStatus;
  connectionStatus: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  useRealADB: boolean;
  onToggleRealADB: () => void;
}

export function Header({ 
  status, 
  connectionStatus, 
  onConnect, 
  onDisconnect,
  useRealADB,
  onToggleRealADB
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-gold box-glow-gold">
          <Bot className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-gaming text-xl tracking-wider text-glow-gold">
            COC FARM BOT
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automação para BlueStacks
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 border border-border">
          <Label htmlFor="real-adb" className="text-xs text-muted-foreground cursor-pointer">
            Modo Real
          </Label>
          <Switch 
            id="real-adb" 
            checked={useRealADB} 
            onCheckedChange={onToggleRealADB}
          />
        </div>
        
        {useRealADB && (
          <ConnectionStatusIndicator 
            status={connectionStatus}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        )}
        
        <StatusIndicator status={status} />
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
          <Shield className="w-4 h-4 text-success" />
          <span className="text-xs text-muted-foreground">Modo Seguro</span>
        </div>
      </div>
    </header>
  );
}
