import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  TransactionType,
  TransactionLifecycleState,
  SyncBatchStatus,
} from '@reconcilo/shared';

export interface LocalTransaction extends Transaction {
  local_sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  local_created_at: number;
}

export interface LocalProduct {
  product_id: string;
  sku: string;
  name: string;
  unit_price: number;
  local_quantity: number;
}

interface ReconciloDB extends DBSchema {
  transactions: {
    key: string;
    value: LocalTransaction;
    indexes: {
      'by-sync-status': string;
      'by-sequence': number;
    };
  };
  syncBatches: {
    key: string;
    value: {
      batch_id: string;
      store_id: string;
      device_id: string;
      transaction_ids: string[];
      status: SyncBatchStatus;
      created_at: string;
    };
  };
  localInventory: {
    key: string;
    value: LocalProduct;
  };
  deviceConfig: {
    key: string;
    value: {
      device_id: string;
      current_sequence: number;
    };
  };
}

const DB_NAME = 'reconcilo_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ReconciloDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ReconciloDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ReconciloDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', {
            keyPath: 'transaction_id',
          });
          txStore.createIndex('by-sync-status', 'local_sync_status');
          txStore.createIndex('by-sequence', 'device_sequence');
        }

        // Sync Batches store
        if (!db.objectStoreNames.contains('syncBatches')) {
          db.createObjectStore('syncBatches', { keyPath: 'batch_id' });
        }

        // Local Inventory cache store
        if (!db.objectStoreNames.contains('localInventory')) {
          db.createObjectStore('localInventory', { keyPath: 'product_id' });
        }

        // Device config store
        if (!db.objectStoreNames.contains('deviceConfig')) {
          db.createObjectStore('deviceConfig', { keyPath: 'device_id' });
        }
      },
    });
  }
  return dbPromise;
}

export class IndexedDBService {
  /**
   * Initializes or retrieves device identifier and sequence number.
   */
  static async getDeviceConfig(): Promise<{ device_id: string; current_sequence: number }> {
    const db = await getDB();
    let config = await db.get('deviceConfig', 'pos-terminal-01');
    if (!config) {
      config = {
        device_id: 'pos-terminal-01',
        current_sequence: 1,
      };
      await db.put('deviceConfig', config);
    }
    return config;
  }

  /**
   * Increments and returns the next device sequence number.
   */
  static async getNextDeviceSequence(): Promise<number> {
    const db = await getDB();
    const config = await this.getDeviceConfig();
    const nextSeq = config.current_sequence + 1;
    await db.put('deviceConfig', {
      device_id: config.device_id,
      current_sequence: nextSeq,
    });
    return nextSeq;
  }

  /**
   * Seeds default product inventory into local storage if empty.
   */
  static async seedInitialInventory(): Promise<void> {
    const db = await getDB();
    const count = await db.count('localInventory');
    if (count === 0) {
      const initialProducts: LocalProduct[] = [
        {
          product_id: 'prod-001',
          sku: 'CF-ESP-1KG',
          name: 'Espresso Roast Beans 1kg',
          unit_price: 24.5,
          local_quantity: 45,
        },
        {
          product_id: 'prod-002',
          sku: 'CF-FLT-250G',
          name: 'Single Origin Filter 250g',
          unit_price: 14.0,
          local_quantity: 30,
        },
        {
          product_id: 'prod-003',
          sku: 'MLK-OAT-1L',
          name: 'Barista Oat Milk 1L',
          unit_price: 4.25,
          local_quantity: 80,
        },
        {
          product_id: 'prod-004',
          sku: 'SYR-VAN-750',
          name: 'Organic Vanilla Syrup 750ml',
          unit_price: 11.5,
          local_quantity: 15,
        },
        {
          product_id: 'prod-005',
          sku: 'CUP-COM-12',
          name: 'Compostable Cups 12oz (Pack 50)',
          unit_price: 18.0,
          local_quantity: 8, // Low stock demo
        },
      ];

      const tx = db.transaction('localInventory', 'readwrite');
      for (const prod of initialProducts) {
        await tx.store.put(prod);
      }
      await tx.done;
    }
  }

