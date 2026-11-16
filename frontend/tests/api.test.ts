import { describe, expect, it, vi } from 'vitest';
import {
  API_PATH,
  createJourney,
  deleteJourney,
  loadJourney,
  recordMilestone,
  setGoalDate,
  setStageCompletion,
} from '../src/api';
import { SESSION, jsonResponse, makeJourney } from './helpers';

const error = (code: string) => ({ error: { code, message: 'x' } });

function deps(response: Response | Error | (() => Promise<Response>)) {
  const fetch = vi.fn(async (...args: [string, RequestInit?]) => {
    void args;
    if (response instanceof Error) throw response;
    if (typeof response === 'function') return response();
    return response;
  });
  return { fetch, createTimeoutMs: 50, loadTimeoutMs: 50 };
}

describe('create call', () => {
  it('sends the topic and the session header and returns the journey on 201', async () => {
    const d = deps(jsonResponse(201, makeJourney()));
    const result = await createJourney(d, SESSION, 'Rust');
    expect(result.kind).toBe('journey');
    const [url, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(API_PATH);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(SESSION);
    expect(JSON.parse(init.body as string)).toEqual({ topic: 'Rust', style: 'guide' });
  });

  it('maps 400 TOPIC_INVALID and 422 TOPIC_NOT_ALLOWED', async () => {
    expect(
      await createJourney(deps(jsonResponse(400, error('TOPIC_INVALID'))), SESSION, 'x'),
    ).toEqual({
      kind: 'topic-invalid',
    });
    expect(
      await createJourney(deps(jsonResponse(422, error('TOPIC_NOT_ALLOWED'))), SESSION, 'x'),
    ).toEqual({
      kind: 'not-allowed',
    });
  });

  it('treats a 429 with RATE_LIMITED, or with no code at all, as rate limited', async () => {
    const withCode = deps(jsonResponse(429, error('RATE_LIMITED')));
    expect((await createJourney(withCode, SESSION, 'x')).kind).toBe('rate-limited');
    const bare = deps(new Response('Too Many Requests', { status: 429 }));
    expect((await createJourney(bare, SESSION, 'x')).kind).toBe('rate-limited');
    const emptyJson = deps(jsonResponse(429, {}));
    expect((await createJourney(emptyJson, SESSION, 'x')).kind).toBe('rate-limited');
  });

  it('tells the daily limit apart from the throttle by the code', async () => {
    const limit = await createJourney(deps(jsonResponse(429, error('DAILY_LIMIT'))), SESSION, 'x');
    expect(limit.kind).toBe('daily-limit');
    const throttle = await createJourney(
      deps(jsonResponse(429, error('RATE_LIMITED'))),
      SESSION,
      'x',
    );
    expect(throttle.kind).toBe('rate-limited');
    const other = await createJourney(deps(jsonResponse(429, error('SOMETHING'))), SESSION, 'x');
    expect(other.kind).toBe('failed');
  });

  it('maps 500, odd bodies and network errors to failed', async () => {
    expect(
      (await createJourney(deps(jsonResponse(500, error('SAVE_FAILED'))), SESSION, 'x')).kind,
    ).toBe('failed');
    expect((await createJourney(deps(jsonResponse(201, { nope: true })), SESSION, 'x')).kind).toBe(
      'failed',
    );
    expect((await createJourney(deps(new TypeError('offline')), SESSION, 'x')).kind).toBe('failed');
    expect((await createJourney(deps(jsonResponse(502, 'not json')), SESSION, 'x')).kind).toBe(
      'failed',
    );
  });

  it('gives up when nothing arrives in time', async () => {
    const d = deps(jsonResponse(201, makeJourney()));
    d.fetch.mockImplementation(
      (...[, init]) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('a', 'AbortError')),
          );
        }),
    );
    expect((await createJourney(d, SESSION, 'x')).kind).toBe('failed');
  });
});

