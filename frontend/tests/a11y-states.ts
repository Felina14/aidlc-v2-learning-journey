/**
 * Drives the real page (index.html + the controller) into each state in the scope table of the
 * u6 functional spec, using a fake `fetch`. No test here calls any AWS service.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount } from '../src/app';
import { SESSION_KEY } from '../src/session';
import { SLOW_AFTER_MS, type JourneyController } from '../src/state';
import type { Journey } from '../src/types';
import {
  SESSION,
  fakeStorage,
  jsonResponse,
  loadPage,
  makeJourney,
  makeStage,
  memoryStorage,
} from './helpers';

/** The learner's "today" in every state: 10 November 2026, local time. */
export const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();

export const tick = () => new Promise((resolveTick) => setTimeout(resolveTick, 0));

export const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

export interface Reply {
  status: number;
  body?: unknown;
}

export interface BootOptions {
  /** The journey the server holds for a GET; null means 404. */
  stored?: Journey | null;
  /** Reply to the first GET instead of the stored journey. */
  loadReply?: Reply | 'pending';
  /** Reply to the POST; 'pending' never answers (the generating state). */
  createReply?: Reply | 'pending';
  /** Replies for PUT completion / goal / milestones, in order; the default is success. */
  completionReply?: Reply;
  goalReply?: Reply;
  deleteReply?: Reply;
  /** Pre-filled nudge dismissals. */
  nudgeData?: Record<string, string>;
}

export interface Page {
  controller: JourneyController;
  /** Timers the controller set; `fire(ms)` runs the one with that delay. */
  fire: (ms: number) => void;
  calls: { method: string; url: string; body: unknown }[];
  nudge: ReturnType<typeof fakeStorage>;
}

/** Copy the real page's language and title into jsdom (loadPage only copies the body). */
function applyHead(): void {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');
  document.documentElement.lang = /<html[^>]*\blang="([^"]*)"/.exec(html)?.[1] ?? '';
  document.title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
}

function reply(r: Reply): Response {
  return jsonResponse(r.status, r.body);
}

/** Open the page with a fake server behind it. */
export async function boot(options: BootOptions = {}): Promise<Page> {
  loadPage();
  applyHead();
  const storage = memoryStorage({ [SESSION_KEY]: SESSION });
  const nudge = fakeStorage(options.nudgeData ?? {});
  const calls: Page['calls'] = [];
  const timers: { fn: () => void; ms: number }[] = [];
  let stored: Journey | null =
    options.stored === undefined ? makeJourney() : options.stored === null ? null : options.stored;
  let first = true;

  const fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, url, body });
    if (method === 'GET') {
      if (first && options.loadReply) {
        first = false;
        if (options.loadReply === 'pending') return new Promise<Response>(() => undefined);
        return reply(options.loadReply);
      }
      first = false;
      return stored
        ? jsonResponse(200, stored)
        : jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } });
    }
    if (method === 'POST') {
      if (options.createReply === 'pending') return new Promise<Response>(() => undefined);
      const r = options.createReply ?? { status: 201, body: makeJourney({ source: 'template' }) };
      if (r.status === 201) stored = r.body as Journey;
      return reply(r);
    }
    if (method === 'DELETE') {
      if (options.deleteReply) return reply(options.deleteReply);
      stored = null;
      return new Response(null, { status: 204 });
    }
    if (url.endsWith('/completion')) {
      if (options.completionReply) return reply(options.completionReply);
      const n = Number(/stages\/(\d+)\//.exec(url)?.[1]);
      const done = new Set(stored?.completedStages ?? []);
      if ((body as { completed: boolean }).completed) done.add(n);
      else done.delete(n);
      const list = [...done].sort((a, b) => a - b);
      if (stored) stored = { ...stored, completedStages: list };
      return jsonResponse(200, { completedStages: list });
    }
    if (url.endsWith('/goal')) {
      if (options.goalReply) return reply(options.goalReply);
      const goalDate = (body as { goalDate: string | null }).goalDate;
      if (stored) stored = { ...stored, goalDate };
      return jsonResponse(200, { goalDate });
    }
    // milestones
    const shown = [...(stored?.milestonesShown ?? []), (body as { milestone: string }).milestone];
    return jsonResponse(200, { milestonesShown: shown });
  };

  const controller = mount(document, {
    fetch,
    getStorage: () => storage,
    getNudgeStorage: () => nudge.storage,
    now: () => NOW,
    setTimer: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimer: () => undefined,
    print: () => undefined,
  });
  await tick();
  return {
    controller,
    calls,
    nudge,
    fire: (ms) => {
      const hit = timers.find((t) => t.ms === ms);
      if (!hit) throw new Error(`no timer with ${ms} ms`);
      hit.fn();
    },
  };
}

