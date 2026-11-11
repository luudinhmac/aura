import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const FORMAT = 'scrypt-v1';
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

function deriveKey(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export function isPasswordHash(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(`${FORMAT}$`);
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) throw new Error('Mật khẩu không được để trống');
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH);
  return [FORMAT, salt.toString('base64url'), derivedKey.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, storedValue: string): Promise<boolean> {
  if (!password || !isPasswordHash(storedValue)) return false;
  const [, saltValue, expectedValue] = storedValue.split('$');
  if (!saltValue || !expectedValue) return false;

  try {
    const salt = Buffer.from(saltValue, 'base64url');
    const expected = Buffer.from(expectedValue, 'base64url');
    const actual = await deriveKey(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
