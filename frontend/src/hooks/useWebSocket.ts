import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentEvent } from '../types';

export const useWebSocket = (projectId?: string) => {
  const [messages, setMessages] = useState<AgentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/projects/${projectId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: AgentEvent = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.error('Failed to parse websocket message', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3s
      setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { messages, isConnected, setMessages };
};
