import { useEffect, useState, useCallback } from 'react';
import { WebSocketMessage } from '@reconcilo/shared';

export function useWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const sendMessage = useCallback((action: string, data?: any) => {
    console.log(`[WebSocket Mock] Outgoing action: ${action}`, data);
  }, []);

  useEffect(() => {
    // Stubbed WebSocket live simulator
    console.log('[WebSocket Hook] Initializing live dashboard subscription...');
    setIsConnected(true);

    const interval = setInterval(() => {
      // Periodic ping
      sendMessage('ping');
    }, 30000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [sendMessage]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}
