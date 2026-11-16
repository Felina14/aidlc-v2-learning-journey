import { describe, expect, it } from 'vitest';
import { SESSION_KEY, getSession, isSessionId, makeUuid } from '../src/session';
import { SESSION, blockedStorage, memoryStorage } from './helpers';

describe('browser session (BR5.3, BR6.4)', () => {
  it('makes a standard version 4 UUID', () => {
    const id = makeUuid();
    expect(isSessionId(id)).toBe(true);
    expect(id[14]).toBe('4');
    expect(makeUuid()).not.toBe(id);
  });

  it('reuses a stored session id', () => {
    const storage = memoryStorage({ [SESSION_KEY]: SESSION });
    expect(getSession(() => storage)).toEqual({ ok: true, sessionId: SESSION });
  });

  it('makes and keeps a new id on the first visit', () => {
    const storage = memoryStorage();
    const result = getSession(
      () => storage,
      () => SESSION,
    );
    expect(result).toEqual({ ok: true, sessionId: SESSION });
    expect(storage.data.get(SESSION_KEY)).toBe(SESSION);
  });

  it('replaces a stored value that is not a UUID', () => {
    const storage = memoryStorage({ [SESSION_KEY]: 'garbage' });
    expect(
      getSession(
        () => storage,
        () => SESSION,
      ),
    ).toEqual({ ok: true, sessionId: SESSION });
  });

  it('reports blocked storage when reading or writing throws', () => {
    expect(getSession(() => blockedStorage())).toEqual({ ok: false });
    expect(
      getSession(() => {
        throw new Error('no storage at all');
      }),
    ).toEqual({ ok: false });
  });

  it('reports blocked storage when the browser does not keep what was written', () => {
    const forgetful = { getItem: () => null, setItem: () => undefined };
    expect(
      getSession(
        () => forgetful,
        () => SESSION,
      ),
    ).toEqual({ ok: false });
  });

  it('rejects ids that are not UUID text', () => {
    expect(isSessionId('abc')).toBe(false);
    expect(isSessionId(42)).toBe(false);
  });
});
