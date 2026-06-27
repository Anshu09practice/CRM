/**
 * Real-time WebSocket layer using Socket.io
 * 
 * Provides real-time notifications for multi-user scenarios:
 * - Stock updates when purchases/bills are created
 * - New bill notifications
 * - Low stock alerts
 * - User activity presence
 */

import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { Server, Socket } from 'socket.io';
import { verifyToken, AuthPayload } from '../middleware/auth';

let io: Server | null = null;

export interface RealTimeEvent {
  type: 'stock_update' | 'bill_created' | 'bill_updated' | 'low_stock' | 'item_updated' | 'expense_added' | 'payment_received';
  payload: any;
  userId: number;
  username: string;
  timestamp: string;
}

/**
 * Initialize Socket.io server attached to the HTTP/HTTPS server
 */
export function initWebSocket(server: HttpServer | HttpsServer): Server {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow same origins as the REST API
        if (!origin) return callback(null, true);
        const allowedOrigins = process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',')
          : ['http://localhost:5173', 'https://localhost:3001', 'capacitor://localhost', 'https://localhost'];
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (origin.match(/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for WebSocket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    // Attach user data to socket
    (socket as any).user = payload;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;
    console.log(`  WS: ${user.username} connected`);

    // Join user-specific room for targeted messages
    socket.join(`user:${user.userId}`);
    socket.join('all'); // Global room for broadcasts

    // Broadcast user presence
    io!.to('all').emit('user:online', { userId: user.userId, username: user.username });

    socket.on('disconnect', () => {
      io!.to('all').emit('user:offline', { userId: user.userId, username: user.username });
    });
  });

  console.log('  WebSocket server initialized');
  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Emit a real-time event to all connected clients
 */
export function emitEvent(event: RealTimeEvent): void {
  if (!io) return;

  const eventName = `event:${event.type}`;
  io.to('all').emit(eventName, {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });
}

/**
 * Notify all clients about a stock change
 */
export function notifyStockUpdate(itemId: number, itemName: string, newStock: number, userId: number, username: string): void {
  emitEvent({
    type: 'stock_update',
    payload: { itemId, itemName, newStock },
    userId,
    username,
    timestamp: new Date().toISOString(),
  });

  // Also emit low stock alert if applicable
  if (newStock <= 10) {
    emitEvent({
      type: 'low_stock',
      payload: { itemId, itemName, currentStock: newStock },
      userId,
      username,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Notify all clients about a new bill
 */
export function notifyBillCreated(billId: number, billNumber: string, total: number, customerName: string, userId: number, username: string): void {
  emitEvent({
    type: 'bill_created',
    payload: { billId, billNumber, total, customerName },
    userId,
    username,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify about a payment received
 */
export function notifyPaymentReceived(billId: number, billNumber: string, amount: number, userId: number, username: string): void {
  emitEvent({
    type: 'payment_received',
    payload: { billId, billNumber, amount },
    userId,
    username,
    timestamp: new Date().toISOString(),
  });
}
