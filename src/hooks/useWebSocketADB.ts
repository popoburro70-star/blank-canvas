import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ADBMessage {
  type: 'command' | 'status' | 'log' | 'screenshot' | 'ocr_result' | 'error' | 'stats';
  payload: unknown;
  timestamp: number;
}

export interface ADBCommand {
  action: 'start' | 'stop' | 'pause' | 'resume' | 'tap' | 'swipe' | 'screenshot' | 'ocr' | 'update_config';
  params?: Record<string, unknown>;
}

const WS_URL = 'ws://localhost:8765';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocketADB() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<ADBMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        console.log('[ADB] WebSocket connected');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        // Auto-reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };

      ws.onerror = (error) => {
        console.error('[ADB] WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onmessage = (event) => {
        try {
          const message: ADBMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (e) {
          console.error('[ADB] Failed to parse message:', e);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[ADB] Failed to create WebSocket:', error);
      setConnectionStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionStatus('disconnected');
  }, []);

  const sendCommand = useCallback((command: ADBCommand) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error('[ADB] Cannot send command - WebSocket not connected');
      return false;
    }

    const message: ADBMessage = {
      type: 'command',
      payload: command,
      timestamp: Date.now(),
    };

    wsRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  return {
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    sendCommand,
    isConnected: connectionStatus === 'connected',
  };
}
