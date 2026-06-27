/**
 * PCI DSS 3.4: Encryption at rest for sensitive data stored in IndexedDB
 * Uses AES-256-GCM with Web Crypto API
 */

const ENCRYPTION_KEY_NAME = 'jj_enc_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Derive a CryptoKey from user password + device salt
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  // Check if key exists in sessionStorage (ephemeral — cleared on tab close)
  const cachedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  if (cachedKey) {
    const keyData = Uint8Array.from(atob(cachedKey), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', keyData, ALGORITHM, false, ['encrypt', 'decrypt']);
  }
  // Generate a new key and store in sessionStorage
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

/**
 * Encrypt sensitive string data before storing in IndexedDB
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Format: base64(iv):base64(ciphertext)
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:${ivB64}:${ctB64}`;
}

/**
 * Decrypt field retrieved from IndexedDB
 */
export async function decryptField(encrypted: string): Promise<string> {
  if (!encrypted || !encrypted.startsWith('enc:')) return encrypted;

  const key = await getOrCreateEncryptionKey();
  const [, ivB64, ctB64] = encrypted.split(':');

  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt PII fields in a customer object before storing
 */
export async function encryptCustomerPII(customer: { phone?: string; address?: string; notes?: string }): Promise<typeof customer> {
  return {
    ...customer,
    phone: customer.phone ? await encryptField(customer.phone) : customer.phone,
    address: customer.address ? await encryptField(customer.address) : customer.address,
    notes: customer.notes ? await encryptField(customer.notes) : customer.notes,
  };
}

/**
 * Decrypt PII fields in a customer object after retrieval
 */
export async function decryptCustomerPII(customer: { phone?: string; address?: string; notes?: string }): Promise<typeof customer> {
  return {
    ...customer,
    phone: customer.phone ? await decryptField(customer.phone) : customer.phone,
    address: customer.address ? await decryptField(customer.address) : customer.address,
    notes: customer.notes ? await decryptField(customer.notes) : customer.notes,
  };
}
