import { TABLE_NAMES } from '@reconcilo/shared';

/**
 * DynamoDB Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon DynamoDB
 * -------------------------------------
 * 1. Open AWS Console -> DynamoDB -> Create table
 * 2. Create 10 tables: Stores, Users, Products, Inventory, Transactions, SyncBatches, Conflicts, SuspiciousActivity, Notifications, AuditRecords
 * 3. Primary Keys:
 *    - Inventory: PK store_id (String), SK product_id (String)
 *    - Transactions: PK transaction_id (String); GSI store_id (PK) + created_at (SK)
 *    - AuditRecords: PK audit_id (String), SK created_at (String)
 *    - All others: PK <name>_id (String)
 * 4. Replace this stub implementation with `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
 */

// In-memory mock storage for development & offline stubbing
const mockStore = new Map<string, Map<string, any>>();

function getTableMap(table: string): Map<string, any> {
  if (!mockStore.has(table)) {
    mockStore.set(table, new Map());
  }
  return mockStore.get(table)!;
}

export class DynamoDBAdapter {
  /**
   * Retrieves an item by primary key (or composite primary key).
   * // TODO: Replace stub with real AWS SDK DynamoDB GetCommand
   */
  static async getItem<T>(table: string, key: Record<string, any>): Promise<T | null> {
    const tableMap = getTableMap(table);
    const keyString = JSON.stringify(key);
    const item = tableMap.get(keyString);
    return item ? (JSON.parse(JSON.stringify(item)) as T) : null;
  }

  /**
   * Puts an item into a table with optional conditional check.
   * // TODO: Replace stub with real AWS SDK DynamoDB PutCommand
   */
  static async putItem<T extends Record<string, any>>(
    table: string,
    key: Record<string, any>,
    item: T,
    conditionExpression?: string
  ): Promise<{ success: boolean; error?: string }> {
    const tableMap = getTableMap(table);
    const keyString = JSON.stringify(key);

    if (conditionExpression && conditionExpression.includes('attribute_not_exists')) {
      if (tableMap.has(keyString)) {
        return {
          success: false,
          error: 'ConditionalCheckFailedException: Item already exists',
        };
      }
    }

    tableMap.set(keyString, JSON.parse(JSON.stringify(item)));
    return { success: true };
  }

  /**
   * Performs an update with optimistic version checking for Inventory table (§14, Guarantee 4).
   * // TODO: Replace stub with real AWS SDK DynamoDB UpdateCommand with ConditionExpression
   */
  static async versionedUpdate<T extends Record<string, any>>(
    table: string,
    key: Record<string, any>,
    updates: Partial<T>,
    expectedVersion: number
  ): Promise<{ success: boolean; updatedItem?: T; error?: string }> {
    const tableMap = getTableMap(table);
    const keyString = JSON.stringify(key);
    const currentItem = tableMap.get(keyString);

    if (!currentItem) {
      return { success: false, error: 'ItemNotFound' };
    }

    if (currentItem.version !== expectedVersion) {
      return {
        success: false,
        error: `ConditionalCheckFailedException: Version mismatch. Expected ${expectedVersion}, actual ${currentItem.version}`,
      };
    }

    const updatedItem = {
      ...currentItem,
      ...updates,
      version: currentItem.version + 1,
      last_updated: new Date().toISOString(),
    };

    tableMap.set(keyString, updatedItem);
    return { success: true, updatedItem: JSON.parse(JSON.stringify(updatedItem)) as T };
  }

  /**
   * Queries items by GSI or attribute prefix.
   * // TODO: Replace stub with real AWS SDK DynamoDB QueryCommand
   */
  static async queryByAttribute<T>(
    table: string,
    attributeName: string,
    attributeValue: any
  ): Promise<T[]> {
    const tableMap = getTableMap(table);
    const results: T[] = [];

    for (const item of tableMap.values()) {
      if (item[attributeName] === attributeValue) {
        results.push(JSON.parse(JSON.stringify(item)) as T);
      }
    }

    return results;
  }

  /**
   * Scans all items in a table (stub for admin queries).
   * // TODO: Replace stub with real AWS SDK DynamoDB ScanCommand
   */
  static async scanAll<T>(table: string): Promise<T[]> {
    const tableMap = getTableMap(table);
    return Array.from(tableMap.values()).map((item) => JSON.parse(JSON.stringify(item)) as T);
  }

  /**
   * Clears in-memory storage (for testing).
   */
  static resetMockStore(): void {
    mockStore.clear();
  }
}
