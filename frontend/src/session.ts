/** The anonymous browser session (BR5.3, BR6.4): a random UUID kept in browser storage. */

export const SESSION_KEY = 'learning-journey-session-id';

export type SessionResult = { ok: true; sessionId: string } | { ok: false };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Make a random UUID version 4 from the browser's secure random source. */
export function makeUuid(
  cryptoSource: Pick<Crypto, 'getRandomValues'> = globalThis.crypto,
): string {
  const bytes = new Uint8Array(16);
  cryptoSource.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Find the session ID, or make and keep one. When the browser blocks storage, or does not keep
 * what was written, the result is `{ ok: false }` and no request may be sent (BR6.4).
 */
export function getSession(
  getStorage: () => Pick<Storage, 'getItem' | 'setItem'>,
  newId: () => string = makeUuid,
): SessionResult {
  try {
    const storage = getStorage();
    const existing = storage.getItem(SESSION_KEY);
    if (isSessionId(existing)) return { ok: true, sessionId: existing };
    const created = newId();
    storage.setItem(SESSION_KEY, created);
    if (storage.getItem(SESSION_KEY) !== created) return { ok: false };
    return { ok: true, sessionId: created };
  } catch {
    return { ok: false };
  }
}
