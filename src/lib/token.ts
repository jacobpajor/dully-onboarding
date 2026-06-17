import { randomBytes } from 'crypto'

/**
 * Cryptographically-random, URL-safe token used as an onboarding's id.
 * 24 bytes -> 32 url-safe chars (well above the spec's >=24 minimum).
 * Possession of this token IS permission to read/write that one record.
 */
export function generateToken() {
  return randomBytes(24).toString('base64url')
}
