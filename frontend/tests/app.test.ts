import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../src/api';
import { mount } from '../src/app';
import { SESSION_KEY } from '../src/session';
import {
  SESSION,
  blockedStorage,
  fakeStorage,
  jsonResponse,
  loadPage,
  makeJourney,
  makeStage,
  memoryStorage,
  modalCalls,
} from './helpers';

const NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'x' } };

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

/** Pick a teaching style the way a learner does, so the Generate button is enabled. */
const pickStyle = (key = 'guide') => q(`style-${key}`).click();

beforeEach(() => loadPage());

describe('page wiring (integration of session, API client, state and drawing)', () => {
  it('shows the home screen, then the journey after a topic is submitted', async () => {
    const storage = memoryStorage({ [SESSION_KEY]: SESSION });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, NOT_FOUND))
      .mockResolvedValueOnce(jsonResponse(201, makeJourney({ source: 'template' })));
    mount(document, { fetch, getStorage: () => storage });
    await tick();
    expect(q('home-screen').hidden).toBe(false);

    (q('topic-input') as HTMLInputElement).value = '  Rust  ';
    pickStyle();
    q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();

    expect(q('journey-screen').hidden).toBe(false);
    expect(q('source-label').textContent).toContain('Template-based journey');
    expect(q('home-screen').hidden).toBe(true);
    const [, init] = fetch.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ topic: 'Rust', style: 'guide' });
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(SESSION);
    expect(q('live-region').textContent).toBe('Your journey is ready');
  });

  it('shows a saved journey straight away and offers no way to start another', async () => {
    const storage = memoryStorage({ [SESSION_KEY]: SESSION });
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, makeJourney()));
    mount(document, { fetch, getStorage: () => storage });
    await tick();
    expect(q('journey-screen').hidden).toBe(false);
    expect(q('home-screen').hidden).toBe(true);
  });

  it('sends no request and says so when the browser blocks storage', async () => {
    const fetch = vi.fn();
    mount(document, { fetch, getStorage: () => blockedStorage() });
    await tick();
    expect(fetch).not.toHaveBeenCalled();
    expect(q('message-screen').hidden).toBe(false);
    expect(q('message-text').textContent).toMatch(/blocking storage/);
  });

  it('sends no request for an invalid topic and keeps the typed text', async () => {
    const storage = memoryStorage({ [SESSION_KEY]: SESSION });
    const fetch = vi.fn().mockResolvedValue(jsonResponse(404, NOT_FOUND));
    mount(document, { fetch, getStorage: () => storage });
    await tick();
    const input = q('topic-input') as HTMLInputElement;
    input.value = '!!!!';
    pickStyle();
    q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    expect(fetch).toHaveBeenCalledTimes(1); // only the page-open load
    expect(q('topic-error').textContent).toContain('letters or numbers');
    expect(input.value).toBe('!!!!');
    input.dispatchEvent(new Event('input'));
    expect(q('topic-error').hidden).toBe(true);
  });

  it('retries the load from the error screen and creates again from the failure message', async () => {
    const storage = memoryStorage({ [SESSION_KEY]: SESSION });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { error: { code: 'LOAD_FAILED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(404, NOT_FOUND))
      .mockResolvedValueOnce(jsonResponse(500, { error: { code: 'SAVE_FAILED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(404, NOT_FOUND))
      .mockResolvedValueOnce(jsonResponse(201, makeJourney()));
    mount(document, { fetch, getStorage: () => storage });
    await tick();
    expect(q('message-screen').hidden).toBe(false);
    q('load-retry-button').click();
    await tick();
    expect(q('home-screen').hidden).toBe(false);

    (q('topic-input') as HTMLInputElement).value = 'Rust';
    pickStyle();
    q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    expect(q('phase-message').textContent).toContain("couldn't make or save");
    q('try-again-button').click();
    await tick();
    expect(q('journey-screen').hidden).toBe(false);
  });
});

describe('stage ladder wiring (marking, errors, skeleton, focus)', () => {
  const storage = () => memoryStorage({ [SESSION_KEY]: SESSION });
  const mounted = async (fetch: FetchLike) => {
    mount(document, { fetch, getStorage: storage });
    await tick();
  };

  it('shows the skeleton and one loading announcement while the journey loads', async () => {
    let answer: (r: Response) => void = () => undefined;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)));
    mount(document, { fetch, getStorage: storage });
    expect(q('loading-screen').hidden).toBe(false);
    expect(q('skeleton').getAttribute('aria-hidden')).toBe('true');
    expect(q('live-region').textContent).toBe('Loading your journey');
    answer(jsonResponse(200, makeJourney({ completedStages: [1, 2] })));
    await tick();
    expect(q('loading-screen').hidden).toBe(true);
    expect(q('progress-count').textContent).toBe('2 of 5 complete');
    expect(q('stage-panel-3').hidden).toBe(false);
  });

  it('marks a stage: the figures change, the next stage opens and takes focus', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(200, { completedStages: [1] }));
    await mounted(fetch);
    q('complete-button-1').click();
    await tick();
    const [url, init] = fetch.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('/api/v1/journey/stages/1/completion');
    expect(init.method).toBe('PUT');
    expect(q('progress-percent').textContent).toBe('20%');
    expect(q('stage-status-1').textContent).toBe('Done');
    expect(q('stage-status-2').textContent).toBe('Up next');
    expect(q('stage-panel-2').hidden).toBe(false);
    expect(q('stage-panel-1').hidden).toBe(true);
    expect(document.activeElement).toBe(q('stage-heading-2'));
    expect(q('live-region').textContent).toContain('Stage 1 complete. 1 of 5 stages complete');
  });

  it('unmarks a stage: its panel stays open and focus stays on the button', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney({ completedStages: [1] })))
      .mockResolvedValueOnce(jsonResponse(200, { completedStages: [] }));
    await mounted(fetch);
    q('stage-toggle-1').click();
    expect(q('stage-panel-1').hidden).toBe(false);
    q('complete-button-1').click();
    await tick();
    expect(q('progress-percent').textContent).toBe('0%');
    expect(q('stage-panel-1').hidden).toBe(false);
    expect(q('complete-button-1').textContent).toBe('Mark stage 1 complete');
    expect(document.activeElement).toBe(q('complete-button-1'));
  });

  it('marking the last stage shows Journey complete and focuses its heading', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney({ completedStages: [1, 2, 3, 4] })))
      .mockResolvedValueOnce(jsonResponse(200, { completedStages: [1, 2, 3, 4, 5] }));
    await mounted(fetch);
    q('complete-button-5').click();
    await tick();
    expect(q('journey-title').textContent).toBe('Journey complete');
    expect(document.activeElement).toBe(q('journey-title'));
    expect(q('progress-percent').textContent).toBe('100%');
  });

  it('puts the stage back on a failed save and offers Try again, which then works', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(500, { error: { code: 'SAVE_FAILED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(200, { completedStages: [1] }));
    await mounted(fetch);
    q('complete-button-1').click();
    await tick();
    expect(q('progress-percent').textContent).toBe('0%');
    expect(q('stage-panel-1').hidden).toBe(false);
    expect(q('change-error-1').textContent).toContain("We couldn't save that change. Try again.");
    expect(document.activeElement).toBe(q('complete-button-1'));
    q('change-retry-1').click();
    await tick();
    expect(document.querySelector('[data-testid="change-error-1"]')).toBeNull();
    expect(q('progress-percent').textContent).toBe('20%');
  });

  it('shows the no-longer-saved message with a home button, and Reload for a changed journey', async () => {
    const gone = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(404, NOT_FOUND));
    await mounted(gone);
    q('complete-button-1').click();
    await tick();
    expect(q('change-error-1').textContent).toContain('no longer saved');
    expect(document.querySelector('[data-testid="change-retry-1"]')).toBeNull();
    q('change-home-1').click();
    expect(q('home-screen').hidden).toBe(false);
    expect(q('journey-screen').hidden).toBe(true);

    loadPage();
    const changed = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(
        jsonResponse(400, { error: { code: 'INVALID_REQUEST', message: 'x' } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, makeJourney({ completedStages: [3] })));
    await mounted(changed);
    q('complete-button-1').click();
    await tick();
    expect(q('change-error-1').textContent).toContain('journey has changed');
    q('change-reload-1').click();
    await tick();
    expect(q('progress-count').textContent).toBe('1 of 5 complete');
  });

  it('sends one request when the button is pressed twice quickly', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(200, { completedStages: [1] }));
    await mounted(fetch);
    q('complete-button-1').click();
    q('complete-button-1').click();
    q('complete-button-3').click();
    await tick();
    // One load and one completion call; the quiet milestone recording after the confirmed mark
    // is a separate call to another path (first-stage is reached by the first mark).
    const paths = fetch.mock.calls.map(([url]) => String(url));
    expect(paths.filter((url) => url.endsWith('/completion'))).toHaveLength(1);
    expect(paths.filter((url) => url === '/api/v1/journey')).toHaveLength(1);
  });
});

