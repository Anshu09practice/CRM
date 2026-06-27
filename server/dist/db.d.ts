import Database from 'better-sqlite3';
declare const DATA_DIR: string;
declare const DB_PATH: string;
/**
 * Initialize the database with better-sqlite3 (synchronous, disk-based).
 */
export declare function initDatabase(): Database.Database;
/**
 * Get the database instance
 */
export declare function getDb(): Database.Database;
/**
 * Run a query that modifies data (INSERT, UPDATE, DELETE)
 */
export declare function runQuery(sql: string, params?: any[]): {
    changes: number;
    lastInsertRowid: number;
};
/**
 * Run a SELECT query and return results as array of objects
 */
export declare function queryAll(sql: string, params?: any[]): any[];
/**
 * Run a SELECT query and return the first result as an object
 */
export declare function queryOne(sql: string, params?: any[]): any | null;
/**
 * Run multiple statements in a transaction (atomic)
 */
export declare function runTransaction(fn: () => void): void;
export { DB_PATH, DATA_DIR };
declare const _default: {
    initDatabase: typeof initDatabase;
    getDb: typeof getDb;
    runQuery: typeof runQuery;
    queryAll: typeof queryAll;
    queryOne: typeof queryOne;
    runTransaction: typeof runTransaction;
};
export default _default;
//# sourceMappingURL=db.d.ts.map