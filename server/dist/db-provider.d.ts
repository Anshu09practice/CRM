/**
 * Database Abstraction Layer
 *
 * Supports dual backends:
 * - SQLite (better-sqlite3) for development and single-instance deployments
 * - PostgreSQL (via Prisma) for production multi-instance deployments
 *
 * Set DB_PROVIDER=postgres and DATABASE_URL env vars to use PostgreSQL.
 * Default: SQLite (backward compatible with existing setup)
 */
export type DbProvider = 'sqlite' | 'postgres';
export declare function getDbProvider(): DbProvider;
/**
 * When migrating to PostgreSQL:
 * 1. Set DB_PROVIDER=postgres
 * 2. Set DATABASE_URL=postgresql://user:pass@host:5432/jj_crm
 * 3. Run: npx prisma migrate deploy
 * 4. Run: npx prisma generate
 *
 * The existing SQLite implementation continues to work as-is for
 * single-server deployments, development, and the Android/local version.
 */
export declare const DB_CONFIG: {
    sqlite: {
        description: string;
        concurrency: string;
        scaling: string;
        useCase: string;
    };
    postgres: {
        description: string;
        concurrency: string;
        scaling: string;
        useCase: string;
    };
};
//# sourceMappingURL=db-provider.d.ts.map