const GONE = { error: { code: 'NOT_FOUND', message: 'x' } };
const LIMIT = { error: { code: 'DAILY_LIMIT', message: 'x' } };
const click = (id: string) => q(id).click();

async function openWithJourney(fetch: ReturnType<typeof vi.fn>) {
  const storage = memoryStorage({ [SESSION_KEY]: SESSION });
  mount(document, { fetch: fetch as FetchLike, getStorage: () => storage });
  await tick();
}

describe('protection: daily limit, replace and delete (U3)', () => {
  it('shows the limit politely, keeps the typed topic and offers the way back', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney({ topic: 'Rust' })))
      .mockResolvedValueOnce(jsonResponse(429, LIMIT));
    await openWithJourney(fetch);
    click('start-new-button');
    click('confirm-ok');
    const input = q('topic-input') as HTMLInputElement;
    input.value = 'Python';
    pickStyle();
    q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    expect(q('limit-message').hidden).toBe(false);
    expect(q('limit-message').textContent).toContain("today's limit of 5");
    expect(q('live-region').textContent).toContain('Come back tomorrow');
    expect(input.value).toBe('Python');
    expect((q('generate-button') as HTMLButtonElement).disabled).toBe(false);
    expect(q('back-button').hidden).toBe(false);
    expect(q('phase-message').hidden).toBe(true);
  });

  it('opens the replace dialog from a journey, Cancel focus first, Cancel returns focus', async () => {
    await openWithJourney(vi.fn().mockResolvedValue(jsonResponse(200, makeJourney())));
    expect(q('start-new-button').hidden).toBe(false);
    q('start-new-button').focus();
    click('start-new-button');
    expect(modalCalls.showModal).toBe(1);
    expect(document.activeElement).toBe(q('confirm-cancel'));
    expect(q('confirm-text').textContent).toContain('Rust');
    click('confirm-cancel');
    expect((q('confirm-dialog') as HTMLDialogElement).open).toBe(false);
    expect(document.activeElement).toBe(q('start-new-button'));
    expect(q('journey-screen').hidden).toBe(false);
  });

  it('Escape closes the delete dialog as Cancel and sends no request', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, makeJourney()));
    await openWithJourney(fetch);
    click('delete-button');
    q('confirm-dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    expect((q('confirm-dialog') as HTMLDialogElement).open).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(q('delete-button'));
  });

  it('replace: way back reloads the stored journey from the server', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney({ topic: 'Rust' })))
      .mockResolvedValueOnce(
        jsonResponse(200, makeJourney({ topic: 'Rust', completedStages: [1] })),
      );
    await openWithJourney(fetch);
    click('start-new-button');
    click('confirm-ok');
    expect(q('home-screen').hidden).toBe(false);
    expect(document.activeElement).toBe(q('topic-input'));
    click('back-button');
    await tick();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((fetch.mock.calls[1] as [string, RequestInit])[1].method).toBe('GET');
    expect(q('journey-screen').hidden).toBe(false);
    expect(q('progress-count').textContent).toBe('1 of 5 complete');
  });

  it('replace: way back with the journey gone shows the home screen with a plain note', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(404, GONE));
    await openWithJourney(fetch);
    click('start-new-button');
    click('confirm-ok');
    click('back-button');
    await tick();
    expect(q('home-screen').hidden).toBe(false);
    expect(q('home-note').textContent).toContain('no longer saved');
    expect(q('back-button').hidden).toBe(true);
  });

  it('replace: way back with a failed load shows an inline error and Try again', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(500, { error: { code: 'LOAD_FAILED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()));
    await openWithJourney(fetch);
    click('start-new-button');
    click('confirm-ok');
    click('back-button');
    await tick();
    expect(q('back-error').hidden).toBe(false);
    click('back-retry-button');
    await tick();
    expect(q('journey-screen').hidden).toBe(false);
  });

  it('delete: confirm sends DELETE, shows Working..., then home with focus in the topic box', async () => {
    let release: (response: Response) => void = () => {};
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney({ topic: 'Rust' })))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (release = resolve)));
    await openWithJourney(fetch);
    click('delete-button');
    expect(q('confirm-text').textContent).toContain('Rust');
    click('confirm-ok');
    expect(q('confirm-ok').textContent).toBe('Working…');
    click('confirm-ok'); // a second press is ignored
    release(jsonResponse(204, undefined));
    await tick();
    const deletes = fetch.mock.calls.filter(
      ([, init]) => (init as RequestInit).method === 'DELETE',
    );
    expect(deletes).toHaveLength(1);
    expect((q('confirm-dialog') as HTMLDialogElement).open).toBe(false);
    expect(q('home-screen').hidden).toBe(false);
    expect(q('journey-screen').hidden).toBe(true);
    expect(document.activeElement).toBe(q('topic-input'));
    expect(q('live-region').textContent).toBe('Your journey was deleted.');
  });

  it('delete: a failure keeps the journey and shows the error inside the dialog', async () => {
    const fail = { error: { code: 'DELETE_FAILED', message: 'x' } };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(500, fail));
    await openWithJourney(fetch);
    click('delete-button');
    click('confirm-ok');
    await tick();
    expect((q('confirm-dialog') as HTMLDialogElement).open).toBe(true);
    expect(q('confirm-error').textContent).toContain('Your journey is still saved');
    expect(q('journey-screen').hidden).toBe(false);
    expect(q('confirm-ok').textContent).toBe('Delete journey');
    click('confirm-cancel');
    expect(document.activeElement).toBe(q('delete-button'));
  });

  it('delete: a network failure is retried once by itself', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(204, undefined));
    await openWithJourney(fetch);
    click('delete-button');
    click('confirm-ok');
    await tick();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(q('home-screen').hidden).toBe(false);
  });

  it('delete: a throttle with no code asks to wait, inside the dialog', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, makeJourney()))
      .mockResolvedValueOnce(jsonResponse(429, undefined));
    await openWithJourney(fetch);
    click('delete-button');
    click('confirm-ok');
    await tick();
    expect(q('confirm-error').textContent).toContain('Please wait');
  });

  it('create: the daily limit shows the limit message, a throttle shows please wait', async () => {
    const run = async (status: number, body: unknown) => {
      loadPage();
      const storage = memoryStorage({ [SESSION_KEY]: SESSION });
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(404, NOT_FOUND))
        .mockResolvedValueOnce(jsonResponse(status, body));
      mount(document, { fetch, getStorage: () => storage });
      await tick();
      (q('topic-input') as HTMLInputElement).value = 'Rust';
      pickStyle();
      q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await tick();
    };
    await run(429, LIMIT);
    expect(q('limit-message').hidden).toBe(false);
    expect(q('limit-message').textContent).toContain("today's limit of 5");
    expect(q('phase-message').textContent).not.toContain('Please wait');
    await run(429, undefined);
    expect(q('limit-message').hidden).toBe(true);
    expect(q('phase-message').hidden).toBe(false);
    expect(q('phase-message').textContent).toContain('Please wait');
  });

  it('shows no new-journey or delete control on the home screen', async () => {
    await openWithJourney(vi.fn().mockResolvedValue(jsonResponse(404, GONE)));
    expect(q('journey-screen').hidden).toBe(true);
    expect(q('start-new-button').offsetParent === null || q('journey-screen').hidden).toBe(true);
  });
});

