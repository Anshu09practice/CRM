/**
 * Export the entire database to a JSON file
 */
export declare function exportBackup(): string;
/**
 * Restore database from a JSON backup file
 */
export declare function restoreBackup(jsonData: any): {
    restored: number;
    errors: string[];
};
/**
 * Schedule daily backup at midnight
 */
export declare function scheduleDailyBackup(): void;
//# sourceMappingURL=backup.d.ts.map