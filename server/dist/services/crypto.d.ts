/**
 * Encrypt a plaintext string. Returns format: enc:<iv_hex>:<ciphertext_hex>:<tag_hex>
 */
export declare function encryptPII(plaintext: string): string;
/**
 * Decrypt an encrypted string. Handles both encrypted and legacy plaintext.
 */
export declare function decryptPII(encrypted: string): string;
/**
 * Check if a value is already encrypted
 */
export declare function isEncrypted(value: string): boolean;
//# sourceMappingURL=crypto.d.ts.map