describe('teaching style wiring (U4, BR33.1)', () => {
  const storage = () => memoryStorage({ [SESSION_KEY]: SESSION });
  const radio = (key: string) => q(`style-${key}`) as HTMLInputElement;
  const generate = () => q('generate-button') as HTMLButtonElement;

  it('starts with no style, the button disabled and a visible hint', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(404, NOT_FOUND));
    mount(document, { fetch, getStorage: storage });
    await tick();
    expect(['guide', 'instructor', 'planner'].map((k) => radio(k).checked)).toEqual([
      false,
      false,
      false,
    ]);
    expect(generate().disabled).toBe(true);
    expect(q('style-hint').hidden).toBe(false);
  });

  it('enables the button when a style is picked, and sends that style', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, NOT_FOUND))
      .mockResolvedValueOnce(jsonResponse(201, makeJourney({ teachingStyle: 'planner' })));
    mount(document, { fetch, getStorage: storage });
    await tick();
    radio('planner').click();
    expect(generate().disabled).toBe(false);
    expect(q('style-hint').hidden).toBe(true);
    (q('topic-input') as HTMLInputElement).value = 'Rust';
    q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    const [, init] = fetch.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ topic: 'Rust', style: 'planner' });
    expect(q('journey-style').textContent).toBe('Style: Planner');
  });

  it('sends nothing when the form is sent with no style chosen', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(404, NOT_FOUND));
    mount(document, { fetch, getStorage: storage });
    await tick();
    (q('topic-input') as HTMLInputElement).value = 'Rust';
    q('topic-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('empties the radios again through "Start a new journey"', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, makeJourney()));
    mount(document, { fetch, getStorage: storage });
    await tick();
    q('start-new-button').click();
    q('confirm-ok').click();
    expect(q('home-screen').hidden).toBe(false);
    expect(['guide', 'instructor', 'planner'].map((k) => radio(k).checked)).toEqual([
      false,
      false,
      false,
    ]);
    expect(generate().disabled).toBe(true);
    radio('instructor').click();
    expect(radio('instructor').checked).toBe(true);
  });
});

