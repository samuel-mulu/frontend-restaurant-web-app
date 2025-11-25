/**
 * Offline Authentication Cache
 * Securely stores authentication data for offline access
 */

import { db, AuthRecord } from "@/lib/db/indexedDB";

const OFFLINE_WINDOW_HOURS = 24;
const ENCRYPTION_KEY_NAME = "auth_encryption_key";

/**
 * Generate or retrieve encryption key
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Check if key exists in IndexedDB
  const existingKey = localStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (existingKey) {
    // Import existing key
    const keyData = JSON.parse(existingKey);
    return await crypto.subtle.importKey(
      "jwk",
      keyData,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // Export and store key
  const exported = await crypto.subtle.exportKey("jwk", key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exported));

  return key;
}

/**
 * Encrypt data using Web Crypto API
 */
async function encrypt(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using Web Crypto API
 */
async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Store authentication data
 */
export async function storeAuth(
  userId: string,
  role: string,
  accessToken: string,
  sessionExpiry: string
): Promise<void> {
  // Encrypt the token
  const encryptedToken = await encrypt(accessToken);

  const authRecord: AuthRecord = {
    userId,
    role,
    sessionExpiry,
    encryptedToken,
    lastOnline: new Date().toISOString(),
  };

  await db.auth.put(authRecord);
}

/**
 * Get cached authentication data
 */
export async function getCachedAuth(): Promise<{
  userId: string;
  role: string;
  accessToken: string;
  sessionExpiry: string;
} | null> {
  const records = await db.auth.toArray();
  if (records.length === 0) {
    return null;
  }

  const record = records[0]; // Get first record

  // Check if session is still valid
  const expiry = new Date(record.sessionExpiry);
  const now = new Date();
  const hoursSinceExpiry = (now.getTime() - expiry.getTime()) / (1000 * 60 * 60);

  // Allow offline access within window
  if (hoursSinceExpiry > OFFLINE_WINDOW_HOURS) {
    // Session expired beyond offline window
    await clearAuth();
    return null;
  }

  try {
    // Decrypt token
    const accessToken = await decrypt(record.encryptedToken);

    return {
      userId: record.userId,
      role: record.role,
      accessToken,
      sessionExpiry: record.sessionExpiry,
    };
  } catch (error) {
    console.error("Failed to decrypt auth token:", error);
    await clearAuth();
    return null;
  }
}

/**
 * Clear authentication data
 */
export async function clearAuth(): Promise<void> {
  await db.auth.clear();
}

/**
 * Update last online timestamp
 */
export async function updateLastOnline(): Promise<void> {
  const records = await db.auth.toArray();
  if (records.length > 0) {
    await db.auth.update(records[0].userId, {
      lastOnline: new Date().toISOString(),
    });
  }
}

/**
 * Check if offline login is allowed
 */
export async function isOfflineLoginAllowed(): Promise<boolean> {
  const auth = await getCachedAuth();
  if (!auth) {
    return false;
  }

  const expiry = new Date(auth.sessionExpiry);
  const now = new Date();
  const hoursSinceExpiry = (now.getTime() - expiry.getTime()) / (1000 * 60 * 60);

  return hoursSinceExpiry <= OFFLINE_WINDOW_HOURS;
}

