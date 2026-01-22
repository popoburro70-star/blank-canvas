import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, Terminal, Download } from 'lucide-react';
const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
COC Farm Bot - ADB Controller
Este script se comunica com o painel web via WebSocket e executa comandos ADB no BlueStacks.

Requisitos:
- Python 3.8+
- py -m pip install websockets pillow pytesseract opencv-python numpy
- ADB instalado e no PATH
- BlueStacks rodando com ADB habilitado (Configurações > Avançadas > Habilitar Android Debug Bridge)
"""

import asyncio
import json
import subprocess
import time
import base64
import io
import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
import websockets
from PIL import Image
import pytesseract
import cv2
import numpy as np


def find_tesseract_cmd() -> str:
    """Tenta localizar o binário do Tesseract (Windows/Linux/macOS)."""
    # Se o usuário definiu explicitamente via env, respeita
    env = os.environ.get("TESSERACT_CMD")
    if env and os.path.isfile(env):
        return env

    # Windows (instalador UB Mannheim)
    common_windows = [
        r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
        r"C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
    ]
    for p in common_windows:
        if os.path.isfile(p):
            return p

    # PATH / padrão
    return "tesseract"


pytesseract.pytesseract.tesseract_cmd = find_tesseract_cmd()
print(f"[OCR] Usando Tesseract: {pytesseract.pytesseract.tesseract_cmd}")

# Configurações
WS_PORT = 8765
ADB_DEVICE = "emulator-5554"  # Ou use "127.0.0.1:5555" para conexão TCP

def find_adb() -> str:
    """Encontra o executável do ADB"""
    # Tenta encontrar no PATH
    for path in os.environ.get("PATH", "").split(os.pathsep):
        adb_path = os.path.join(path, "adb.exe" if sys.platform == "win32" else "adb")
        if os.path.isfile(adb_path):
            return adb_path
    
    # Caminhos comuns no Windows
    common_paths = [
        os.path.expanduser("~/Downloads/platform-tools/adb.exe"),
        "C:/platform-tools/adb.exe",
        "C:/Android/platform-tools/adb.exe",
        os.path.expandvars("%LOCALAPPDATA%/Android/Sdk/platform-tools/adb.exe"),
    ]
    
    for path in common_paths:
        if os.path.isfile(path):
            return path
    
    return "adb"  # Fallback

ADB_PATH = find_adb()
print(f"[ADB] Usando: {ADB_PATH}")


class ADBController:
    def __init__(self):
        self.connected = False
        self.device_id = ADB_DEVICE
        self.screen_width = 1920
        self.screen_height = 1080
        
    def run_adb(self, args: list, timeout: int = 10) -> subprocess.CompletedProcess:
        """Executa comando ADB com caminho correto"""
        cmd = [ADB_PATH] + args
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    
    def run_adb_bytes(self, args: list, timeout: int = 10) -> subprocess.CompletedProcess:
        """Executa comando ADB retornando bytes"""
        cmd = [ADB_PATH] + args
        return subprocess.run(cmd, capture_output=True, timeout=timeout)
        
    def connect(self) -> bool:
        """Conecta ao BlueStacks via ADB"""
        try:
            # Listar dispositivos
            result = self.run_adb(["devices"])
            print(f"[ADB] Dispositivos: {result.stdout}")
            
            if ADB_DEVICE in result.stdout or "emulator" in result.stdout:
                self.connected = True
                print(f"[ADB] Conectado a {self.device_id}")
                
                # Detectar resolução
                size_result = self.run_adb(["-s", self.device_id, "shell", "wm", "size"])
                if "Physical size:" in size_result.stdout:
                    size_str = size_result.stdout.split("Physical size:")[-1].strip()
                    w, h = size_str.split("x")
                    self.screen_width = int(w)
                    self.screen_height = int(h)
                    print(f"[ADB] Resolução: {self.screen_width}x{self.screen_height}")
                
                return True
            
            # Tentar conectar via TCP
            result = self.run_adb(["connect", "127.0.0.1:5555"])
            if "connected" in result.stdout.lower():
                self.connected = True
                self.device_id = "127.0.0.1:5555"
                return True
                
            return False
        except Exception as e:
            print(f"[ADB] Erro ao conectar: {e}")
            return False
    
    def get_coords(self, x_percent: float, y_percent: float) -> Tuple[int, int]:
        """Converte coordenadas percentuais para pixels"""
        x = int(self.screen_width * x_percent)
        y = int(self.screen_height * y_percent)
        return x, y
    
    def tap(self, x: int, y: int) -> bool:
        """Executa um toque na tela"""
        try:
            print(f"[ADB] Tap em ({x}, {y})")
            self.run_adb(["-s", self.device_id, "shell", "input", "tap", str(x), str(y)])
            return True
        except Exception as e:
            print(f"[ADB] Erro no tap: {e}")
            return False
    
    def tap_percent(self, x_percent: float, y_percent: float) -> bool:
        """Toque usando coordenadas percentuais (0.0 a 1.0)"""
        x, y = self.get_coords(x_percent, y_percent)
        return self.tap(x, y)
    
    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration: int = 300) -> bool:
        """Executa um swipe na tela"""
        try:
            self.run_adb(["-s", self.device_id, "shell", "input", "swipe", 
                 str(x1), str(y1), str(x2), str(y2), str(duration)])
            return True
        except Exception as e:
            print(f"[ADB] Erro no swipe: {e}")
            return False
    
    def screenshot(self) -> Optional[bytes]:
        """Captura screenshot da tela"""
        try:
            result = self.run_adb_bytes(["-s", self.device_id, "exec-out", "screencap", "-p"])
            if result.stdout:
                return result.stdout
            return None
        except Exception as e:
            print(f"[ADB] Erro no screenshot: {e}")
            return None
    
    def save_debug_screenshot(self, name: str = "debug") -> str:
        """Salva screenshot para debug"""
        screenshot = self.screenshot()
        if screenshot:
            filename = f"{name}_{int(time.time())}.png"
            with open(filename, "wb") as f:
                f.write(screenshot)
            print(f"[ADB] Screenshot salvo: {filename}")
            return filename
        return ""
    
    def ocr_screen(self, region: Optional[tuple] = None) -> Dict[str, Any]:
        """Executa OCR na tela ou região específica

        region pode ser:
        - None: tela inteira
        - tuple (x, y, w, h): pixels
        - string "resources": usa uma região padrão para leitura de recursos
        """
        screenshot = self.screenshot()
        if not screenshot:
            return {"error": "Failed to capture screenshot"}

        # Fail-fast com mensagem clara quando o binário não está instalado
        try:
            _ = pytesseract.get_tesseract_version()
        except Exception:
            return {
                "error": "tesseract is not installed or it's not in your PATH",
                "hint": "Instale o Tesseract e/ou defina a variável TESSERACT_CMD apontando para tesseract.exe",
            }

        try:
            image = Image.open(io.BytesIO(screenshot))

            # Região padrão de recursos (saque disponível) — topo esquerdo.
            # OBS: alguns emuladores/escala mudam a posição do HUD.
            # Para evitar 0/0 persistente, usamos um recorte MAIS amplo por padrão.
            if region == "resources":
                w, h = image.size
                # percentuais (0..1) - alinhado ao bloco "Saque disponível" no canto superior esquerdo
                x1 = int(w * 0.00)
                y1 = int(h * 0.02)
                x2 = int(w * 0.52)
                y2 = int(h * 0.38)
                image = image.crop((x1, y1, x2, y2))
            elif region:
                x, y, w, h = region
                image = image.crop((x, y, x + w, y + h))

            # Pré-processamento com OpenCV para melhorar OCR
            img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
            gray = cv2.GaussianBlur(gray, (3, 3), 0)
            _, thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            # OCR config:
            # - Para o bloco de recursos, NÃO restringimos whitelist, pois o jogo usa espaços como separador de milhar.
            # - Para outras regiões, mantemos whitelist numérica para reduzir ruído.
            ocr_cfg = "--psm 6" if region == "resources" else "--psm 6 -c tessedit_char_whitelist=0123456789kKmM.,"
            text = pytesseract.image_to_string(thr, config=ocr_cfg)

            resources = self._extract_resources(text)

            return {
                "text": text,
                "resources": resources
            }
        except Exception as e:
            print(f"[OCR] Erro: {e}")
            return {"error": str(e), "resources": {}}
    
    def _extract_resources(self, text: str) -> Dict[str, int]:
        """Extrai valores de recursos do texto OCR.

        Estratégia:
        - Como estamos lendo o bloco "Saque disponível" (3 linhas), priorizamos a ORDEM de aparição
          (ouro -> elixir -> elixir negro), que é mais estável.
        - Se vier ruído/menos números, fazemos fallback para a estratégia dos maiores valores.
        """
        import re
        resources = {"gold": 0, "elixir": 0, "dark_elixir": 0}

        # Procurar por números grandes (recursos típicos do COC)
        # No print, os milhares vêm separados por ESPAÇO (ex.: "905 968"), sem vírgula/ponto.
        # Então aceitamos separadores: espaço, NBSP, ponto e vírgula (por robustez).
        numbers = re.findall(r'(\d{1,3}(?:[\s\u00A0,\.]\d{3})*|\d+)\s*([kKmM])?', text)

        parsed_values = []
        for num, suffix in numbers:
            try:
                value = int(
                    num.replace(" ", "")
                    .replace("\u00A0", "")
                    .replace(",", "")
                    .replace(".", "")
                )
                if suffix and suffix.lower() == 'k':
                    value *= 1000
                elif suffix and suffix.lower() == 'm':
                    value *= 1000000
                if value > 1000:  # Filtrar valores muito pequenos
                    parsed_values.append(value)
            except ValueError:
                pass

        # Primário: ordem de aparição (ouro, elixir, elixir negro)
        if len(parsed_values) >= 1:
            resources["gold"] = parsed_values[0]
        if len(parsed_values) >= 2:
            resources["elixir"] = parsed_values[1]
        if len(parsed_values) >= 3:
            resources["dark_elixir"] = parsed_values[2]

        # Fallback: se faltar algum, tenta preencher com os maiores valores
        if resources["gold"] == 0 or resources["elixir"] == 0:
            fallback = sorted(parsed_values, reverse=True)
            if resources["gold"] == 0 and len(fallback) >= 1:
                resources["gold"] = fallback[0]
            if resources["elixir"] == 0 and len(fallback) >= 2:
                resources["elixir"] = fallback[1]
            if resources["dark_elixir"] == 0 and len(fallback) >= 3:
                resources["dark_elixir"] = fallback[2]

        return resources


class BotController:
    def __init__(self, adb: ADBController, config: Dict[str, Any]):
        self.adb = adb
        self.config = config
        self.running = False
        self.paused = False
        self.current_step = "idle"
        self.stats = {
            "attacks": 0,
            "gold": 0,
            "elixir": 0,
            "dark_elixir": 0,
            "walls": 0
        }
        self.ws_server = None  # referência ao WebSocketServer para enviar stats

        # Coordenadas percentuais da UI (funcionam em qualquer resolução)
        # Valores entre 0.0 e 1.0 representando posição na tela
        self.coords = {
            # Tela principal
            "attack_button": (0.04, 0.82),          # Botão Atacar (canto inferior esquerdo)

            # Tela "Batalha" -> botão laranja "Procurar partida" (abaixo de "Batalha" no print)
            "find_match": (0.16, 0.78),

            # Tela de busca de vila
            "next_button": (0.93, 0.70),

            # 2 botões "Atacar!" (podem ter posições diferentes)
            "attack_menu": (0.12, 0.86),
            "attack_start": (0.91, 0.88),

            # legado
            "attack_confirm": (0.91, 0.88),

            # Durante batalha
            "end_battle": (0.04, 0.15),
            "end_battle_confirm": (0.35, 0.55),

            # Pós-batalha
            "return_home": (0.50, 0.88),

            # Seleção de tropas (parte inferior da tela durante ataque)
            # IMPORTANTE: no COC normalmente existem ATÉ 11 slots de tropas na barra.
            # Se usarmos apenas 8 pontos “iguais”, isso tende a mapear para slots errados (pula 1,4, etc.).
            # Cada “quadrado” da barra é um slot: calibramos 11 centros igualmente espaçados.
            "troop_slot_1": (0.06, 0.95),
            "troop_slot_2": (0.14, 0.95),
            "troop_slot_3": (0.22, 0.95),
            "troop_slot_4": (0.30, 0.95),
            "troop_slot_5": (0.38, 0.95),
            "troop_slot_6": (0.46, 0.95),
            "troop_slot_7": (0.54, 0.95),
            "troop_slot_8": (0.62, 0.95),
            "troop_slot_9": (0.70, 0.95),
            "troop_slot_10": (0.78, 0.95),
            "troop_slot_11": (0.86, 0.95),

            # Feitiços (geralmente no canto direito)
            "spell_slot_1": (0.86, 0.95),
            "spell_slot_2": (0.94, 0.95),
        }

    def _coord(self, key: str) -> Tuple[float, float]:
        """Retorna coordenada com override por config (ex.: find_match_x/find_match_y)."""
        base = self.coords.get(key, (0.5, 0.5))
        x = float(self.config.get(f"{key}_x", base[0]))
        y = float(self.config.get(f"{key}_y", base[1]))
        return x, y

    def request_stop(self):
        """Parada cooperativa (evita travar o servidor WS com cancel())."""
        self.running = False
        self.paused = False
    
    async def run(self, send_log):
        """Loop principal do bot"""
        self.running = True
        await send_log("info", "Bot iniciado - Modo Real ADB")

        async def _to_thread(func, *args, **kwargs):
            """Executa função bloqueante em thread para não travar o event loop."""
            try:
                return await asyncio.to_thread(func, *args, **kwargs)
            except AttributeError:
                loop = asyncio.get_running_loop()
                return await loop.run_in_executor(None, lambda: func(*args, **kwargs))
        
        while self.running:
            if self.paused:
                await asyncio.sleep(1)
                continue
            
            try:
                # 1. Verificar tela principal
                self.current_step = "detect_screen"
                await send_log("info", "Verificando tela principal...")
                await asyncio.sleep(1)
                
                # 2. Clicar no botão ATACAR (vila)
                self.current_step = "search_village"
                await send_log("info", "Clicando no botão Atacar...")
                await _to_thread(self.adb.tap_percent, *self._coord("attack_button"))

                delay_after_attack_menu_ms = self.config.get("delay_after_attack_menu_ms", 3000)
                await asyncio.sleep(delay_after_attack_menu_ms / 1000.0)

                # 2.1 Em alguns layouts existem 2 botões "Atacar!" em sequência.
                # Primeiro aparece um "Atacar!" grande (canto inferior direito) antes de "Procurar partida".
                await send_log("info", "Confirmando Atacar! (menu)...")
                await _to_thread(self.adb.tap_percent, *self._coord("attack_menu"))
                await asyncio.sleep(1.0)

                # 3. Clicar em "Procurar partida" (abaixo de "Batalha" no print)
                await send_log("info", "Clicando em Procurar partida...")
                await _to_thread(self.adb.tap_percent, *self._coord("find_match"))
                # 1 tap apenas (evita duplo clique acidental)

                delay_after_find_match_ms = self.config.get("delay_after_find_match_ms", 5500)
                await asyncio.sleep(delay_after_find_match_ms / 1000.0)  # Esperar carregar busca

                # 3.1 Confirmar/acionar "Atacar!" imediatamente após "Procurar partida"
                # (alguns layouts exigem esse clique para iniciar a busca)
                await send_log("info", "Confirmando Atacar! (após Procurar partida)...")
                await _to_thread(self.adb.tap_percent, *self._coord("attack_start"))
                await asyncio.sleep(1.0)

                # 4. Loop de busca de vila
                found_target = False
                search_attempts = 0
                max_attempts = self.config.get("max_searches", 50)
                search_start_ts = time.time()
                force_attack_after_s = float(self.config.get("force_attack_after_s", 25))
                
                while not found_target and search_attempts < max_attempts and self.running:
                    if self.paused:
                        await asyncio.sleep(1)
                        continue

                    # Fail-safe: se ficarmos tempo demais nessa etapa (OCR ruim / UI diferente),
                    # forçamos o ataque para não travar após "Procurar partida".
                    if (time.time() - search_start_ts) >= force_attack_after_s:
                        await send_log(
                            "warning",
                            f"Tempo de busca excedeu {force_attack_after_s:.0f}s. Forçando ataque para prosseguir.",
                        )
                        found_target = True
                        break
                        
                    self.current_step = "analyze_village"
                    search_attempts += 1
                    
                    # OCR para ler recursos (ideal: dar um tempinho após carregar a vila)
                    delay_before_ocr_ms = self.config.get("delay_before_ocr_ms", 1200)
                    await asyncio.sleep(delay_before_ocr_ms / 1000.0)

                    # OCR para ler recursos (região superior da tela)
                    ocr_result = await _to_thread(self.adb.ocr_screen, region="resources")
                    resources = ocr_result.get("resources", {})

                    gold = resources.get("gold", 0)
                    elixir = resources.get("elixir", 0)
                    dark_elixir = resources.get("dark_elixir", 0)

                    # Retry simples: se vier 0/0, espera um pouco e tenta 1x de novo
                    if gold == 0 and elixir == 0:
                        await asyncio.sleep(0.8)
                        ocr_result = await _to_thread(self.adb.ocr_screen, region="resources")
                        resources = ocr_result.get("resources", {})
                        gold = resources.get("gold", 0)
                        elixir = resources.get("elixir", 0)
                        dark_elixir = resources.get("dark_elixir", 0)

                    # Fallback (mais amplo): se ainda vier 0/0, tenta um crop maior do topo direito.
                    if gold == 0 and elixir == 0:
                        try:
                            shot = self.adb.screenshot()
                            if shot:
                                img = Image.open(io.BytesIO(shot)).convert("RGB")
                                w, h = img.size
                                # x,y,w,h em pixels
                                region2 = (int(w * 0.38), int(h * 0.00), int(w * 0.62), int(h * 0.26))
                                ocr_result = await _to_thread(self.adb.ocr_screen, region=region2)
                                resources = ocr_result.get("resources", {})
                                gold = resources.get("gold", 0)
                                elixir = resources.get("elixir", 0)
                                dark_elixir = resources.get("dark_elixir", 0)
                        except Exception:
                            pass

                    if gold == 0 and elixir == 0:
                        raw = (ocr_result.get("text", "") or "").strip().replace("\\n", " ")
                        await send_log("warning", f"OCR possivelmente falhou (texto): {raw[:120]}")

                    await send_log("info", f"Vila #{search_attempts}: Ouro={gold:,} | Elixir={elixir:,} | DE={dark_elixir:,}")

                    # Verificar critérios
                    self.current_step = "check_criteria"
                    min_gold = self.config.get("min_gold", 200000)
                    min_elixir = self.config.get("min_elixir", 200000)

                    # Lógica mais permissiva: se OCR falhou completamente (0/0), ainda assim
                    # tenta atacar para não pular vilas boas por falha de leitura.
                    ocr_failed = (gold == 0 and elixir == 0)
                    meets_criteria = (gold >= min_gold and elixir >= min_elixir)

                    if ocr_failed:
                        await send_log("warning", "OCR retornou 0/0. Atacando mesmo assim (possível falha de leitura)")
                        found_target = True
                    elif meets_criteria:
                        found_target = True
                        await send_log("success", f"✓ Vila encontrada! Ouro={gold:,}, Elixir={elixir:,}")
                    else:
                        # Clicar em "Próximo"
                        await send_log(
                            "warning",
                            f"Vila não atende (min: {min_gold:,}/{min_elixir:,}), próxima...",
                        )
                        await _to_thread(self.adb.tap_percent, *self._coord("next_button"))

                        delay_after_next_village_ms = self.config.get("delay_after_next_village_ms", 3500)
                        await asyncio.sleep(delay_after_next_village_ms / 1000.0)  # Esperar carregar próxima vila
                
                if not found_target:
                    await send_log("warning", "Limite de busca atingido, reiniciando ciclo...")
                    # Voltar para tela principal
                    self.adb.tap_percent(0.05, 0.05)  # Fechar janela
                    await asyncio.sleep(2)
                    continue
                
                # 5. ATACAR - 1 tap no botão verde "Atacar!" (iniciar ataque)
                self.current_step = "start_attack"
                await send_log("info", "Iniciando ataque (1 clique em Atacar!)...")
                await _to_thread(self.adb.tap_percent, *self._coord("attack_start"))
                await asyncio.sleep(2)

                # 6. Deploy de tropas
                self.current_step = "deploy_troops"
                await send_log("info", "Deployando tropas (funil + centro)...")

                # Limite duro: não ficar preso em loop de deploy se OCR falhar/oscilar.
                # Após X segundos, seguimos o fluxo para "Ataque em progresso".
                deploy_start_ts = time.time()
                deploy_limit_s = int(self.config.get("deploy_limit_s", 60))

                # --- Estratégia simples e robusta ---
                # 1) Funil: borda esquerda + borda direita (varrendo de cima pra baixo)
                # 2) Entrada: alguns drops no centro pra "empurrar" a vila
                # 3) Tenta soltar heróis e feitiços (melhor esforço, depende do layout)

                # Cada “quadrado” da barra é 1 slot.
                # Por padrão iteramos 1..11 (layout padrão do jogo). Se quiser limitar, use troop_slots_count.
                troop_slots_all = [
                    "troop_slot_1",
                    "troop_slot_2",
                    "troop_slot_3",
                    "troop_slot_4",
                    "troop_slot_5",
                    "troop_slot_6",
                    "troop_slot_7",
                    "troop_slot_8",
                    "troop_slot_9",
                    "troop_slot_10",
                    "troop_slot_11",
                ]
                troop_slots_count = int(self.config.get("troop_slots_count", 11))
                troop_slots = troop_slots_all[: max(1, min(troop_slots_count, len(troop_slots_all)))]

                async def safe_tap_slot(slot_key: str):
                    try:
                        await _to_thread(self.adb.tap_percent, *self._coord(slot_key))
                    except Exception:
                        pass

                # IMPORTANTE: conforme solicitado, NÃO lemos a quantidade disponível (OCR do número do slot).
                # Apenas selecionamos o slot e soltamos tropas por um tempo fixo (deploy_slot_limit_s).

                # Deploy: mais "controlado" (menos espalhado) e rápido.
                # Em vez de tocar em dezenas de pontos por lote, solta várias unidades em
                # poucos pontos-chave (funil esquerda/direita + entrada no centro).
                funnel_left = [(0.16, 0.36), (0.16, 0.46), (0.16, 0.56)]
                funnel_right = [(0.84, 0.36), (0.84, 0.46), (0.84, 0.56)]
                center_entry = [(0.50, 0.70)]

                # Intercala esquerda/direita para garantir drops nos dois lados mesmo
                # quando o tempo do slot (deploy_slot_limit_s) é curto.
                deploy_plan = []
                for i in range(max(len(funnel_left), len(funnel_right))):
                    if i < len(funnel_left):
                        deploy_plan.append(funnel_left[i])
                    if i < len(funnel_right):
                        deploy_plan.append(funnel_right[i])
                deploy_plan += center_entry

                async def tap_many(
                    xp: float,
                    yp: float,
                    n: int,
                    *,
                    delay_s: float = 0.02,
                    deploy_deadline_ts: Optional[float] = None,
                    slot_deadline_ts: Optional[float] = None,
                ):
                    """Dá N taps, mas respeita os deadlines em tempo real (global e por slot)."""
                    for _ in range(max(0, n)):
                        if not self.running:
                            return
                        now = time.time()
                        if deploy_deadline_ts is not None and now >= deploy_deadline_ts:
                            return
                        if slot_deadline_ts is not None and now >= slot_deadline_ts:
                            return
                        await _to_thread(self.adb.tap_percent, xp, yp)
                        await asyncio.sleep(delay_s)

                for slot in troop_slots:
                    if not self.running:
                        break

                    if (time.time() - deploy_start_ts) >= deploy_limit_s:
                        await send_log(
                            "warning",
                            f"Deploy de tropas atingiu {deploy_limit_s}s. Seguindo para Ataque em progresso...",
                        )
                        break

                    slot_start_ts = time.time()
                    slot_limit_s = float(self.config.get("deploy_slot_limit_s", 6))
                    deploy_deadline_ts = deploy_start_ts + float(deploy_limit_s)
                    slot_deadline_ts = slot_start_ts + max(0.0, slot_limit_s)

                    await send_log("info", f"Slot {slot}: deploy por {slot_limit_s}s (sem OCR)")

                    # Deploy por tempo fixo no slot
                    await safe_tap_slot(slot)
                    await asyncio.sleep(0.12)
                    while self.running:
                        now = time.time()
                        if now >= deploy_deadline_ts:
                            break
                        if now >= slot_deadline_ts:
                            break

                        # mantém o slot selecionado e solta em poucos pontos-chave
                        # Reforça seleção, mas também respeita o limite do slot em tempo real
                        if time.time() >= slot_deadline_ts:
                            break
                        await safe_tap_slot(slot)
                        await asyncio.sleep(0.08)
                        for (dx, dy) in deploy_plan:
                            if not self.running:
                                break
                            if time.time() >= slot_deadline_ts:
                                break
                            await tap_many(
                                dx,
                                dy,
                                6,
                                delay_s=0.03,
                                deploy_deadline_ts=deploy_deadline_ts,
                                slot_deadline_ts=slot_deadline_ts,
                            )
                        await asyncio.sleep(0.10)

                # Heróis (melhor esforço): normalmente ficam no lado direito da barra inferior
                await asyncio.sleep(0.3)
                for hero_x in [0.70, 0.76, 0.82, 0.88]:
                    if not self.running:
                        break
                    await _to_thread(self.adb.tap_percent, hero_x, 0.95)  # seleciona herói
                    await asyncio.sleep(0.25)
                    # solta herói no centro
                    await _to_thread(self.adb.tap_percent, 0.50, 0.68)
                    await asyncio.sleep(0.2)

                # Feitiços (melhor esforço): geralmente no canto direito da barra
                for spell_key in ["spell_slot_1", "spell_slot_2"]:
                    if not self.running:
                        break
                    # seleciona feitiço
                    try:
                        await _to_thread(self.adb.tap_percent, *self.coords.get(spell_key, (0.86, 0.95)))
                    except Exception:
                        pass
                    await asyncio.sleep(0.2)
                    # solta feitiço (um pouco acima do centro, costuma funcionar melhor)
                    await _to_thread(self.adb.tap_percent, 0.52, 0.58)
                    await asyncio.sleep(0.15)

                # Esperar tropas agirem (120s)
                await send_log("info", "Aguardando tropas (120s)...")
                self.current_step = "wait_attack"

                for i in range(24):  # 120 segundos em intervalos de 5s
                    if not self.running:
                        break
                    await asyncio.sleep(5)
                    await send_log("info", f"Ataque em progresso... {(i+1)*5}s")
                
                # 7. Finalizar batalha
                self.current_step = "end_attack"
                await send_log("info", "Finalizando batalha...")
                await _to_thread(self.adb.tap_percent, *self.coords["end_battle"])
                await asyncio.sleep(1)
                await _to_thread(self.adb.tap_percent, *self.coords["end_battle_confirm"])
                # Aguarda o painel de vitória carregar antes do OCR dos ganhos
                victory_screen_wait_s = float(self.config.get("victory_screen_wait_s", 4))
                await send_log("info", f"Aguardando painel de ganhos ({victory_screen_wait_s:.0f}s)...")
                await asyncio.sleep(max(0.0, victory_screen_wait_s))

                # 7.1 Ler ganhos no painel de vitória ("Você ganhou")
                # Objetivo: pegar exatamente os valores de ouro/elixir/DE ganhos, não estimativa.
                def _parse_number_any(s: str) -> int:
                    import re
                    if not s:
                        return 0
                    # IMPORTANTE:
                    # O OCR às vezes retorna MAIS DE UM número na mesma faixa (ex.: quebra de linha
                    # ou ruído que captura parte da linha de baixo). Se simplesmente "limpar" tudo,
                    # acabamos concatenando (ex.: 498.555 + 18.983 => 498.555.18.983).
                    # Então extraímos *tokens numéricos* e pegamos o maior (mais plausível).
                    tokens = re.findall(r"\d{1,3}(?:[\s\u00A0\.,]\d{3})*|\d+", s)
                    best = 0
                    for t in tokens:
                        try:
                            v = int(t.replace(" ", "").replace("\u00A0", "").replace(".", "").replace(",", ""))
                            if v > best:
                                best = v
                        except Exception:
                            pass
                    return best

                async def read_victory_loot() -> Dict[str, int]:
                    victory_ocr_retries = int(self.config.get("victory_ocr_retries", 3))
                    victory_ocr_debug = bool(self.config.get("victory_ocr_debug", False))

                    def _read_sync() -> Tuple[Dict[str, int], Dict[str, str]]:
                        shot = self.adb.screenshot()
                        if not shot:
                            return {"gold": 0, "elixir": 0, "dark_elixir": 0}, {}

                        img = Image.open(io.BytesIO(shot)).convert("RGB")
                        w, h = img.size

                        # Debug: se o OCR der 0, vamos salvar automaticamente imagens de referência.
                        # Isso é essencial para ajustar ROI quando o recorte não pega o painel "Você ganhou".
                        debug_dir = ""
                        ts = int(time.time() * 1000)
                        debug_enabled = victory_ocr_debug  # pode virar True automaticamente quando OCR=0

                        # Tentativas de ROI (alguns emuladores mudam muito o layout/escala)
                        roi_presets = [
                            # mais "apertado" (rápido quando encaixa)
                            (0.34, 0.40, 0.64, 0.74),
                            # mais amplo (tende a funcionar melhor em escalas diferentes)
                            (0.28, 0.36, 0.72, 0.80),
                            # super amplo (último recurso quando a UI está deslocada/zoom diferente)
                            (0.18, 0.28, 0.84, 0.88),
                        ]

                        # IMPORTANT: não use "lista de números" aqui.
                        # Para ficar estável, separamos o bloco em 3 faixas (ouro / elixir / elixir negro)
                        # e fazemos OCR por faixa.

                        def _ocr_band(roi: Image.Image, y_from: float, y_to: float, invert: bool) -> Tuple[int, str]:
                            band = roi.crop((
                                0,
                                int(roi.size[1] * y_from),
                                roi.size[0],
                                int(roi.size[1] * y_to),
                            ))
                            arr = np.array(band)
                            g = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
                            g = cv2.resize(g, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
                            g = cv2.GaussianBlur(g, (3, 3), 0)
                            thresh_type = cv2.THRESH_BINARY_INV if invert else cv2.THRESH_BINARY
                            _, t = cv2.threshold(g, 0, 255, thresh_type + cv2.THRESH_OTSU)
                            # psm 6 costuma ser mais tolerante do que psm 7 (linha única)
                            txt = pytesseract.image_to_string(
                                t,
                                config="--psm 6 -c tessedit_char_whitelist=0123456789.,",
                            )
                            # fallback dentro da faixa: às vezes a whitelist/psm mata tudo
                            if not (txt or "").strip():
                                txt = pytesseract.image_to_string(t, config="--psm 7")
                            return _parse_number_any(txt), txt

                        best = {"gold": 0, "elixir": 0, "dark_elixir": 0}
                        best_raw: Dict[str, str] = {}
                        best_sum = 0

                        # roda combinações (ROI preset x invert) até achar algo plausível
                        for (rx1, ry1, rx2, ry2) in roi_presets:
                            roi = img.crop((int(w * rx1), int(h * ry1), int(w * rx2), int(h * ry2)))

                            for invert in (False, True):
                                g, raw_g = _ocr_band(roi, 0.06, 0.36, invert)
                                e, raw_e = _ocr_band(roi, 0.36, 0.66, invert)
                                d, raw_d = _ocr_band(roi, 0.66, 0.96, invert)
                                s = int(g) + int(e) + int(d)
                                if s > best_sum:
                                    best_sum = s
                                    best = {"gold": int(g), "elixir": int(e), "dark_elixir": int(d)}
                                    best_raw = {"gold": raw_g, "elixir": raw_e, "dark_elixir": raw_d}
                                # early exit se já temos algo bom
                                if s >= 5000:
                                    return best, best_raw

                        # Se ainda está 0, ativa debug automaticamente e salva imagens para inspeção
                        if best_sum == 0:
                            debug_enabled = True
                            try:
                                debug_dir = os.path.join(os.getcwd(), "debug_victory")
                                os.makedirs(debug_dir, exist_ok=True)
                                full_path = os.path.join(debug_dir, f"victory_full_{ts}.png")
                                img.save(full_path)
                                # salva ROIs testados
                                for (rx1, ry1, rx2, ry2) in roi_presets:
                                    try:
                                        roi = img.crop((int(w * rx1), int(h * ry1), int(w * rx2), int(h * ry2)))
                                        roi_path = os.path.join(
                                            debug_dir,
                                            f"victory_roi_{int(rx1*100)}_{int(ry1*100)}_{int(rx2*100)}_{int(ry2*100)}_{ts}.png",
                                        )
                                        roi.save(roi_path)
                                    except Exception:
                                        pass
                            except Exception:
                                debug_dir = ""

                        # Fallback extra: se veio TUDO vazio, tenta um OCR mais permissivo no ROI mais amplo.
                        # (sem whitelist e com outro psm) — às vezes o jogo usa fonte/anti-alias que o Otsu perde.
                        if best_sum == 0:
                            try:
                                rx1, ry1, rx2, ry2 = roi_presets[-1]
                                roi = img.crop((int(w * rx1), int(h * ry1), int(w * rx2), int(h * ry2)))
                                arr = np.array(roi)
                                g = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
                                g = cv2.resize(g, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
                                g = cv2.GaussianBlur(g, (3, 3), 0)
                                # tenta limiar adaptativo (melhor quando fundo varia)
                                t = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2)
                                txt = pytesseract.image_to_string(t, config="--psm 6")
                                # extrai 3 maiores números como aproximação (ouro/elixir/DE)
                                import re
                                vals = []
                                for tok in re.findall(r"\d{1,3}(?:[\s\u00A0\.,]\d{3})*|\d+", txt or ""):
                                    try:
                                        v = int(tok.replace(" ", "").replace("\u00A0", "").replace(".", "").replace(",", ""))
                                        if v > 0:
                                            vals.append(v)
                                    except Exception:
                                        pass
                                vals = sorted(vals, reverse=True)
                                if len(vals) >= 1:
                                    # como fallback, preenche do maior pro menor (não perfeito, mas melhor que 0)
                                    best = {
                                        "gold": int(vals[0]),
                                        "elixir": int(vals[1]) if len(vals) >= 2 else 0,
                                        "dark_elixir": int(vals[2]) if len(vals) >= 3 else 0,
                                    }
                                    best_raw = {"gold": txt or "", "elixir": txt or "", "dark_elixir": txt or ""}
                            except Exception:
                                pass

                        return best, best_raw

                    try:
                        best_loot: Dict[str, int] = {"gold": 0, "elixir": 0, "dark_elixir": 0}
                        best_raw: Dict[str, str] = {}

                        tries = max(1, min(victory_ocr_retries, 6))
                        for i in range(tries):
                            loot_i, raw_i = await _to_thread(_read_sync)
                            if (loot_i.get("gold", 0) + loot_i.get("elixir", 0) + loot_i.get("dark_elixir", 0)) > (
                                best_loot.get("gold", 0) + best_loot.get("elixir", 0) + best_loot.get("dark_elixir", 0)
                            ):
                                best_loot, best_raw = loot_i, raw_i
                            if (best_loot.get("gold", 0) + best_loot.get("elixir", 0) + best_loot.get("dark_elixir", 0)) > 0:
                                break
                            await asyncio.sleep(0.4)  # micro atraso para o painel estabilizar

                        if debug_enabled or (
                            best_loot.get("gold", 0) == 0
                            and best_loot.get("elixir", 0) == 0
                            and best_loot.get("dark_elixir", 0) == 0
                        ):
                            await send_log("info", f"[DEBUG] OCR vitória raw gold: {best_raw.get('gold','').strip()}")
                            await send_log("info", f"[DEBUG] OCR vitória raw elixir: {best_raw.get('elixir','').strip()}")
                            await send_log("info", f"[DEBUG] OCR vitória raw DE: {best_raw.get('dark_elixir','').strip()}")
                            if debug_dir:
                                await send_log("info", f"[DEBUG] Imagens de debug salvas em: {debug_dir}")

                        return best_loot
                    except Exception:
                        return {"gold": 0, "elixir": 0, "dark_elixir": 0}

                loot = await read_victory_loot()
                loot_gold = int(loot.get("gold", 0) or 0)
                loot_elixir = int(loot.get("elixir", 0) or 0)
                loot_dark = int(loot.get("dark_elixir", 0) or 0)

                if loot_gold == 0 and loot_elixir == 0 and loot_dark == 0:
                    await send_log(
                        "warning",
                        "Não consegui ler os ganhos no painel de vitória (OCR=0). Vou registrar 0 e seguir.",
                    )
                
                # 8. Voltar para casa
                self.current_step = "return_home"
                await _to_thread(self.adb.tap_percent, *self.coords["return_home"])
                await asyncio.sleep(3)

                # Atualizar stats (valores reais via OCR no painel de vitória)
                self.stats["attacks"] += 1
                self.stats["gold"] += loot_gold
                self.stats["elixir"] += loot_elixir
                self.stats["dark_elixir"] += loot_dark

                await send_log(
                    "success",
                    f"✓ Ataque #{self.stats['attacks']} concluído! +{loot_gold:,} ouro, +{loot_elixir:,} elixir, +{loot_dark:,} DE",
                )

                # Enviar stats atualizadas para o painel web
                if self.ws_server:
                    try:
                        await self.ws_server.send_message("stats", {
                            "attacks_completed": self.stats["attacks"],
                            "gold_collected": self.stats["gold"],
                            "elixir_collected": self.stats["elixir"],
                            "dark_elixir_collected": self.stats["dark_elixir"],
                            "walls_upgraded": self.stats["walls"]
                        })
                    except Exception:
                        pass
                
                # 9. Pausa aleatória
                self.current_step = "random_pause"
                pause_min = self.config.get("pause_min", 10)
                pause_max = self.config.get("pause_max", 60)
                pause_time = pause_min + (pause_max - pause_min) * 0.5
                await send_log("info", f"Pausa de {pause_time:.0f}s antes do próximo ataque...")
                await asyncio.sleep(pause_time)
                
            except asyncio.CancelledError:
                self.running = False
                break
            except Exception as e:
                await send_log("error", f"Erro: {str(e)}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(5)
        
        await send_log("info", "Bot parado")


class WebSocketServer:
    def __init__(self):
        self.adb = ADBController()
        self.bot: Optional[BotController] = None
        self.bot_task: Optional[asyncio.Task] = None
        self.websocket = None
        self._status_task: Optional[asyncio.Task] = None
        self.config = {
            "min_gold": 200000,
            "min_elixir": 200000,
            "min_dark_elixir": 1000,
            "max_searches": 50,
            "auto_wall_upgrade": True,
            "pause_min": 15,
            "pause_max": 15,
            "troop_type": "barbarian",

            # Delays (ms) - defaults alinhados com o painel web
            "delay_after_attack_menu_ms": 3000,
            "delay_after_find_match_ms": 5500,
            "delay_after_next_village_ms": 3500,
            "delay_before_ocr_ms": 1200,
        }
    
    async def send_message(self, msg_type: str, payload: Any):
        """Envia mensagem para o cliente web"""
        if self.websocket:
            message = {
                "type": msg_type,
                "payload": payload,
                "timestamp": int(time.time() * 1000)
            }
            try:
                await self.websocket.send(json.dumps(message))
            except Exception as e:
                print(f"[WS] Erro ao enviar: {e}")
    
    async def send_log(self, level: str, message: str):
        """Envia log para o cliente"""
        print(f"[BOT] [{level.upper()}] {message}")
        await self.send_message("log", {
            "level": level,
            "message": message,
            "step": self.bot.current_step if self.bot else None
        })

    async def _send_periodic_status(self):
        """Envia status periodicamente para manter UI sincronizada"""
        while self.bot and self.bot.running:
            status = "paused" if self.bot.paused else "running"
            await self.send_message("status", {"status": status})
            await asyncio.sleep(3)
    
    async def handle_command(self, command: Dict[str, Any]):
        """Processa comandos recebidos"""
        action = command.get("action")
        params = command.get("params", {})
        
        print(f"[WS] Comando recebido: {action}")
        
        if action == "start":
            if not self.adb.connected:
                if not self.adb.connect():
                    await self.send_log("error", "Falha ao conectar ao BlueStacks via ADB")
                    await self.send_message("status", {"status": "idle"})
                    return
                await self.send_log("success", f"Conectado ao BlueStacks ({self.adb.screen_width}x{self.adb.screen_height})")
            
            self.bot = BotController(self.adb, self.config)
            self.bot.ws_server = self  # passar referência para envio de stats
            self.bot_task = asyncio.create_task(self.bot.run(self.send_log))
            await self.send_message("status", {"status": "running"})

            # Iniciar envio periódico de status
            if self._status_task:
                self._status_task.cancel()
            self._status_task = asyncio.create_task(self._send_periodic_status())
            
        elif action == "stop":
            if self.bot:
                self.bot.request_stop()
            if self._status_task:
                self._status_task.cancel()
                self._status_task = None
            # Importante: NÃO usar cancel() aqui.
            # O bot faz OCR/ADB (bloqueantes). Forçar cancel() costuma travar/atrasar o loop
            # e impede o servidor WS de processar novos comandos.
            await self.send_message("status", {"status": "idle"})
            await self.send_log("info", "Bot parado pelo usuário")
            
        elif action == "pause":
            if self.bot:
                self.bot.paused = True
            await self.send_message("status", {"status": "paused"})
            await self.send_log("info", "Bot pausado")
            
        elif action == "resume":
            if self.bot:
                self.bot.paused = False
            await self.send_message("status", {"status": "running"})
            await self.send_log("info", "Bot retomado")
            
        elif action == "update_config":
            self.config.update(params)
            if self.bot:
                self.bot.config = self.config
            await self.send_log("info", f"Configuração atualizada: {params}")
            
        elif action == "screenshot":
            if not self.adb.connected:
                self.adb.connect()
            screenshot = self.adb.screenshot()
            if screenshot:
                b64 = base64.b64encode(screenshot).decode()
                await self.send_message("screenshot", {"image": b64})
                await self.send_log("info", "Screenshot capturado")
            else:
                await self.send_log("error", "Falha ao capturar screenshot")
                
        elif action == "tap":
            if not self.adb.connected:
                self.adb.connect()

            if "x_percent" in params and "y_percent" in params:
                xp = float(params.get("x_percent", 0))
                yp = float(params.get("y_percent", 0))
                self.adb.tap_percent(xp, yp)
                await self.send_log("info", f"Tap (percent) em ({xp:.3f}, {yp:.3f})")
            else:
                x, y = params.get("x", 0), params.get("y", 0)
                self.adb.tap(x, y)
                await self.send_log("info", f"Tap em ({x}, {y})")
            
        elif action == "test_coords":
            # Testar coordenadas - clica em cada posição importante
            await self.send_log("info", "Testando coordenadas...")
            if not self.adb.connected:
                self.adb.connect()
            
            await self.send_log("info", "Clicando em Attack Button...")
            self.adb.tap_percent(0.04, 0.82)
            await asyncio.sleep(2)
            
            await self.send_log("info", "Salvando screenshot...")
            self.adb.save_debug_screenshot("test_coords")
    
    async def handler(self, websocket):
        """Handler principal do WebSocket"""
        self.websocket = websocket
        print(f"[WS] Cliente conectado: {websocket.remote_address}")
        
        # Tentar conectar ao ADB automaticamente
        adb_connected = self.adb.connect()
        
        await self.send_message("status", {
            "status": "connected",
            "adb_connected": adb_connected,
            "screen_size": f"{self.adb.screen_width}x{self.adb.screen_height}" if adb_connected else None
        })
        
        if adb_connected:
            await self.send_log("success", f"ADB conectado: {self.adb.device_id} ({self.adb.screen_width}x{self.adb.screen_height})")
        else:
            await self.send_log("warning", "ADB não conectado - verifique se o BlueStacks está rodando")
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data.get("type") == "command":
                        await self.handle_command(data.get("payload", {}))
                except json.JSONDecodeError:
                    print(f"[WS] Mensagem inválida: {message}")
        except websockets.ConnectionClosed:
            print("[WS] Cliente desconectado")
        finally:
            self.websocket = None
            if self.bot:
                self.bot.running = False
    
    async def start(self):
        """Inicia o servidor WebSocket"""
        print()
        print("=" * 50)
        print("  COC Farm Bot - ADB Controller")
        print("=" * 50)
        print()
        print("Requisitos:")
        print("  1. BlueStacks rodando com ADB habilitado")
        print("  2. ADB instalado e no PATH")
        print("  3. Clash of Clans aberto no BlueStacks")
        print()
        print("Para habilitar ADB no BlueStacks:")
        print("  Configurações > Avançadas > Android Debug Bridge > ON")
        print()
        print(f"[WS] Iniciando servidor na porta {WS_PORT}...")
        print("[WS] Aguardando conexão do painel web...")
        
        async with websockets.serve(self.handler, "localhost", WS_PORT):
            await asyncio.Future()  # Run forever


if __name__ == "__main__":
    server = WebSocketServer()
    asyncio.run(server.start())
`;

export const PythonScriptPanel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Card>>(
  ({ className, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

     const normalizedScript = React.useMemo(() => {
       // Garante indentação consistente (múltiplos de 4 espaços) para evitar IndentationError.
       const lines = PYTHON_SCRIPT.replace(/\t/g, '    ').replace(/\r\n/g, '\n').split('\n');
       const fixed = lines.map((line) => {
         const m = line.match(/^( +)/);
         if (!m) return line.replace(/[ \t]+$/g, '');
         const lead = m[1].length;
         const fixedLead = lead - (lead % 4);
         return ' '.repeat(fixedLead) + line.slice(lead).replace(/[ \t]+$/g, '');
       });
       return fixed.join('\n');
     }, []);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(normalizedScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
      // Alguns navegadores/ambientes (ex.: Safari/WebView) não iniciam o download
      // se o <a> não estiver no DOM ou se o ObjectURL for revogado imediatamente.
      const blob = new Blob([normalizedScript], { type: 'text/x-python;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'coc_bot_controller.py';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Aguarda o tick do navegador antes de revogar.
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    return (
      <Card ref={ref} className={["border-border bg-card/80", className].filter(Boolean).join(' ')} {...props}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-gaming text-sm tracking-wider">
              <Terminal className="w-4 h-4 text-primary" />
              SCRIPT PYTHON
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs">
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <h4 className="text-sm font-medium mb-2">Instruções:</h4>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Instale as dependências: <code className="px-1.5 py-0.5 rounded bg-secondary text-foreground">py -m pip install websockets pillow pytesseract opencv-python numpy</code></li>
                <li>Habilite ADB no BlueStacks: Configurações → Avançadas → Android Debug Bridge → ON</li>
                <li>Abra o Clash of Clans no BlueStacks</li>
                <li>Execute o script: <code className="px-1.5 py-0.5 rounded bg-secondary text-foreground">python coc_bot_controller.py</code></li>
                <li>Clique em "Conectar ADB" no painel</li>
              </ol>
            </div>

            <ScrollArea className="h-[300px] rounded-lg border border-border">
              <pre className="p-4 text-xs leading-relaxed">
                <code className="text-muted-foreground">{PYTHON_SCRIPT}</code>
              </pre>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    );
  }
);

PythonScriptPanel.displayName = 'PythonScriptPanel';