  /**
   * Retrieves all cached local products for the POS catalog.
   */
  static async getLocalInventory(): Promise<LocalProduct[]> {
    const db = await getDB();
    await this.seedInitialInventory();
    return db.getAll('localInventory');
  }

  /**
   * Records a local sale transaction in IndexedDB.
   * Client generates transaction_id (UUID) and assigns device sequence (AGENTS.md §5).
   */
  static async recordSale(params: {
    store_id: string;
    user_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }): Promise<LocalTransaction> {
    const db = await getDB();
    const config = await this.getDeviceConfig();
    const sequence = await this.getNextDeviceSequence();

    const transaction_id = uuidv4();
    const localTx: LocalTransaction = {
      transaction_id,
      store_id: params.store_id,
      user_id: params.user_id,
      device_id: config.device_id,
      device_sequence: sequence,
      product_id: params.product_id,
      quantity: params.quantity,
      unit_price: params.unit_price,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
      notes: params.notes,
      local_sync_status: 'PENDING',
      local_created_at: Date.now(),
    };

    // Save transaction and decrement local inventory optimistically
    const tx = db.transaction(['transactions', 'localInventory'], 'readwrite');
    await tx.objectStore('transactions').put(localTx);

    const product = await tx.objectStore('localInventory').get(params.product_id);
    if (product) {
      product.local_quantity = Math.max(0, product.local_quantity - params.quantity);
      await tx.objectStore('localInventory').put(product);
    }
    await tx.done;

    console.log(`[IndexedDB] Transaction recorded: ${transaction_id} (Seq: ${sequence})`);
    return localTx;
  }

  /**
   * Retrieves all pending transactions that need to be synced.
   */
  static async getPendingTransactions(): Promise<LocalTransaction[]> {
    const db = await getDB();
    const all = await db.getAll('transactions');
    return all
      .filter((t) => t.local_sync_status === 'PENDING' || t.local_sync_status === 'FAILED')
      .sort((a, b) => a.device_sequence - b.device_sequence);
  }

  /**
   * Marks transactions as SYNCING when S3 batch creation starts (Guarantee 1).
   */
  static async markTransactionsSyncing(transactionIds: string[], batchId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('transactions', 'readwrite');
    for (const id of transactionIds) {
      const item = await tx.store.get(id);
      if (item) {
        item.local_sync_status = 'SYNCING';
        item.batch_id = batchId;
        item.lifecycle_state = TransactionLifecycleState.SYNCING;
        await tx.store.put(item);
      }
    }
    await tx.done;
  }

  /**
   * Marks transactions as SYNCED upon successful processing confirmation.
   */
  static async markTransactionsSynced(transactionIds: string[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('transactions', 'readwrite');
    for (const id of transactionIds) {
      const item = await tx.store.get(id);
      if (item) {
        item.local_sync_status = 'SYNCED';
        item.lifecycle_state = TransactionLifecycleState.COMPLETED;
        await tx.store.put(item);
      }
    }
    await tx.done;
  }

  /**
   * Reverts transactions back to PENDING on sync failure (Guarantee 2).
   */
  static async markTransactionsFailed(transactionIds: string[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('transactions', 'readwrite');
    for (const id of transactionIds) {
      const item = await tx.store.get(id);
      if (item) {
        item.local_sync_status = 'PENDING';
        item.lifecycle_state = TransactionLifecycleState.PENDING;
        await tx.store.put(item);
      }
    }
    await tx.done;
  }

  /**
   * Retrieves all transactions for the POS transaction log.
   */
  static async getAllTransactions(): Promise<LocalTransaction[]> {
    const db = await getDB();
    const all = await db.getAll('transactions');
    return all.sort((a, b) => b.local_created_at - a.local_created_at);
  }
}
