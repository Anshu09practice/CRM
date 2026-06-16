import Dexie, { Table } from 'dexie';

export interface OfflineItem {
  id?: number;
  item_name: string;
  package_quantity_grams: number;
  purchase_cost: number;
  selling_price: number;
  mrp: number;
  packaging_style: 'packet' | 'standing_package';
  packets_per_bundle: number;
  bundle_weight_grams: number;
  created_at?: string;
  updated_at?: string;
  _synced?: boolean;
  _action?: 'create' | 'update' | 'delete';
}

class OfflineDB extends Dexie {
  items!: Table<OfflineItem, number>;

  constructor() {
    super('JalanJyothiCRM');
    this.version(1).stores({
      items: '++id, item_name, packaging_style, _synced'
    });
  }
}

export const offlineDb = new OfflineDB();

/**
 * Sync local cache with server data
 */
export async function syncFromServer(serverItems: OfflineItem[]) {
  await offlineDb.items.clear();
  await offlineDb.items.bulkAdd(
    serverItems.map(item => ({ ...item, _synced: true }))
  );
}

/**
 * Get all cached items for offline use
 */
export async function getCachedItems(): Promise<OfflineItem[]> {
  return offlineDb.items.toArray();
}
