import type { BotConfig } from '@/types/bot';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, Droplets, Moon, Swords, RotateCcw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { CalibrationPanel } from '@/components/CalibrationPanel';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/hooks/useWebSocketADB';

type CalibratedConfig = BotConfig;

interface ConfigPanelProps {
  config: CalibratedConfig;
  onUpdate: (config: Partial<CalibratedConfig>) => void;
  disabled?: boolean;

  onResetBotState: () => void;

  // calibração (ADB real)
  screenshotBase64: string | null;
  onRequestScreenshot: () => void;
  onTapPercent: (xPercent: number, yPercent: number) => void;
  useRealADB: boolean;
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  onConnect: () => void;
}

export function ConfigPanel({
  config,
  onUpdate,
  disabled,
  screenshotBase64,
  onRequestScreenshot,
  onTapPercent,
  onResetBotState,
  useRealADB,
  connectionStatus,
  isConnected,
  onConnect,
}: ConfigPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-gaming text-sm tracking-wider">Configuração</h3>
          <p className="text-xs text-muted-foreground">Ajuste critérios, tempos e calibração.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onResetBotState} className="gap-2" disabled={false}>
          <RotateCcw className="w-4 h-4" />
          Reiniciar estado
        </Button>
      </div>

      {/* Resource minimums */}
      <div className="space-y-4">
        <h4 className="font-gaming text-xs tracking-wider text-muted-foreground uppercase">
          Recursos Mínimos
        </h4>

        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Ouro Mínimo</Label>
              <Input
                type="number"
                value={config.minGold}
                onChange={(e) => onUpdate({ minGold: parseInt(e.target.value) || 0 })}
                disabled={disabled}
                className="mt-1 bg-secondary/50 border-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/30">
              <Droplets className="w-5 h-5 text-pink-500" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Elixir Mínimo</Label>
              <Input
                type="number"
                value={config.minElixir}
                onChange={(e) => onUpdate({ minElixir: parseInt(e.target.value) || 0 })}
                disabled={disabled}
                className="mt-1 bg-secondary/50 border-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <Moon className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Elixir Negro Mínimo</Label>
              <Input
                type="number"
                value={config.minDarkElixir}
                onChange={(e) => onUpdate({ minDarkElixir: parseInt(e.target.value) || 0 })}
                disabled={disabled}
                className="mt-1 bg-secondary/50 border-border"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Troop selection */}
      <div className="space-y-3">
        <h4 className="font-gaming text-xs tracking-wider text-muted-foreground uppercase">Tropas</h4>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/30">
            <Swords className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <Select
              value={config.troopType}
              onValueChange={(value) => onUpdate({ troopType: value as BotConfig['troopType'] })}
              disabled={disabled}
            >
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="barbarian">Bárbaros</SelectItem>
                <SelectItem value="archer">Arqueiras</SelectItem>
                <SelectItem value="goblin">Goblins</SelectItem>
                <SelectItem value="giant">Gigantes</SelectItem>
                <SelectItem value="mixed">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Auto wall upgrade */}
      <div className="space-y-3">
        <h4 className="font-gaming text-xs tracking-wider text-muted-foreground uppercase">Automação</h4>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
          <div>
            <Label className="text-sm">Auto-Up de Muros</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Atualizar muros automaticamente</p>
          </div>
          <Switch checked={config.autoWallUpgrade} onCheckedChange={(checked) => onUpdate({ autoWallUpgrade: checked })} disabled={disabled} />
        </div>
      </div>

      {/* Pause settings */}
      <div className="space-y-3">
        <h4 className="font-gaming text-xs tracking-wider text-muted-foreground uppercase">Pausa (segundos)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Mínimo</Label>
            <Input
              type="number"
              value={config.pauseMin}
              onChange={(e) => onUpdate({ pauseMin: parseInt(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Máximo</Label>
            <Input
              type="number"
              value={config.pauseMax}
              onChange={(e) => onUpdate({ pauseMax: parseInt(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
        </div>
      </div>

      {/* Timing (ADB real) */}
      <div className="space-y-3">
        <h4 className="font-gaming text-xs tracking-wider text-muted-foreground uppercase">
          Tempo por etapa (ADB real) — ms
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Após abrir menu Atacar</Label>
            <Input
              type="number"
              value={config.delayAfterAttackMenuMs}
              onChange={(e) => onUpdate({ delayAfterAttackMenuMs: parseInt(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Após “Procurar Partida”</Label>
            <Input
              type="number"
              value={config.delayAfterFindMatchMs}
              onChange={(e) => onUpdate({ delayAfterFindMatchMs: parseInt(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Após “Próximo” (trocar vila)</Label>
            <Input
              type="number"
              value={config.delayAfterNextVillageMs}
              onChange={(e) => onUpdate({ delayAfterNextVillageMs: parseInt(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Antes do OCR (ler recursos)</Label>
            <Input
              type="number"
              value={config.delayBeforeOcrMs}
              onChange={(e) => onUpdate({ delayBeforeOcrMs: parseInt(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Dica: comece com 3000 / 5500 / 3500 / 1200 e ajuste até parar de “pular” vila.
        </p>
      </div>

      {/* Coordenadas (edição manual) */}
      <div className="space-y-3">
        <h4 className="font-gaming text-xs tracking-wider text-muted-foreground uppercase">Coordenadas (0.0–1.0)</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Procurar partida (X)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.findMatchX}
              onChange={(e) => onUpdate({ findMatchX: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Procurar partida (Y)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.findMatchY}
              onChange={(e) => onUpdate({ findMatchY: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Atacar! (menu) (X)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.attackMenuX}
              onChange={(e) => onUpdate({ attackMenuX: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Atacar! (menu) (Y)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.attackMenuY}
              onChange={(e) => onUpdate({ attackMenuY: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Atacar! (iniciar) (X)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.attackStartX}
              onChange={(e) => onUpdate({ attackStartX: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Atacar! (iniciar) (Y)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.attackStartY}
              onChange={(e) => onUpdate({ attackStartY: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Próximo (X)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.nextButtonX}
              onChange={(e) => onUpdate({ nextButtonX: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Próximo (Y)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={1}
              value={config.nextButtonY}
              onChange={(e) => onUpdate({ nextButtonY: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="mt-1 bg-secondary/50 border-border"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Dica: se o screenshot da calibração não aparecer, ajuste aqui manualmente e use “Tap de teste”.</p>
      </div>

      <Separator />

      <CalibrationPanel
        config={config}
        disabled={disabled}
        screenshotBase64={screenshotBase64}
        onRequestScreenshot={onRequestScreenshot}
        onUpdate={(partial) => onUpdate(partial as any)}
        onTapPercent={onTapPercent}
        useRealADB={useRealADB}
        connectionStatus={connectionStatus}
        isConnected={isConnected}
        onConnect={onConnect}
      />
    </div>
  );
}