/** A journey of `n` stages with the given stages done and goal date. */
export function journeyOf(
  n: number,
  completed: number[] = [],
  goalDate: string | null = null,
  extra: Partial<Journey> = {},
): Journey {
  return makeJourney({
    stages: Array.from({ length: n }, (_, i) => makeStage(i + 1)),
    completedStages: completed,
    goalDate,
    ...extra,
  });
}

export interface StateCase {
  name: string;
  /** Put the page into the state. */
  run: () => Promise<Page>;
}

const fill = (id: string, value: string) => {
  (q(id) as HTMLInputElement).value = value;
};
const submitTopic = async () => {
  q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
  await tick();
};
const NOT_FOUND = { status: 404, body: { error: { code: 'NOT_FOUND', message: 'x' } } };
const SAVE_FAILED = { status: 500, body: { error: { code: 'SAVE_FAILED', message: 'x' } } };

/** Every screen and state in the scope table. */
export const STATE_CASES: StateCase[] = [
  // S1 Home
  { name: 'S1 home: empty', run: () => boot({ stored: null }) },
  {
    name: 'S1 home: topic error shown',
    run: async () => {
      const page = await boot({ stored: null });
      fill('topic-input', '!!!!');
      q('style-guide').click();
      await submitTopic();
      return page;
    },
  },
  {
    name: 'S1 home: style chosen',
    run: async () => {
      const page = await boot({ stored: null });
      fill('topic-input', 'Rust');
      q('style-planner').click();
      return page;
    },
  },
  {
    name: 'S1 home: generating, before the 5-second reassurance',
    run: async () => {
      const page = await boot({ stored: null, createReply: 'pending' });
      fill('topic-input', 'Rust');
      q('style-guide').click();
      await submitTopic();
      return page;
    },
  },
  {
    name: 'S1 home: generating, after the 5-second reassurance',
    run: async () => {
      const page = await boot({ stored: null, createReply: 'pending' });
      fill('topic-input', 'Rust');
      q('style-guide').click();
      await submitTopic();
      page.fire(SLOW_AFTER_MS);
      return page;
    },
  },
  {
    name: 'S1 home: daily-limit message',
    run: async () => {
      const page = await boot({
        stored: null,
        createReply: { status: 429, body: { error: { code: 'DAILY_LIMIT', message: 'x' } } },
      });
      fill('topic-input', 'Rust');
      q('style-guide').click();
      await submitTopic();
      return page;
    },
  },
  {
    name: 'S1 home: generation failed',
    run: async () => {
      const page = await boot({ stored: null, createReply: SAVE_FAILED });
      fill('topic-input', 'Rust');
      q('style-guide').click();
      await submitTopic();
      return page;
    },
  },
  {
    name: 'S1 home: replacing, with Back to my journey',
    run: async () => {
      const page = await boot();
      q('start-new-button').click();
      q('confirm-ok').click();
      await tick();
      return page;
    },
  },
  // Other screens
  { name: 'loading', run: () => boot({ loadReply: 'pending' }) },
  {
    name: 'load error',
    run: () =>
      boot({ loadReply: { status: 500, body: { error: { code: 'LOAD_FAILED', message: 'x' } } } }),
  },
  // S2 Journey
  { name: 'S2 journey: first stage up next, open', run: () => boot() },
  {
    name: 'S2 journey: all panels closed',
    run: async () => {
      const page = await boot();
      q('stage-toggle-1').click();
      return page;
    },
  },
  {
    name: 'S2 journey: to-do stage open',
    run: async () => {
      const page = await boot({ stored: journeyOf(5, [1]) });
      q('stage-toggle-4').click();
      return page;
    },
  },
  {
    name: 'S2 journey: done stage open',
    run: async () => {
      const page = await boot({ stored: journeyOf(5, [1]) });
      q('stage-toggle-1').click();
      return page;
    },
  },
  {
    name: 'S2 journey: stage marked',
    run: async () => {
      const page = await boot();
      q('complete-button-1').click();
      await tick();
      return page;
    },
  },
  {
    name: 'S2 journey: stage unmarked',
    run: async () => {
      const page = await boot({ stored: journeyOf(5, [1]) });
      q('stage-toggle-1').click();
      q('complete-button-1').click();
      await tick();
      return page;
    },
  },
  {
    name: 'S2 journey: save error on a stage ("not saved")',
    run: async () => {
      const page = await boot({ completionReply: SAVE_FAILED });
      q('complete-button-1').click();
      await tick();
      return page;
    },
  },
  {
    name: 'S2 journey: save error on a stage ("no longer saved")',
    run: async () => {
      const page = await boot({ completionReply: NOT_FOUND });
      q('complete-button-1').click();
      await tick();
      return page;
    },
  },
  {
    name: 'S2 journey: goal upcoming',
    run: () => boot({ stored: journeyOf(5, [1, 2], '2026-12-01') }),
  },
  {
    name: 'S2 journey: goal due today',
    run: () => boot({ stored: journeyOf(5, [1, 2, 3], '2026-11-10') }),
  },
  {
    name: 'S2 journey: goal passed',
    run: () => boot({ stored: journeyOf(5, [1], '2026-11-01') }),
  },
  {
    name: 'S2 journey: goal form open',
    run: async () => {
      const page = await boot();
      q('goal-button').click();
      return page;
    },
  },
  {
    name: 'S2 journey: goal form open with an error',
    run: async () => {
      const page = await boot();
      q('goal-button').click();
      fill('goal-input', '2020-01-01');
      q('goal-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await tick();
      return page;
    },
  },
  {
    name: 'S2 journey: goal save error',
    run: async () => {
      const page = await boot({ goalReply: SAVE_FAILED });
      q('goal-button').click();
      fill('goal-input', '2026-12-01');
      q('goal-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await tick();
      return page;
    },
  },
  {
    name: 'S2 journey: header details closed',
    run: async () => {
      const page = await boot();
      (q('header-details') as HTMLDetailsElement).open = false;
      return page;
    },
  },
  // S3 Banners
  {
    name: 'S3 banner: first-stage milestone',
    run: async () => {
      const page = await boot();
      q('complete-button-1').click();
      await tick();
      return page;
    },
  },
  {
    name: 'S3 banner: halfway milestone',
    run: async () => {
      const page = await boot({
        stored: journeyOf(5, [1], null, { milestonesShown: ['first-stage'] }),
      });
      q('complete-button-2').click();
      await tick();
      q('complete-button-3').click();
      await tick();
      return page;
    },
  },
  {
    name: 'S3 banner: nudge, due today',
    run: () =>
      boot({ stored: journeyOf(5, [1], '2026-11-10', { milestonesShown: ['first-stage'] }) }),
  },
  {
    name: 'S3 banner: nudge, three days left',
    run: () => boot({ stored: journeyOf(5, [], '2026-11-13') }),
  },
  {
    name: 'S3 banner: dismissed',
    run: async () => {
      const page = await boot({ stored: journeyOf(5, [], '2026-11-12') });
      // A banner must really be showing before Dismiss, or "dismissed" proves nothing.
      if (q('banner').hidden || q('banner').getAttribute('data-kind') !== 'nudge') {
        throw new Error('S3 banner: dismissed: no nudge banner was shown before Dismiss');
      }
      q('banner-dismiss').click();
      return page;
    },
  },
  // S4 Dialogs
  {
    name: 'S4 dialog: delete confirmation',
    run: async () => {
      const page = await boot();
      q('delete-button').click();
      return page;
    },
  },
  {
    name: 'S4 dialog: delete confirmation with an error',
    run: async () => {
      const page = await boot({ deleteReply: SAVE_FAILED });
      q('delete-button').click();
      q('confirm-ok').click();
      await tick();
      return page;
    },
  },
  {
    name: 'S4 dialog: replace confirmation',
    run: async () => {
      const page = await boot();
      q('start-new-button').click();
      return page;
    },
  },
  // S5 Completion
  {
    name: 'S5 completion: without a name',
    run: () =>
      boot({
        stored: journeyOf(5, [1, 2, 3, 4, 5], null, {
          milestonesShown: ['first-stage', 'halfway', 'complete'],
        }),
      }),
  },
  {
    name: 'S5 completion: with a name',
    run: async () => {
      const page = await boot({
        stored: journeyOf(6, [1, 2, 3, 4, 5, 6], null, {
          milestonesShown: ['first-stage', 'halfway', 'complete'],
        }),
      });
      fill('certificate-name-input', 'Alex Example');
      q('certificate-name-input').dispatchEvent(new Event('input'));
      return page;
    },
  },
  {
    name: 'S5 completion: Back to my journey view',
    run: async () => {
      const page = await boot({
        stored: journeyOf(5, [1, 2, 3, 4, 5], null, {
          milestonesShown: ['first-stage', 'halfway', 'complete'],
        }),
      });
      q('certificate-back-button').click();
      return page;
    },
  },
];
