/**
 * Real-time WebSocket client hook for receiving server events.
 * Provides live updates for multi-user scenarios.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { get_API_BASE } from '../services/api';

export interface RealTimeEvent {
  type: string;
  payload: any;
  userId: number;
  username: string;
  timestamp: string;
}

type EventHandler = (event: RealTimeEvent) => void;

interface UseRealtimeOptions {
  enabled?: boolean;
  onStockUpdate?: EventHandler;
  onBillCreated?: EventHandler;
  onLowStock?: EventHandler;
  onPaymentReceived?: EventHandler;
  onUserOnline?: (data: { userId: number; username: string }) => void;
  onUserOffline?: (data: { userId: number; username: string }) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ userId: number; username: string }[]>([]);

  const connect = useCallback(() => {
    const token = localStorage.getItem('jj_token');
    if (!token || !enabled) return;

    // Determine WebSocket URL from API base
    const apiBase = get_API_BASE();
    const wsUrl = apiBase.startsWith('http') ? apiBase.replace(/\/api$/, '') : window.location.origin;

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Real-time event handlers
    socket.on('event:stock_update', (event: RealTimeEvent) => {
      options.onStockUpdate?.(event);
    });

    socket.on('event:bill_created', (event: RealTimeEvent) => {
      options.onBillCreated?.(event);
    });

    socket.on('event:low_stock', (event: RealTimeEvent) => {
      options.onLowStock?.(event);
    });

    socket.on('event:payment_received', (event: RealTimeEvent) => {
      options.onPaymentReceived?.(event);
    });

    // Presence
    socket.on('user:online', (data: { userId: number; username: string }) => {
      setOnlineUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });
      options.onUserOnline?.(data);
    });

    socket.on('user:offline', (data: { userId: number; username: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      options.onUserOffline?.(data);
    });

    socketRef.current = socket;
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connected, onlineUsers, disconnect, reconnect: connect };
}
