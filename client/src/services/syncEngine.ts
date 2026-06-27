/**
 * Offline Sync Engine with Conflict Resolution
 * 
 * Strategy: Last-Write-Wins with conflict detection
 * 
 * When the app goes offline:
 * 1. All mutations are queued in IndexedDB with timestamps
 * 2. When back online, queued mutations are replayed against the server
 * 3. If a conflict is detected (server data changed since our read), 
 *    we present the conflict to the user for resolution
 * 
 * Sync Queue Structure:
 * - id: auto-incremented
 * - entity: 'item' | 'bill' | 'purchase' | 'customer' | 'expense'
 * - action: 'create' | 'update' | 'delete'
 * - entityId: the ID of the entity (null for creates)
 * - payload: the mutation data
 * - timestamp: when the mutation was made locally
 * - status: 'pending' | 'synced' | 'conflict' | 'failed'
 * - serverVersion: last known server version at time of mutation
 */

import Dexie, { type Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  entity: string;
  action: 'create' | 'update' | 'delete';
  entityId: number | null;
  payload: any;
  timestamp: string;
  status: 'pending' | 'synced' | 'conflict' | 'failed';
  serverVersion?: string;
  conflictData?: any;
  retryCount: number;
}

export interface SyncState {
  lastSyncAt: string | null;
  pendingCount: number;
  conflictCount: number;
  isSyncing: boolean;
}

class SyncDatabase extends Dexie {
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('jj_sync');
    this.version(1).stores({
      syncQueue: '++id, entity, action, entityId, status, timestamp',
    });
  }
}

const syncDb = new SyncDatabase();

/**
 * Add a mutation to the sync queue
 */
export async function queueMutation(
  entity: string,
  action: 'create' | 'update' | 'delete',
  entityId: number | null,
  payload: any
): Promise<void> {
  await syncDb.syncQueue.add({
    entity,
    action,
    entityId,
    payload,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  });
}

/**
 * Get current sync state
 */
export async function getSyncState(): Promise<SyncState> {
  const pending = await syncDb.syncQueue.where('status').equals('pending').count();
  const conflicts = await syncDb.syncQueue.where('status').equals('conflict').count();

  return {
    lastSyncAt: localStorage.getItem('jj_last_sync'),
    pendingCount: pending,
    conflictCount: conflicts,
    isSyncing: false,
  };
}

/**
 * Get all pending mutations
 */
export async function getPendingMutations(): Promise<SyncQueueItem[]> {
  return syncDb.syncQueue.where('status').equals('pending').sortBy('timestamp');
}

/**
 * Get all conflicts for user resolution
 */
export async function getConflicts(): Promise<SyncQueueItem[]> {
  return syncDb.syncQueue.where('status').equals('conflict').toArray();
}

/**
 * Resolve a conflict by choosing local or server version
 */
export async function resolveConflict(
  queueItemId: number,
  resolution: 'keep_local' | 'keep_server'
): Promise<void> {
  if (resolution === 'keep_server') {
    // Discard local change
    await syncDb.syncQueue.update(queueItemId, { status: 'synced' });
  } else {
    // Re-queue as pending with force flag
    await syncDb.syncQueue.update(queueItemId, {
      status: 'pending',
      payload: { ...(await syncDb.syncQueue.get(queueItemId))?.payload, _forceOverwrite: true },
    });
  }
}

/**
 * Execute sync — replay pending mutations against server
 * Returns count of successful syncs and conflicts
 */
export async function executeSyncQueue(
  apiFn: (entity: string, action: string, entityId: number | null, payload: any) => Promise<{ success: boolean; conflict?: boolean; serverData?: any }>
): Promise<{ synced: number; conflicts: number; failed: number }> {
  const pending = await getPendingMutations();
  let synced = 0;
  let conflicts = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const result = await apiFn(item.entity, item.action, item.entityId, item.payload);

      if (result.success) {
        await syncDb.syncQueue.update(item.id!, { status: 'synced' });
        synced++;
      } else if (result.conflict) {
        await syncDb.syncQueue.update(item.id!, {
          status: 'conflict',
          conflictData: result.serverData,
        });
        conflicts++;
      } else {
        const retryCount = (item.retryCount || 0) + 1;
        if (retryCount >= 3) {
          await syncDb.syncQueue.update(item.id!, { status: 'failed', retryCount });
          failed++;
        } else {
          await syncDb.syncQueue.update(item.id!, { retryCount });
        }
      }
    } catch (err) {
      const retryCount = (item.retryCount || 0) + 1;
      if (retryCount >= 3) {
        await syncDb.syncQueue.update(item.id!, { status: 'failed', retryCount });
        failed++;
      } else {
        await syncDb.syncQueue.update(item.id!, { retryCount });
      }
    }
  }

  localStorage.setItem('jj_last_sync', new Date().toISOString());
  return { synced, conflicts, failed };
}

/**
 * Clear all synced items from the queue (cleanup)
 */
export async function cleanSyncedItems(): Promise<void> {
  await syncDb.syncQueue.where('status').equals('synced').delete();
}

/**
 * Clear entire sync queue (reset)
 */
export async function clearSyncQueue(): Promise<void> {
  await syncDb.syncQueue.clear();
}
