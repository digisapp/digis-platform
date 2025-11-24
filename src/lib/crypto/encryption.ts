import crypto from 'crypto';

// Encryption key from environment variable
// MUST be 32 bytes (64 hex characters) for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

if (ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt sensitive data (bank account numbers, SSN, etc.)
 * Returns format: iv:encrypted:authTag (all hex encoded)
 */
export function encrypt(text: string): string {
  if (!text) return '';

  // Generate random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag for integrity verification
  const authTag = cipher.getAuthTag();

  // Return format: iv:encrypted:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt sensitive data
 * Expects format: iv:encrypted:authTag (all hex encoded)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';

  try {
    // Parse the encrypted data format
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, encryptedHex, authTagHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Set authentication tag for integrity verification
    decipher.setAuthTag(authTag);

    // Decrypt the text
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Get last 4 digits of account number without decrypting entire value
 * If data is already decrypted (legacy), just return last 4
 */
export function getLastFourDigits(encryptedOrPlain: string): string {
  if (!encryptedOrPlain) return '';

  // Check if it's encrypted (has : delimiters)
  if (encryptedOrPlain.includes(':')) {
    try {
      const decrypted = decrypt(encryptedOrPlain);
      return decrypted.slice(-4);
    } catch {
      return '****';
    }
  }

  // Legacy plain text - just return last 4
  return encryptedOrPlain.slice(-4);
}

/**
 * Generate a secure encryption key for ENCRYPTION_KEY
 * Run this once to generate your key, then add to .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