describe('load call', () => {
  it('returns the journey on 200 and none on 404', async () => {
    expect((await loadJourney(deps(jsonResponse(200, makeJourney())), SESSION)).kind).toBe(
      'journey',
    );
    expect((await loadJourney(deps(jsonResponse(404, error('NOT_FOUND'))), SESSION)).kind).toBe(
      'none',
    );
  });

  it('sends GET with the session header and no body', async () => {
    const d = deps(jsonResponse(404, error('NOT_FOUND')));
    await loadJourney(d, SESSION);
    const [, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('maps a throttle to rate-limited and other failures to failed', async () => {
    expect((await loadJourney(deps(new Response(null, { status: 429 })), SESSION)).kind).toBe(
      'rate-limited',
    );
    expect((await loadJourney(deps(jsonResponse(500, error('LOAD_FAILED'))), SESSION)).kind).toBe(
      'failed',
    );
    expect((await loadJourney(deps(new TypeError('offline')), SESSION)).kind).toBe('failed');
  });

  it('uses the default time limits when none are given', async () => {
    const fetch = vi.fn(async () => jsonResponse(404, error('NOT_FOUND')));
    expect((await loadJourney({ fetch }, SESSION)).kind).toBe('none');
    expect(
      (await createJourney({ fetch: async () => jsonResponse(500, {}) }, SESSION, 'x')).kind,
    ).toBe('failed');
  });
});

/** A fetch that answers from a list, one entry per call (an Error is thrown). */
function sequence(...steps: (Response | Error)[]) {
  const fetch = vi.fn(async (...args: [string, RequestInit?]) => {
    void args;
    const step = steps.shift() ?? new TypeError('no more answers');
    if (step instanceof Error) throw step;
    return step;
  });
  return { fetch, createTimeoutMs: 50, loadTimeoutMs: 50, completionTimeoutMs: 50 };
}

describe('completion call', () => {
  it('sends PUT to the stage address with the session header and the completed flag', async () => {
    const d = sequence(jsonResponse(200, { completedStages: [2, 3] }));
    const result = await setStageCompletion(d, SESSION, 3, true);
    expect(result).toEqual({ kind: 'completed', completedStages: [2, 3] });
    const [url, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_PATH}/stages/3/completion`);
    expect(init.method).toBe('PUT');
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(SESSION);
    expect(JSON.parse(init.body as string)).toEqual({ completed: true });
  });

  it('sends completed false to unmark and accepts an empty list', async () => {
    const d = sequence(jsonResponse(200, { completedStages: [] }));
    expect(await setStageCompletion(d, SESSION, 1, false)).toEqual({
      kind: 'completed',
      completedStages: [],
    });
    const [, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ completed: false });
  });

  it('maps 404, 400 and 500 by their codes', async () => {
    const kind = async (status: number, code: string) =>
      (await setStageCompletion(sequence(jsonResponse(status, error(code))), SESSION, 1, true))
        .kind;
    expect(await kind(404, 'NOT_FOUND')).toBe('not-found');
    expect(await kind(400, 'INVALID_REQUEST')).toBe('invalid-request');
    expect(await kind(500, 'SAVE_FAILED')).toBe('save-failed');
    expect(await kind(502, 'ODD')).toBe('failed');
  });

  it('treats a 429 with no code as rate limited, and a 429 with another code as failed', async () => {
    const bare = sequence(new Response(null, { status: 429 }));
    expect((await setStageCompletion(bare, SESSION, 1, true)).kind).toBe('rate-limited');
    const other = sequence(jsonResponse(429, error('DAILY_LIMIT')));
    expect((await setStageCompletion(other, SESSION, 1, true)).kind).toBe('failed');
  });

  it('does not accept a 200 whose list is not a list of whole numbers', async () => {
    for (const body of [{}, { completedStages: 'x' }, { completedStages: [1.5] }, null]) {
      const d = sequence(jsonResponse(200, body));
      expect((await setStageCompletion(d, SESSION, 1, true)).kind).toBe('failed');
    }
  });

  it('retries once after a network failure and succeeds if the second try works', async () => {
    const d = sequence(new TypeError('offline'), jsonResponse(200, { completedStages: [1] }));
    expect(await setStageCompletion(d, SESSION, 1, true)).toEqual({
      kind: 'completed',
      completedStages: [1],
    });
    expect(d.fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up after one retry, and does not retry a server answer', async () => {
    const down = sequence(new TypeError('offline'), new TypeError('offline'), new TypeError('x'));
    expect((await setStageCompletion(down, SESSION, 1, true)).kind).toBe('failed');
    expect(down.fetch).toHaveBeenCalledTimes(2);
    const answered = sequence(jsonResponse(500, error('SAVE_FAILED')), jsonResponse(200, {}));
    await setStageCompletion(answered, SESSION, 1, true);
    expect(answered.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once after a timeout, then reports failure', async () => {
    const d = sequence();
    d.fetch.mockImplementation(
      (...[, init]) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('a', 'AbortError')),
          );
        }),
    );
    expect((await setStageCompletion(d, SESSION, 1, true)).kind).toBe('failed');
    expect(d.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses the default time limit when none is given', async () => {
    const fetch = vi.fn(async () => jsonResponse(200, { completedStages: [4] }));
    expect((await setStageCompletion({ fetch }, SESSION, 4, true)).kind).toBe('completed');
  });
});

describe('load retry (BR13.5)', () => {
  it('retries a load once after a network failure', async () => {
    const d = sequence(new TypeError('offline'), jsonResponse(200, makeJourney()));
    expect((await loadJourney(d, SESSION)).kind).toBe('journey');
    expect(d.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry a create call', async () => {
    const d = sequence(new TypeError('offline'), jsonResponse(201, makeJourney()));
    expect((await createJourney(d, SESSION, 'Rust')).kind).toBe('failed');
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('delete call', () => {
  it('sends DELETE with the session header and returns deleted on 204', async () => {
    const d = deps(jsonResponse(204, undefined));
    expect(await deleteJourney(d, SESSION)).toEqual({ kind: 'deleted' });
    const [url, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(API_PATH);
    expect(init.method).toBe('DELETE');
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(SESSION);
  });

  it('maps a 500 DELETE_FAILED and a 400 to failed without retrying', async () => {
    const d500 = deps(jsonResponse(500, error('DELETE_FAILED')));
    expect(await deleteJourney(d500, SESSION)).toEqual({ kind: 'failed' });
    expect(d500.fetch).toHaveBeenCalledTimes(1);
    const d400 = deps(jsonResponse(400, error('INVALID_REQUEST')));
    expect(await deleteJourney(d400, SESSION)).toEqual({ kind: 'failed' });
  });

  it('maps a 429 with no code or RATE_LIMITED to rate-limited', async () => {
    expect(await deleteJourney(deps(jsonResponse(429, undefined)), SESSION)).toEqual({
      kind: 'rate-limited',
    });
    expect(await deleteJourney(deps(jsonResponse(429, error('RATE_LIMITED'))), SESSION)).toEqual({
      kind: 'rate-limited',
    });
  });

  it('retries once by itself after a network failure, then succeeds', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(204, undefined));
    expect(await deleteJourney({ fetch }, SESSION)).toEqual({ kind: 'deleted' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up after the one retry when the network keeps failing', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('offline'));
    expect(await deleteJourney({ fetch }, SESSION)).toEqual({ kind: 'failed' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('treats a call that takes too long as a failure and retries it once', async () => {
    const never = (_input: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const fetch = vi.fn(never);
    expect(await deleteJourney({ fetch, deleteTimeoutMs: 20 }, SESSION)).toEqual({
      kind: 'failed',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('create call with a teaching style (BR33.2)', () => {
  it.each(['guide', 'instructor', 'planner'] as const)('sends the %s style', async (style) => {
    const d = deps(jsonResponse(201, makeJourney({ teachingStyle: style })));
    expect((await createJourney(d, SESSION, 'Rust', style)).kind).toBe('journey');
    const [, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ topic: 'Rust', style });
  });

  it('is never retried by itself, even with a style', async () => {
    const d = sequence(new TypeError('offline'), jsonResponse(201, makeJourney()));
    expect((await createJourney(d, SESSION, 'Rust', 'planner')).kind).toBe('failed');
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('goal call (contract C1)', () => {
  it('sends PUT to the goal path with the session header and the date', async () => {
    const d = deps(jsonResponse(200, { goalDate: '2026-12-15' }));
    expect(await setGoalDate(d, SESSION, '2026-12-15')).toEqual({
      kind: 'saved',
      goalDate: '2026-12-15',
    });
    const [url, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_PATH}/goal`);
    expect(init.method).toBe('PUT');
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(SESSION);
    expect(JSON.parse(init.body as string)).toEqual({ goalDate: '2026-12-15' });
  });

  it('sends null to clear and returns the stored null', async () => {
    const d = deps(jsonResponse(200, { goalDate: null }));
    expect(await setGoalDate(d, SESSION, null)).toEqual({ kind: 'saved', goalDate: null });
    const [, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ goalDate: null });
  });

  it('maps 404 NOT_FOUND, 400 INVALID_REQUEST and 500 SAVE_FAILED', async () => {
    const answer = (status: number, code: string) =>
      setGoalDate(deps(jsonResponse(status, error(code))), SESSION, null);
    expect(await answer(404, 'NOT_FOUND')).toEqual({ kind: 'not-found' });
    expect(await answer(400, 'INVALID_REQUEST')).toEqual({ kind: 'invalid-request' });
    expect(await answer(500, 'SAVE_FAILED')).toEqual({ kind: 'save-failed' });
  });

  it('maps any other answer, or a 200 without the date, to failed', async () => {
    expect(await setGoalDate(deps(jsonResponse(503, error('X'))), SESSION, null)).toEqual({
      kind: 'failed',
    });
    expect(await setGoalDate(deps(jsonResponse(200, {})), SESSION, null)).toEqual({
      kind: 'failed',
    });
    expect(await setGoalDate(deps(jsonResponse(200, { goalDate: 5 })), SESSION, null)).toEqual({
      kind: 'failed',
    });
  });

  it('maps a 429 with no code, or RATE_LIMITED, to rate-limited', async () => {
    expect(await setGoalDate(deps(new Response('', { status: 429 })), SESSION, null)).toEqual({
      kind: 'rate-limited',
    });
    expect(
      await setGoalDate(deps(jsonResponse(429, error('RATE_LIMITED'))), SESSION, null),
    ).toEqual({ kind: 'rate-limited' });
  });

  it('retries once by itself after a network failure, then succeeds', async () => {
    const d = sequence(new TypeError('offline'), jsonResponse(200, { goalDate: null }));
    expect(await setGoalDate(d, SESSION, null)).toEqual({ kind: 'saved', goalDate: null });
    expect(d.fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up after the one retry', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('offline'));
    expect(await setGoalDate({ fetch }, SESSION, null)).toEqual({ kind: 'failed' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('treats a call with no answer in time as a failure (and retries it once)', async () => {
    const never = (_input: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const fetch = vi.fn(never);
    expect(await setGoalDate({ fetch, goalTimeoutMs: 20 }, SESSION, null)).toEqual({
      kind: 'failed',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('milestone call (contract C1)', () => {
  it('sends PUT to the milestones path with the session header and only the name', async () => {
    const d = deps(jsonResponse(200, { milestonesShown: ['first-stage', 'halfway'] }));
    expect(await recordMilestone(d, SESSION, 'halfway')).toEqual({
      kind: 'saved',
      milestonesShown: ['first-stage', 'halfway'],
    });
    const [url, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_PATH}/milestones`);
    expect(init.method).toBe('PUT');
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(SESSION);
    expect(JSON.parse(init.body as string)).toEqual({ milestone: 'halfway' });
  });

  it('maps 404, 400 and 500 by their codes', async () => {
    const kind = async (status: number, code: string) =>
      (await recordMilestone(deps(jsonResponse(status, error(code))), SESSION, 'complete')).kind;
    expect(await kind(404, 'NOT_FOUND')).toBe('not-found');
    expect(await kind(400, 'INVALID_REQUEST')).toBe('invalid-request');
    expect(await kind(500, 'SAVE_FAILED')).toBe('save-failed');
    expect(await kind(500, 'SOMETHING_ELSE')).toBe('failed');
  });

  it('maps a 429 with a code and a bare 429 to rate limited', async () => {
    const withCode = deps(jsonResponse(429, error('RATE_LIMITED')));
    expect((await recordMilestone(withCode, SESSION, 'halfway')).kind).toBe('rate-limited');
    const bare = deps(new Response('Too Many Requests', { status: 429 }));
    expect((await recordMilestone(bare, SESSION, 'halfway')).kind).toBe('rate-limited');
  });

  it('treats an odd 200 body as failed', async () => {
    const odd = deps(jsonResponse(200, { milestonesShown: [1, 2] }));
    expect((await recordMilestone(odd, SESSION, 'halfway')).kind).toBe('failed');
    const missing = deps(jsonResponse(200, {}));
    expect((await recordMilestone(missing, SESSION, 'halfway')).kind).toBe('failed');
  });

  it('repeats once after a network failure and then succeeds', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(200, { milestonesShown: ['complete'] }));
    const result = await recordMilestone({ fetch }, SESSION, 'complete');
    expect(result).toEqual({ kind: 'saved', milestonesShown: ['complete'] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up after the one repeat, and also after a timeout', async () => {
    const down = deps(new TypeError('offline'));
    expect((await recordMilestone(down, SESSION, 'complete')).kind).toBe('failed');
    expect(down.fetch).toHaveBeenCalledTimes(2);
    const slow = {
      fetch: vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
      milestoneTimeoutMs: 10,
    };
    expect((await recordMilestone(slow, SESSION, 'complete')).kind).toBe('failed');
    expect(slow.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not repeat after an answer from the server', async () => {
    const d = deps(jsonResponse(404, error('NOT_FOUND')));
    await recordMilestone(d, SESSION, 'halfway');
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });
});
