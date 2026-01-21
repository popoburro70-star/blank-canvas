import { useEffect, useMemo, useState } from 'react'; // calibration
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ConnectionStatus } from '@/hooks/useWebSocketADB';
import { Slider } from '@/components/ui/slider';
import type { BotConfig } from '@/types/bot';

type CalibrateTarget = 'find_match' | 'attack_menu' | 'attack_start' | 'next_button' | 'troop_slots' | 'troop_ocr';

type CalibrationConfig = BotConfig;

const TARGET_LABEL: Record<CalibrateTarget, string> = {
  find_match: 'Procurar partida',
  attack_menu: 'Atacar (menu)',
  attack_start: 'Atacar! (iniciar ataque)',
  next_button: 'Próximo',
  troop_slots: 'Slots de tropas (1–8)',
  troop_ocr: 'OCR tropas (slots)',
};

const TROOP_SLOTS = [
  { key: 'troop_slot_1', label: 'Slot 1' },
  { key: 'troop_slot_2', label: 'Slot 2' },
  { key: 'troop_slot_3', label: 'Slot 3' },
  { key: 'troop_slot_4', label: 'Slot 4' },
  { key: 'troop_slot_5', label: 'Slot 5' },
  { key: 'troop_slot_6', label: 'Slot 6' },
  { key: 'troop_slot_7', label: 'Slot 7' },
  { key: 'troop_slot_8', label: 'Slot 8' },
] as const;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

interface CalibrationPanelProps {
  config: CalibrationConfig;
  disabled?: boolean;
  screenshotBase64: string | null;
  onRequestScreenshot: () => void;
  onUpdate: (config: Partial<CalibrationConfig>) => void;
  onTapPercent: (xPercent: number, yPercent: number) => void;
  useRealADB: boolean;
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  onConnect: () => void;
}

