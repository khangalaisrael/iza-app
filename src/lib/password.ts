import { randomBytes, scrypt, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

function format(salt: Buffer, hash: Buffer): string {
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

// Stored as "scrypt:<salt>:<hash>" (both base64url). Slow on purpose, so stolen hashes are hard to crack.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return format(salt, await scryptAsync(password, salt, KEYLEN));
}

// Same format, for seeding accounts while the database opens (that step cannot wait).
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  return format(salt, scryptSync(password, salt, KEYLEN));
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, hashText] = stored.split(":");
  if (scheme !== "scrypt" || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltText, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A throwaway hash, so a wrong identifier takes as long to reject as a wrong password.
export const DUMMY_HASH = format(Buffer.alloc(16), Buffer.alloc(KEYLEN));

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

// Only the hash of a session token is stored, so a leaked database cannot be used to sign in.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
