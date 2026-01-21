export interface BotConfig {
  minGold: number;
  minElixir: number;
  minDarkElixir: number;
  autoWallUpgrade: boolean;
  pauseMin: number;
  pauseMax: number;
  troopType: 'barbarian' | 'archer' | 'goblin' | 'giant' | 'mixed';

  /**
   * Delays (ms) usados no modo ADB real para desacelerar telas/ações.
   * (O script Python precisa usar esses campos.)
   */
  delayAfterAttackMenuMs: number;
  delayAfterFindMatchMs: number;
  delayAfterNextVillageMs: number;
  delayBeforeOcrMs: number;

  /**
   * Coordenadas calibráveis (percentuais 0..1)
   */
  findMatchX: number;
  findMatchY: number;

  /**
   * "Atacar!" do menu (canto inferior direito, antes de "Procurar partida")
   */
  attackMenuX: number;
  attackMenuY: number;

  /**
   * "Atacar!" para iniciar o ataque (depois de encontrar a vila)
   */
  attackStartX: number;
  attackStartY: number;

  /**
   * Mantido por compatibilidade (legado). Preferir attackMenu/attackStart.
   */
  attackConfirmX: number;
  attackConfirmY: number;

  nextButtonX: number;
  nextButtonY: number;

  /**
   * Slots de tropas (barra inferior). Percentuais 0..1.
   * Usado para selecionar tropas durante o deploy + OCR por slot.
   */
  troopSlot1X: number;
  troopSlot1Y: number;
  troopSlot2X: number;
  troopSlot2Y: number;
  troopSlot3X: number;
  troopSlot3Y: number;
  troopSlot4X: number;
  troopSlot4Y: number;
  troopSlot5X: number;
  troopSlot5Y: number;
  troopSlot6X: number;
  troopSlot6Y: number;
  troopSlot7X: number;
  troopSlot7Y: number;
  troopSlot8X: number;
  troopSlot8Y: number;

  /**
   * OCR dos slots (contagem de tropas): parâmetros do recorte relativo ao slot.
   * Valores em percentuais da tela (0..1). O recorte é centrado em:
   * (slot_x + offsetX, slot_y + offsetY), com tamanho (cropW, cropH).
   */
  troopOcrCropW: number;
  troopOcrCropH: number;
  troopOcrOffsetX: number;
  troopOcrOffsetY: number;
}

export interface BotStats {
  attacksCompleted: number;
  goldCollected: number;
  elixirCollected: number;
  darkElixirCollected: number;
  wallsUpgraded: number;
  sessionStartTime: Date | null;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  step?: string;
}

export type BotStatus = 'idle' | 'running' | 'paused' | 'error';

export type BotStep =
  | 'start'
  | 'verify_bluestacks'
  | 'detect_screen'
  | 'search_village'
  | 'analyze_village'
  | 'check_criteria'
  | 'start_attack'
  | 'deploy_troops'
  | 'verify_collection'
  | 'end_attack'
  | 'return_village'
  | 'check_wall_upgrade'
  | 'verify_resources'
  | 'select_wall'
  | 'upgrade_wall'
  | 'random_pause'
  | 'save_logs'
  | 'check_active';

export interface FlowStep {
  id: BotStep;
  name: string;
  description: string;
  type: 'start' | 'condition' | 'action' | 'detection' | 'loop' | 'wait' | 'end';
}

export const FLOW_STEPS: FlowStep[] = [
  { id: 'start', name: 'START', description: 'Bot iniciado', type: 'start' },
  { id: 'verify_bluestacks', name: 'Verificar BlueStacks', description: 'BlueStacks está aberto?', type: 'condition' },
  { id: 'detect_screen', name: 'Detectar Tela', description: 'Detectar tela principal', type: 'detection' },
  { id: 'search_village', name: 'Buscar Vila', description: 'Atacar → (Atacar esq.) → Procurar Partida', type: 'action' },
  { id: 'analyze_village', name: 'Analisar Vila', description: 'Ler recursos (OCR)', type: 'detection' },
  { id: 'check_criteria', name: 'Verificar Critérios', description: 'Recursos ≥ mínimo?', type: 'condition' },
  { id: 'start_attack', name: 'Iniciar Ataque', description: 'Clique em Atacar!', type: 'action' },
  { id: 'deploy_troops', name: 'Deploy Tropas', description: 'Soltar tropas', type: 'loop' },
  { id: 'verify_collection', name: 'Verificar Coleta', description: 'Recursos coletados?', type: 'condition' },
  { id: 'end_attack', name: 'Finalizar Ataque', description: 'Clique em Finalizar', type: 'action' },
  { id: 'return_village', name: 'Retornar Vila', description: 'Confirmar tela', type: 'detection' },
  { id: 'check_wall_upgrade', name: 'Auto-Up Muros?', description: 'Auto-up ativado?', type: 'condition' },
  { id: 'verify_resources', name: 'Verificar Recursos', description: 'Recursos ≥ custo?', type: 'condition' },
  { id: 'select_wall', name: 'Selecionar Muro', description: 'Identificar muro', type: 'detection' },
  { id: 'upgrade_wall', name: 'Upar Muro', description: 'Executar upgrade', type: 'action' },
  { id: 'random_pause', name: 'Pausa Aleatória', description: '10-60 segundos', type: 'wait' },
  { id: 'save_logs', name: 'Salvar Logs', description: 'Registrar atividade', type: 'action' },
  { id: 'check_active', name: 'Bot Ativo?', description: 'Continuar loop?', type: 'condition' },
];