export function CalibrationPanel({
  config,
  disabled,
  screenshotBase64,
  onRequestScreenshot,
  onUpdate,
  onTapPercent,
  useRealADB,
  connectionStatus,
  isConnected,
  onConnect,
}: CalibrationPanelProps) {
  const [target, setTarget] = useState<CalibrateTarget>('find_match');
  const [troopSlotKey, setTroopSlotKey] = useState<(typeof TROOP_SLOTS)[number]['key']>('troop_slot_1');
  const [troopCropPreview, setTroopCropPreview] = useState<string | null>(null);

  const getTroopSlotCoord = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {
      troop_slot_1: { x: config.troopSlot1X, y: config.troopSlot1Y },
      troop_slot_2: { x: config.troopSlot2X, y: config.troopSlot2Y },
      troop_slot_3: { x: config.troopSlot3X, y: config.troopSlot3Y },
      troop_slot_4: { x: config.troopSlot4X, y: config.troopSlot4Y },
      troop_slot_5: { x: config.troopSlot5X, y: config.troopSlot5Y },
      troop_slot_6: { x: config.troopSlot6X, y: config.troopSlot6Y },
      troop_slot_7: { x: config.troopSlot7X, y: config.troopSlot7Y },
      troop_slot_8: { x: config.troopSlot8X, y: config.troopSlot8Y },
    };
    return (key: string) => map[key] ?? { x: 0.5, y: 0.95 };
  }, [
    config.troopSlot1X,
    config.troopSlot1Y,
    config.troopSlot2X,
    config.troopSlot2Y,
    config.troopSlot3X,
    config.troopSlot3Y,
    config.troopSlot4X,
    config.troopSlot4Y,
    config.troopSlot5X,
    config.troopSlot5Y,
    config.troopSlot6X,
    config.troopSlot6Y,
    config.troopSlot7X,
    config.troopSlot7Y,
    config.troopSlot8X,
    config.troopSlot8Y,
  ]);

  const current = useMemo(() => {
    switch (target) {
      case 'find_match':
        return { x: config.findMatchX, y: config.findMatchY };
      case 'attack_menu':
        return { x: config.attackMenuX, y: config.attackMenuY };
      case 'attack_start':
        return { x: config.attackStartX, y: config.attackStartY };
      case 'next_button':
        return { x: config.nextButtonX, y: config.nextButtonY };
      case 'troop_slots':
        return getTroopSlotCoord(troopSlotKey);
      case 'troop_ocr': {
        return getTroopSlotCoord(troopSlotKey);
      }
    }
  }, [config, target, troopSlotKey, getTroopSlotCoord]);

  const troopOcr = useMemo(
    () => ({
      cropW: config.troopOcrCropW ?? 0.06,
      cropH: config.troopOcrCropH ?? 0.06,
      offsetX: config.troopOcrOffsetX ?? 0.0,
      offsetY: config.troopOcrOffsetY ?? -0.03,
    }),
    [config.troopOcrCropW, config.troopOcrCropH, config.troopOcrOffsetX, config.troopOcrOffsetY]
  );
  const applyCoord = (x: number, y: number) => {
    const cx = clamp01(x);
    const cy = clamp01(y);

    if (target === 'find_match') onUpdate({ findMatchX: cx, findMatchY: cy });
    if (target === 'attack_menu') onUpdate({ attackMenuX: cx, attackMenuY: cy });
    if (target === 'attack_start') onUpdate({ attackStartX: cx, attackStartY: cy });
    if (target === 'next_button') onUpdate({ nextButtonX: cx, nextButtonY: cy });
    if (target === 'troop_slots') {
      const slotPatch: Record<string, number> = {};
      if (troopSlotKey === 'troop_slot_1') {
        slotPatch.troopSlot1X = cx;
        slotPatch.troopSlot1Y = cy;
      }
      if (troopSlotKey === 'troop_slot_2') {
        slotPatch.troopSlot2X = cx;
        slotPatch.troopSlot2Y = cy;
      }
      if (troopSlotKey === 'troop_slot_3') {
        slotPatch.troopSlot3X = cx;
        slotPatch.troopSlot3Y = cy;
      }
      if (troopSlotKey === 'troop_slot_4') {
        slotPatch.troopSlot4X = cx;
        slotPatch.troopSlot4Y = cy;
      }
      if (troopSlotKey === 'troop_slot_5') {
        slotPatch.troopSlot5X = cx;
        slotPatch.troopSlot5Y = cy;
      }
      if (troopSlotKey === 'troop_slot_6') {
        slotPatch.troopSlot6X = cx;
        slotPatch.troopSlot6Y = cy;
      }
      if (troopSlotKey === 'troop_slot_7') {
        slotPatch.troopSlot7X = cx;
        slotPatch.troopSlot7Y = cy;
      }
      if (troopSlotKey === 'troop_slot_8') {
        slotPatch.troopSlot8X = cx;
        slotPatch.troopSlot8Y = cy;
      }

      onUpdate(slotPatch as any);
    }
  };

  useEffect(() => {
    if (!screenshotBase64) {
      setTroopCropPreview(null);
      return;
    }
    if (target !== 'troop_ocr') {
      setTroopCropPreview(null);
      return;
    }

    const img = new Image();
    img.src = `data:image/png;base64,${screenshotBase64}`;
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;

      const slotCoord = getTroopSlotCoord(troopSlotKey);
      const cx = w * slotCoord.x + w * troopOcr.offsetX;
      const cy = h * slotCoord.y + h * troopOcr.offsetY;
      const cw = Math.max(2, w * troopOcr.cropW);
      const ch = Math.max(2, h * troopOcr.cropH);

      const x1 = Math.max(0, Math.min(w, cx - cw / 2));
      const y1 = Math.max(0, Math.min(h, cy - ch / 2));
      const x2 = Math.max(0, Math.min(w, cx + cw / 2));
      const y2 = Math.max(0, Math.min(h, cy + ch / 2));

      const outW = Math.max(1, Math.floor(x2 - x1));
      const outH = Math.max(1, Math.floor(y2 - y1));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, x1, y1, outW, outH, 0, 0, outW, outH);
      setTroopCropPreview(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setTroopCropPreview(null);
  }, [
    screenshotBase64,
    target,
    troopSlotKey,
    troopOcr.cropW,
    troopOcr.cropH,
    troopOcr.offsetX,
    troopOcr.offsetY,
    getTroopSlotCoord,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="font-gaming text-xs tracking-wider text-muted-foreground uppercase">Calibração</h4>
          <p className="text-xs text-muted-foreground">
            Para aparecer o screenshot: ative <span className="text-foreground">Modo Real</span> e conecte o ADB (status: {connectionStatus}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && useRealADB && (
            <Button type="button" variant="outline" onClick={onConnect} disabled={disabled}>
              Conectar
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onRequestScreenshot} disabled={disabled || !useRealADB}>
            Capturar screenshot
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Elemento</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as CalibrateTarget)} disabled={disabled}>
            <SelectTrigger className="bg-secondary/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="find_match">{TARGET_LABEL.find_match}</SelectItem>
              <SelectItem value="attack_menu">{TARGET_LABEL.attack_menu}</SelectItem>
              <SelectItem value="attack_start">{TARGET_LABEL.attack_start}</SelectItem>
              <SelectItem value="next_button">{TARGET_LABEL.next_button}</SelectItem>
              <SelectItem value="troop_slots">{TARGET_LABEL.troop_slots}</SelectItem>
              <SelectItem value="troop_ocr">{TARGET_LABEL.troop_ocr}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Coordenadas atuais (0..1)</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs">
              x: {current.x.toFixed(3)} | y: {current.y.toFixed(3)}
            </div>
            <Button type="button" variant="outline" onClick={() => onTapPercent(current.x, current.y)} disabled={disabled}>
              Testar
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-1" />

       {!screenshotBase64 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          Nenhum screenshot ainda. Clique em “Capturar screenshot”.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Clique na imagem para definir: <span className="text-foreground">{TARGET_LABEL[target]}</span>
          </p>

            {(target === 'troop_ocr' || target === 'troop_slots') && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Slot para calibrar</Label>
                    <Select value={troopSlotKey} onValueChange={(v) => setTroopSlotKey(v as any)}>
                      <SelectTrigger className="bg-secondary/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TROOP_SLOTS.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {target === 'troop_slots' && (
                    <p className="text-[11px] text-muted-foreground">
                      Selecione o slot e clique no screenshot para salvar a coordenada.
                    </p>
                  )}

                  {target === 'troop_ocr' && (
                  <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Largura do recorte</Label>
                      <span className="text-xs tabular-nums text-muted-foreground">{(config.troopOcrCropW ?? 0.06).toFixed(3)}</span>
                    </div>
                    <Slider
                      value={[config.troopOcrCropW ?? 0.06]}
                      min={0.02}
                      max={0.16}
                      step={0.002}
                      onValueChange={([v]) => onUpdate({ troopOcrCropW: v })}
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Altura do recorte</Label>
                      <span className="text-xs tabular-nums text-muted-foreground">{(config.troopOcrCropH ?? 0.06).toFixed(3)}</span>
                    </div>
                    <Slider
                      value={[config.troopOcrCropH ?? 0.06]}
                      min={0.02}
                      max={0.16}
                      step={0.002}
                      onValueChange={([v]) => onUpdate({ troopOcrCropH: v })}
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Offset X (relativo)</Label>
                      <span className="text-xs tabular-nums text-muted-foreground">{(config.troopOcrOffsetX ?? 0.0).toFixed(3)}</span>
                    </div>
                    <Slider
                      value={[config.troopOcrOffsetX ?? 0.0]}
                      min={-0.10}
                      max={0.10}
                      step={0.002}
                      onValueChange={([v]) => onUpdate({ troopOcrOffsetX: v })}
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Offset Y (relativo)</Label>
                      <span className="text-xs tabular-nums text-muted-foreground">{(config.troopOcrOffsetY ?? -0.03).toFixed(3)}</span>
                    </div>
                    <Slider
                      value={[config.troopOcrOffsetY ?? -0.03]}
                      min={-0.20}
                      max={0.05}
                      step={0.002}
                      onValueChange={([v]) => onUpdate({ troopOcrOffsetY: v })}
                      disabled={disabled}
                    />
                  </div>

                  </>
                  )}
                </div>

                {target === 'troop_ocr' && (
                  <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
                    <Label className="text-xs text-muted-foreground">Preview do recorte (OCR)</Label>
                    {troopCropPreview ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img src={troopCropPreview} className="w-full h-auto block rounded-md border border-border bg-background" draggable={false} />
                    ) : (
                      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Ajuste os sliders para gerar o preview.
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Dica: posicione o recorte exatamente sobre o número branco do slot.
                    </p>
                  </div>
                )}
              </div>
            )}

          <div className="relative overflow-hidden rounded-lg border border-border bg-secondary/20">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img
              src={`data:image/png;base64,${screenshotBase64}`}
              className="w-full h-auto block select-none"
              draggable={false}
              onClick={(e) => {
                  if (target === 'troop_ocr') return;
                const rect = (e.currentTarget as HTMLImageElement).getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                applyCoord(x, y);
              }}
            />

            {/* Crosshair */}
            <div
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-primary/20 pointer-events-none"
              style={{ left: `${current.x * 100}%`, top: `${current.y * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
