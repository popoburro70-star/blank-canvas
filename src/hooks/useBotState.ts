/* @refresh reset */

import { useState, useCallback, useEffect, useRef } from 'react';
import { BotConfig, BotStats, BotStatus, BotStep, LogEntry, FLOW_STEPS } from '@/types/bot';
import { useWebSocketADB, ADBMessage } from './useWebSocketADB';

type CalibratedConfig = BotConfig;

const DEFAULT_TROOP_OCR: Pick<
  BotConfig,
  'troopOcrCropW' | 'troopOcrCropH' | 'troopOcrOffsetX' | 'troopOcrOffsetY'
> = {
  troopOcrCropW: 0.06,
  troopOcrCropH: 0.06,
  troopOcrOffsetX: 0.0,
  troopOcrOffsetY: -0.03,
};

// NOTE: DEFAULT_CONFIG deve conter TODOS os campos de BotConfig.
// Função ajuda o TS a não "perder" campos em alguns cenários de inferência/cache do editor.
const createDefaultConfig = (): BotConfig => ({
  minGold: 200000,
  minElixir: 200000,
  minDarkElixir: 1000,
  autoWallUpgrade: true,
  // Pausa após finalizar um ataque (segundos).
  // Mantemos min/max para não alterar estrutura do app; ajustar ambos reduz a pausa efetiva.
  pauseMin: 15,
  pauseMax: 15,
  troopType: 'barbarian',

  // Delays (ms) - ajuste fino de tempo entre telas/cliques no modo ADB real
  delayAfterAttackMenuMs: 3000,
  delayAfterFindMatchMs: 5500,
  delayAfterNextVillageMs: 3500,
  delayBeforeOcrMs: 1200,

  // Coordenadas calibráveis (percentuais 0..1)
  findMatchX: 0.16,
  findMatchY: 0.78,

  // 2 botões "Atacar!" (podem ter posições diferentes)
  // OBS: Em alguns layouts o "Atacar! (menu)" fica do lado ESQUERDO.
  attackMenuX: 0.12,
  attackMenuY: 0.86,
  attackStartX: 0.91,
  attackStartY: 0.88,

  // legado
  attackConfirmX: 0.91,
  attackConfirmY: 0.88,

  nextButtonX: 0.93,
  nextButtonY: 0.70,

  // Slots de tropas (1-8) - defaults do layout padrão
  troopSlot1X: 0.20,
  troopSlot1Y: 0.95,
  troopSlot2X: 0.30,
  troopSlot2Y: 0.95,
  troopSlot3X: 0.40,
  troopSlot3Y: 0.95,
  troopSlot4X: 0.50,
  troopSlot4Y: 0.95,
  troopSlot5X: 0.60,
  troopSlot5Y: 0.95,
  troopSlot6X: 0.68,
  troopSlot6Y: 0.95,
  troopSlot7X: 0.76,
  troopSlot7Y: 0.95,
  troopSlot8X: 0.84,
  troopSlot8Y: 0.95,

  ...DEFAULT_TROOP_OCR,
});

const DEFAULT_CONFIG = createDefaultConfig();

const DEFAULT_STATS: BotStats = {
  attacksCompleted: 0,
  goldCollected: 0,
  elixirCollected: 0,
  darkElixirCollected: 0,
  wallsUpgraded: 0,
  sessionStartTime: null,
};

