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
import { Server } from 'socket.io';
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
export declare function initWebSocket(server: HttpServer | HttpsServer): Server;
/**
 * Get the Socket.io server instance
 */
export declare function getIO(): Server | null;
/**
 * Emit a real-time event to all connected clients
 */
export declare function emitEvent(event: RealTimeEvent): void;
/**
 * Notify all clients about a stock change
 */
export declare function notifyStockUpdate(itemId: number, itemName: string, newStock: number, userId: number, username: string): void;
/**
 * Notify all clients about a new bill
 */
export declare function notifyBillCreated(billId: number, billNumber: string, total: number, customerName: string, userId: number, username: string): void;
/**
 * Notify about a payment received
 */
export declare function notifyPaymentReceived(billId: number, billNumber: string, amount: number, userId: number, username: string): void;
//# sourceMappingURL=realtime.d.ts.map