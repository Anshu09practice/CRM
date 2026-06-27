"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptPII = encryptPII;
exports.decryptPII = decryptPII;
exports.isEncrypted = isEncrypted;
/**
 * PCI DSS 3.4: Server-side encryption for PII at rest
 * Uses AES-256-GCM with a key derived from JWT_SECRET or a dedicated DATA_ENCRYPTION_KEY
 */
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
function getEncryptionKey() {
    const keySource = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!keySource) {
        throw new Error('PCI DSS VIOLATION: No encryption key available. Set DATA_ENCRYPTION_KEY or JWT_SECRET.');
    }
    // Derive a 256-bit key using SHA-256
    return crypto_1.default.createHash('sha256').update(keySource).digest();
}
/**
 * Encrypt a plaintext string. Returns format: enc:<iv_hex>:<ciphertext_hex>:<tag_hex>
 */
function encryptPII(plaintext) {
    if (!plaintext)
        return plaintext;
    const key = getEncryptionKey();
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `enc:${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}
/**
 * Decrypt an encrypted string. Handles both encrypted and legacy plaintext.
 */
function decryptPII(encrypted) {
    if (!encrypted || !encrypted.startsWith('enc:'))
        return encrypted;
    const parts = encrypted.split(':');
    if (parts.length !== 4)
        return encrypted; // Malformed, return as-is
    const [, ivHex, ciphertextHex, tagHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Check if a value is already encrypted
 */
function isEncrypted(value) {
    return value?.startsWith('enc:') && value.split(':').length === 4;
}
//# sourceMappingURL=crypto.js.map