export function useBotState() {
  const [status, setStatus] = useState<BotStatus>('idle');
  const [currentStep, setCurrentStep] = useState<BotStep>('start');
  const [config, setConfig] = useState<CalibratedConfig>(DEFAULT_CONFIG as CalibratedConfig);
  const [stats, setStats] = useState<BotStats>(DEFAULT_STATS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [useRealADB, setUseRealADB] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stepIndexRef = useRef(0);

  const {
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    sendCommand,
    isConnected,
  } = useWebSocketADB();

  const addLog = useCallback((type: LogEntry['type'], message: string, step?: string) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message,
      step,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [pendingScreenshot, setPendingScreenshot] = useState(false);

  // Handle messages from Python script
  useEffect(() => {
    if (!lastMessage) return;

    const { type, payload } = lastMessage as ADBMessage;

    switch (type) {
      case 'status':
        const statusPayload = payload as { status: string };
        if (statusPayload.status === 'running') setStatus('running');
        else if (statusPayload.status === 'paused') setStatus('paused');
        else if (statusPayload.status === 'idle') setStatus('idle');
        break;
      case 'log':
        const logPayload = payload as { level: string; message: string; step?: string };
        addLog(logPayload.level as LogEntry['type'], logPayload.message, logPayload.step);
        if (logPayload.step) {
          setCurrentStep(logPayload.step as BotStep);
        }
        break;
      case 'screenshot':
        const shotPayload = payload as { image?: string };
        if (shotPayload?.image) setScreenshotBase64(shotPayload.image);
        break;
      case 'stats':
        const statsPayload = payload as {
          attacks_completed?: number;
          gold_collected?: number;
          elixir_collected?: number;
          dark_elixir_collected?: number;
          walls_upgraded?: number;
        };
        setStats(prev => ({
          ...prev,
          attacksCompleted: statsPayload.attacks_completed ?? prev.attacksCompleted,
          goldCollected: statsPayload.gold_collected ?? prev.goldCollected,
          elixirCollected: statsPayload.elixir_collected ?? prev.elixirCollected,
          darkElixirCollected: statsPayload.dark_elixir_collected ?? prev.darkElixirCollected,
          wallsUpgraded: statsPayload.walls_upgraded ?? prev.wallsUpgraded,
        }));
        break;
      case 'error':
        addLog('error', String(payload));
        break;
    }
  }, [lastMessage, addLog]);

  useEffect(() => {
    if (!pendingScreenshot) return;
    if (!useRealADB || !isConnected) return;

    setPendingScreenshot(false);
    sendCommand({ action: 'screenshot' });
  }, [pendingScreenshot, useRealADB, isConnected, sendCommand]);

  const simulateStep = useCallback(() => {
    const stepIndex = stepIndexRef.current;
    const step = FLOW_STEPS[stepIndex];

    if (!step) {
      stepIndexRef.current = 0;
      return;
    }

    setCurrentStep(step.id);

    switch (step.id) {
      case 'analyze_village': {
        const gold = Math.floor(Math.random() * 500000);
        const elixir = Math.floor(Math.random() * 500000);
        addLog('info', `Vila encontrada: ${gold.toLocaleString()} ouro, ${elixir.toLocaleString()} elixir`, step.id);
        break;
      }
      case 'check_criteria': {
        const meetsRequirements = Math.random() > 0.3;
        addLog(
          meetsRequirements ? 'success' : 'warning',
          meetsRequirements ? 'Vila atende aos critérios!' : 'Vila não atende, buscando próxima...',
          step.id
        );
        break;
      }
      case 'end_attack': {
        const goldCollected = Math.floor(Math.random() * 300000) + 50000;
        const elixirCollected = Math.floor(Math.random() * 300000) + 50000;
        setStats(prev => ({
          ...prev,
          attacksCompleted: prev.attacksCompleted + 1,
          goldCollected: prev.goldCollected + goldCollected,
          elixirCollected: prev.elixirCollected + elixirCollected,
        }));
        addLog(
          'success',
          `Ataque finalizado! +${goldCollected.toLocaleString()} ouro, +${elixirCollected.toLocaleString()} elixir`,
          step.id
        );
        break;
      }
      case 'upgrade_wall': {
        if (config.autoWallUpgrade && Math.random() > 0.5) {
          setStats(prev => ({
            ...prev,
            wallsUpgraded: prev.wallsUpgraded + 1,
          }));
          addLog('success', 'Muro atualizado com sucesso!', step.id);
        }
        break;
      }
      default:
        addLog('info', step.description, step.id);
    }

    stepIndexRef.current = (stepIndex + 1) % FLOW_STEPS.length;
  }, [config.autoWallUpgrade, addLog]);

  const toPythonConfig = useCallback((cfg: Partial<BotConfig>) => {
    const mapped: Record<string, unknown> = {};

    if (cfg.minGold !== undefined) mapped.min_gold = cfg.minGold;
    if (cfg.minElixir !== undefined) mapped.min_elixir = cfg.minElixir;
    if (cfg.minDarkElixir !== undefined) mapped.min_dark_elixir = cfg.minDarkElixir;
    if (cfg.autoWallUpgrade !== undefined) mapped.auto_wall_upgrade = cfg.autoWallUpgrade;
    if (cfg.pauseMin !== undefined) mapped.pause_min = cfg.pauseMin;
    if (cfg.pauseMax !== undefined) mapped.pause_max = cfg.pauseMax;
    if (cfg.troopType !== undefined) mapped.troop_type = cfg.troopType;

    // Delays (ms)
    if (cfg.delayAfterAttackMenuMs !== undefined) mapped.delay_after_attack_menu_ms = cfg.delayAfterAttackMenuMs;
    if (cfg.delayAfterFindMatchMs !== undefined) mapped.delay_after_find_match_ms = cfg.delayAfterFindMatchMs;
    if (cfg.delayAfterNextVillageMs !== undefined) mapped.delay_after_next_village_ms = cfg.delayAfterNextVillageMs;
    if (cfg.delayBeforeOcrMs !== undefined) mapped.delay_before_ocr_ms = cfg.delayBeforeOcrMs;

    // Coordenadas calibráveis (percentuais)
    if (cfg.findMatchX !== undefined) mapped.find_match_x = cfg.findMatchX;
    if (cfg.findMatchY !== undefined) mapped.find_match_y = cfg.findMatchY;

    if (cfg.attackMenuX !== undefined) mapped.attack_menu_x = cfg.attackMenuX;
    if (cfg.attackMenuY !== undefined) mapped.attack_menu_y = cfg.attackMenuY;

    if (cfg.attackStartX !== undefined) mapped.attack_start_x = cfg.attackStartX;
    if (cfg.attackStartY !== undefined) mapped.attack_start_y = cfg.attackStartY;

    // legado
    if (cfg.attackConfirmX !== undefined) mapped.attack_confirm_x = cfg.attackConfirmX;
    if (cfg.attackConfirmY !== undefined) mapped.attack_confirm_y = cfg.attackConfirmY;

    if (cfg.nextButtonX !== undefined) mapped.next_button_x = cfg.nextButtonX;
    if (cfg.nextButtonY !== undefined) mapped.next_button_y = cfg.nextButtonY;

    // Slots de tropas (1-8)
    if (cfg.troopSlot1X !== undefined) mapped.troop_slot_1_x = cfg.troopSlot1X;
    if (cfg.troopSlot1Y !== undefined) mapped.troop_slot_1_y = cfg.troopSlot1Y;
    if (cfg.troopSlot2X !== undefined) mapped.troop_slot_2_x = cfg.troopSlot2X;
    if (cfg.troopSlot2Y !== undefined) mapped.troop_slot_2_y = cfg.troopSlot2Y;
    if (cfg.troopSlot3X !== undefined) mapped.troop_slot_3_x = cfg.troopSlot3X;
    if (cfg.troopSlot3Y !== undefined) mapped.troop_slot_3_y = cfg.troopSlot3Y;
    if (cfg.troopSlot4X !== undefined) mapped.troop_slot_4_x = cfg.troopSlot4X;
    if (cfg.troopSlot4Y !== undefined) mapped.troop_slot_4_y = cfg.troopSlot4Y;
    if (cfg.troopSlot5X !== undefined) mapped.troop_slot_5_x = cfg.troopSlot5X;
    if (cfg.troopSlot5Y !== undefined) mapped.troop_slot_5_y = cfg.troopSlot5Y;
    if (cfg.troopSlot6X !== undefined) mapped.troop_slot_6_x = cfg.troopSlot6X;
    if (cfg.troopSlot6Y !== undefined) mapped.troop_slot_6_y = cfg.troopSlot6Y;
    if (cfg.troopSlot7X !== undefined) mapped.troop_slot_7_x = cfg.troopSlot7X;
    if (cfg.troopSlot7Y !== undefined) mapped.troop_slot_7_y = cfg.troopSlot7Y;
    if (cfg.troopSlot8X !== undefined) mapped.troop_slot_8_x = cfg.troopSlot8X;
    if (cfg.troopSlot8Y !== undefined) mapped.troop_slot_8_y = cfg.troopSlot8Y;

    // OCR slots (tropas)
    if (cfg.troopOcrCropW !== undefined) mapped.troop_ocr_crop_w = cfg.troopOcrCropW;
    if (cfg.troopOcrCropH !== undefined) mapped.troop_ocr_crop_h = cfg.troopOcrCropH;
    if (cfg.troopOcrOffsetX !== undefined) mapped.troop_ocr_offset_x = cfg.troopOcrOffsetX;
    if (cfg.troopOcrOffsetY !== undefined) mapped.troop_ocr_offset_y = cfg.troopOcrOffsetY;

    return mapped;
  }, []);

  const startBot = useCallback(() => {
    if (useRealADB && isConnected) {
      // Inicializar tempo de sessão se for a primeira vez
      setStats(prev => ({
        ...prev,
        sessionStartTime: prev.sessionStartTime || new Date(),
      }));
      // primeiro manda config no formato esperado pelo script Python
      sendCommand({
        action: 'update_config',
        params: toPythonConfig(config),
      });
      sendCommand({ action: 'start' });
    } else {
      setStatus('running');
      setStats(prev => ({
        ...prev,
        sessionStartTime: new Date(),
      }));
      addLog('success', 'Bot iniciado (modo simulação)', 'start');
      intervalRef.current = setInterval(simulateStep, 2000);
    }
  }, [useRealADB, isConnected, sendCommand, config, addLog, simulateStep, toPythonConfig]);

  const pauseBot = useCallback(() => {
    if (useRealADB && isConnected) {
      sendCommand({ action: 'pause' });
    } else {
      setStatus('paused');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      addLog('warning', 'Bot pausado', 'PAUSE');
    }
  }, [useRealADB, isConnected, sendCommand, addLog]);

  const stopBot = useCallback(() => {
    if (useRealADB && isConnected) {
      sendCommand({ action: 'stop' });
    } else {
      setStatus('idle');
      setCurrentStep('start');
      stepIndexRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      addLog('info', 'Bot parado', 'STOP');
    }
  }, [useRealADB, isConnected, sendCommand, addLog]);

  const resumeBot = useCallback(() => {
    if (useRealADB && isConnected) {
      sendCommand({ action: 'resume' });
    } else {
      setStatus('running');
      addLog('success', 'Bot retomado', 'RESUME');
      intervalRef.current = setInterval(simulateStep, 2000);
    }
  }, [useRealADB, isConnected, sendCommand, addLog, simulateStep]);

  const updateConfig = useCallback((newConfig: Partial<CalibratedConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    addLog('info', 'Configuração atualizada');

    if (useRealADB && isConnected) {
      sendCommand({
        action: 'update_config',
        params: toPythonConfig(newConfig),
      });
    }
  }, [useRealADB, isConnected, sendCommand, addLog, toPythonConfig]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const resetBotState = useCallback(() => {
    // parar simulação
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // parar bot real (se estiver conectado)
    if (useRealADB && isConnected) {
      sendCommand({ action: 'stop' });
    }

    stepIndexRef.current = 0;
    setStatus('idle');
    setCurrentStep('start');
    setStats(DEFAULT_STATS);
    setLogs([]);
    setConfig(DEFAULT_CONFIG as CalibratedConfig);
    setScreenshotBase64(null);

    addLog('info', 'Estado reiniciado');
  }, [useRealADB, isConnected, sendCommand, addLog]);

  const toggleRealADB = useCallback(() => {
    setUseRealADB(prev => !prev);
  }, []);

  const requestScreenshot = useCallback(() => {
    if (!useRealADB) {
      addLog('warning', 'Ative o modo ADB real para capturar screenshot');
      return;
    }

    // Se ainda não conectou, conecta e agenda captura
    if (!isConnected) {
      setPendingScreenshot(true);
      connect();
      addLog('info', 'Conectando ao ADB… assim que conectar, vou capturar o screenshot.');
      return;
    }

    sendCommand({ action: 'screenshot' });
  }, [useRealADB, isConnected, connect, sendCommand, addLog]);

  const tapPercent = useCallback(
    (xPercent: number, yPercent: number) => {
      if (useRealADB && isConnected) {
        sendCommand({ action: 'tap', params: { x_percent: xPercent, y_percent: yPercent } });
        return;
      }
      addLog('warning', 'Conecte no modo ADB real para testar o toque');
    },
    [useRealADB, isConnected, sendCommand, addLog]
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    currentStep,
    config,
    stats,
    logs,
    startBot,
    pauseBot,
    stopBot,
    resumeBot,
    updateConfig,
    clearLogs,
    resetBotState,

    // ADB connection
    connectionStatus,
    connect,
    disconnect,
    isConnected,
    useRealADB,
    toggleRealADB,

    // calibração
    screenshotBase64,
    requestScreenshot,
    tapPercent,
  };
}