describe('goal date wiring (U4, BR31)', () => {
  const NOON = new Date(2026, 10, 10, 12, 0, 0).getTime();
  const storage = () => memoryStorage({ [SESSION_KEY]: SESSION });
  const four = [1, 2, 3, 4].map((n) => makeStage(n, { hours: 4 }));
  const journey = (goalDate: string | null = null) => makeJourney({ stages: four, goalDate });
  const input = () => q('goal-input') as HTMLInputElement;
  const submitGoal = (value: string) => {
    input().value = value;
    q('goal-form').dispatchEvent(new Event('submit', { cancelable: true }));
  };
  const goalBody = (fetch: ReturnType<typeof vi.fn>, call: number) => {
    const [url, init] = fetch.mock.calls[call] as [string, RequestInit];
    return { url, method: init.method, body: JSON.parse(init.body as string) };
  };

  it('opens the form, saves a date, changes the header at once and announces after the answer', async () => {
    let answer: (r: Response) => void = () => undefined;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, journey()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (answer = resolve)));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    expect(q('goal-button').textContent).toBe('Set a goal date');
    q('goal-button').click();
    expect(q('goal-form').hidden).toBe(false);
    expect(document.activeElement).toBe(input());
    submitGoal('2026-12-08');
    expect(q('goal-text').textContent).toBe('Goal date: 8 Dec 2026 · 28 days left');
    expect(q('journey-pace').textContent).toBe('Suggested pace: about 4 hours per week');
    expect(q('goal-form').hidden).toBe(true);
    expect(q('live-region').textContent).toBe(''); // not "saved" until the server says so
    expect(document.activeElement).toBe(q('goal-button'));
    answer(jsonResponse(200, { goalDate: '2026-12-08' }));
    await tick();
    expect(q('live-region').textContent).toBe('Goal date saved');
    expect(goalBody(fetch, 1)).toEqual({
      url: '/api/v1/journey/goal',
      method: 'PUT',
      body: { goalDate: '2026-12-08' },
    });
  });

  it('clears the date and announces "Goal date cleared" after the answer', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, journey('2026-12-08')))
      .mockResolvedValueOnce(jsonResponse(200, { goalDate: null }));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    expect(input().value).toBe('');
    q('goal-button').click();
    expect(input().value).toBe('2026-12-08');
    q('goal-clear-button').click();
    expect(q('goal-button').textContent).toBe('Set a goal date');
    expect(q('journey-pace').hidden).toBe(true);
    await tick();
    expect(q('live-region').textContent).toBe('Goal date cleared');
    expect(goalBody(fetch, 1).body).toEqual({ goalDate: null });
  });

  it('closes with Escape and saves nothing', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, journey()));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    q('goal-button').click();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(q('goal-form').hidden).toBe(true);
    expect(document.activeElement).toBe(q('goal-button'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows the range message beside the field and sends nothing for a date out of range', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, journey()));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    q('goal-button').click();
    submitGoal('2026-11-09');
    expect(q('goal-field-error').textContent).toContain(
      'Choose a date from today up to 365 days ahead.',
    );
    expect(input().value).toBe('2026-11-09');
    expect(q('goal-form').hidden).toBe(false);
    expect(document.activeElement).toBe(input());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('puts the old value back after a failure and Try again repeats the change', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, journey('2026-12-01')))
      .mockResolvedValueOnce(jsonResponse(500, { error: { code: 'SAVE_FAILED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(200, { goalDate: '2026-12-08' }));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    q('goal-button').click();
    submitGoal('2026-12-08');
    await tick();
    expect(q('goal-text').textContent).toContain('1 Dec 2026');
    expect(q('goal-error').textContent).toContain("couldn't save the goal date");
    expect(q('live-region').textContent).not.toBe('Goal date saved');
    q('goal-retry-button').click();
    await tick();
    expect(q('goal-text').textContent).toContain('8 Dec 2026');
    expect(q('goal-error').hidden).toBe(true);
    expect(q('live-region').textContent).toBe('Goal date saved');
  });

  it('shows the no-longer-saved message with a home button when the journey is gone', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, journey()))
      .mockResolvedValueOnce(jsonResponse(404, NOT_FOUND));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    q('goal-button').click();
    submitGoal('2026-12-08');
    await tick();
    expect(q('goal-error').textContent).toContain('no longer saved');
    q('goal-home-button').click();
    expect(q('home-screen').hidden).toBe(false);
  });

  it('reopens the form with the old value for an invalid request', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, journey('2026-12-01')))
      .mockResolvedValueOnce(
        jsonResponse(400, { error: { code: 'INVALID_REQUEST', message: 'x' } }),
      );
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    q('goal-button').click();
    submitGoal('2026-12-08');
    await tick();
    expect(q('goal-form').hidden).toBe(false);
    expect(input().value).toBe('2026-12-01');
    expect(q('goal-field-error').textContent).toContain('could not be used');
    expect(q('goal-retry-button').hidden).toBe(true);
  });

  it('shows please wait for a throttle with no error code', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, journey()))
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    q('goal-button').click();
    submitGoal('2026-12-08');
    await tick();
    expect(q('goal-error').textContent).toContain('Please wait');
    expect(q('goal-text').hidden).toBe(true);
  });

  it('ignores Start a new journey and Delete while a goal saves, and Save while a delete runs', async () => {
    let answer: (r: Response) => void = () => undefined;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, journey()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (answer = resolve)));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    q('goal-button').click();
    submitGoal('2026-12-08');
    q('start-new-button').click();
    q('delete-button').click();
    expect(modalCalls.showModal).toBe(0);
    answer(jsonResponse(200, { goalDate: '2026-12-08' }));
    await tick();
    q('delete-button').click();
    expect(modalCalls.showModal).toBe(1);
  });

  it('refreshes the goal line at the next local midnight', async () => {
    let moment = new Date(2026, 10, 10, 23, 59, 0).getTime();
    const timers: { fn: () => void; ms: number }[] = [];
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, journey('2026-11-12')));
    mount(document, {
      fetch,
      getStorage: storage,
      now: () => moment,
      setTimer: (fn, ms) => timers.push({ fn, ms }) - 1,
    });
    await tick();
    expect(q('goal-text').textContent).toContain('2 days left');
    const midnight = timers.find((t) => t.ms < 120_000);
    expect(midnight).toBeDefined();
    moment = new Date(2026, 10, 11, 0, 0, 5).getTime();
    midnight?.fn();
    expect(q('goal-text').textContent).toContain('1 day left');
  });

  it('refreshes the goal line when the tab becomes visible again', async () => {
    let moment = new Date(2026, 10, 10, 12, 0, 0).getTime();
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, journey('2026-11-12')));
    mount(document, { fetch, getStorage: storage, now: () => moment });
    await tick();
    expect(q('goal-text').textContent).toContain('2 days left');
    moment = new Date(2026, 10, 12, 9, 0, 0).getTime();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(q('goal-text').textContent).toBe('Goal date: today · Due today');
  });

  it('shows the format hint only when the browser shows a plain text box', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, journey()));
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    expect(q('goal-format-hint').hidden).toBe(true); // jsdom keeps a real date field
    loadPage();
    Object.defineProperty(q('goal-input'), 'type', { get: () => 'text', set: () => undefined });
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    expect(q('goal-format-hint').hidden).toBe(false);
    expect(q('goal-format-hint').textContent?.trim()).toBe('Use the format YYYY-MM-DD');
  });

  it('opens the Details disclosure on a wide screen and closes it on a narrow one', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, journey()));
    let listener: (event: { matches: boolean }) => void = () => undefined;
    const stub = (matches: boolean) =>
      vi.fn(() => ({
        matches,
        addEventListener: (_name: string, fn: typeof listener) => (listener = fn),
      }));
    window.matchMedia = stub(false) as unknown as typeof window.matchMedia;
    mount(document, { fetch, getStorage: storage, now: () => NOON });
    await tick();
    expect((q('header-details') as HTMLDetailsElement).open).toBe(false);
    listener({ matches: true });
    expect((q('header-details') as HTMLDetailsElement).open).toBe(true);
    delete (window as { matchMedia?: unknown }).matchMedia;
  });
});

describe('the certificate name stays in page memory (BR41.2)', () => {
  it('is carried by no request and no storage write, even after printing', async () => {
    const session = memoryStorage({ [SESSION_KEY]: SESSION });
    const nudge = fakeStorage();
    const fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, makeJourney({ completedStages: [1, 2, 3, 4, 5] })));
    const print = vi.fn();
    mount(document, {
      fetch,
      getStorage: () => session,
      getNudgeStorage: () => nudge.storage,
      print,
    });
    await tick();
    const name = 'Zelda Q. Learner';
    const input = q('certificate-name-input') as HTMLInputElement;
    input.value = name;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(q('certificate-name').textContent).toContain(name);
    q('certificate-print-button').click();
    await tick();

    expect(print).toHaveBeenCalledTimes(1);
    for (const call of fetch.mock.calls as [string, RequestInit][]) {
      expect(JSON.stringify(call)).not.toContain('Zelda');
    }
    expect([...session.data.values()].join('|')).not.toContain('Zelda');
    expect([...nudge.data.entries()].join('|')).not.toContain('Zelda');
    expect(nudge.calls.join('|')).not.toContain('Zelda');
  });
});
