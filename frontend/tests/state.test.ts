import { describe, expect, it, vi } from 'vitest';
import type { Milestone } from '../src/milestones';
import { dismissalKey, nudgeMessage, type NudgeStorage } from '../src/nudge';
import { JourneyController, type ControllerDeps } from '../src/state';
import type {
  CompletionResult,
  CreateResult,
  DeleteResult,
  GoalResult,
  LoadResult,
  MilestoneResult,
} from '../src/types';
import { SESSION, blockedNudgeStorage, fakeStorage, makeJourney } from './helpers';

function setup(opts: {
  load?: LoadResult | LoadResult[];
  create?: CreateResult | CreateResult[];
  session?: boolean;
  set?: CompletionResult | CompletionResult[];
  del?: DeleteResult | DeleteResult[];
  goal?: GoalResult | GoalResult[];
  milestone?: MilestoneResult | MilestoneResult[];
  nudgeStorage?: () => NudgeStorage | null;
  /** Pick the guide style before each submit, as most tests are not about the style choice. */
  autoStyle?: boolean;
  now?: () => number;
}) {
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
  const loads = [opts.load ?? { kind: 'none' }].flat();
  const creates = [opts.create ?? { kind: 'failed' }].flat();
  const sets = [opts.set ?? { kind: 'failed' }].flat();
  const deletes = [opts.del ?? { kind: 'failed' }].flat();
  const goals = [opts.goal ?? { kind: 'failed' }].flat();
  const milestoneResults = [opts.milestone ?? { kind: 'failed' }].flat();
  const api = {
    setCompletion: vi.fn(async (...args: [string, number, boolean]) => {
      void args;
      return sets.shift() ?? ({ kind: 'failed' } as CompletionResult);
    }),
    load: vi.fn(async () => loads.shift() ?? ({ kind: 'none' } as LoadResult)),
    create: vi.fn(async () => creates.shift() ?? ({ kind: 'failed' } as CreateResult)),
    delete: vi.fn(async () => deletes.shift() ?? ({ kind: 'failed' } as DeleteResult)),
    setGoal: vi.fn(async (...args: [string, string | null]) => {
      void args;
      return goals.shift() ?? ({ kind: 'failed' } as GoalResult);
    }),
    recordMilestone: vi.fn(async (...args: [string, Milestone]) => {
      void args;
      return milestoneResults.shift() ?? ({ kind: 'failed' } as MilestoneResult);
    }),
  };
  const deps: ControllerDeps = {
    api,
    nudgeStorage: opts.nudgeStorage ?? (() => null),
    session: () => (opts.session === false ? { ok: false } : { ok: true, sessionId: SESSION }),
    now: opts.now ?? (() => Date.now()),
    setTimer: (fn, ms) => {
      timers.push({ fn, ms, cleared: false });
      return timers.length - 1;
    },
    clearTimer: (handle) => {
      const t = timers[handle as number];
      if (t) t.cleared = true;
    },
  };
  const controller = new JourneyController(deps);
  if (opts.autoStyle !== false) {
    const submit = controller.submit.bind(controller);
    controller.submit = (raw: string) => {
      if (controller.state.style === null) controller.chooseStyle('guide');
      return submit(raw);
    };
  }
  return { controller, api, timers };
}

describe('opening the page (workflow 3)', () => {
  it('shows the home screen when no journey exists', async () => {
    const { controller } = setup({ load: { kind: 'none' } });
    await controller.start();
    expect(controller.state.screen).toBe('home');
  });

  it('shows a saved journey and offers no way to start another', async () => {
    const journey = makeJourney();
    const { controller } = setup({ load: { kind: 'journey', journey } });
    await controller.start();
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.journey).toBe(journey);
  });

  it('shows the storage message and sends no request when storage is blocked', async () => {
    const { controller, api } = setup({ session: false });
    await controller.start();
    expect(controller.state.screen).toBe('storage-blocked');
    expect(api.load).not.toHaveBeenCalled();
  });

  it('shows a load error, or the please-wait message when throttled', async () => {
    const failed = setup({ load: { kind: 'failed' } });
    await failed.controller.start();
    expect(failed.controller.state.screen).toBe('load-error');
    const throttled = setup({ load: { kind: 'rate-limited' } });
    await throttled.controller.start();
    expect(throttled.controller.state.screen).toBe('load-rate-limited');
  });
});

describe('creating a journey (workflow 1)', () => {
  it('rejects an invalid topic without a request and keeps the screen', async () => {
    const { controller, api } = setup({ load: { kind: 'none' } });
    await controller.start();
    await controller.submit('!!!!');
    expect(api.create).not.toHaveBeenCalled();
    expect(controller.state.topicError).toMatch(/letters or numbers/);
    await controller.submit('a');
    expect(controller.state.topicError).toMatch(/between 2 and 100/);
  });

  it('goes generating then shown, announcing both, and starts the 5 second timer', async () => {
    const journey = makeJourney();
    const { controller, timers } = setup({ create: { kind: 'journey', journey } });
    const seen: string[] = [];
    controller.subscribe((s) => seen.push(s.phase));
    await controller.submit('Rust');
    expect(seen).toContain('generating');
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.announcement).toBe('Your journey is ready');
    expect(timers[0]).toMatchObject({ ms: 5000, cleared: true });
  });

  it('marks the wait as slow after 5 seconds and clears it when done', async () => {
    let finish: (r: CreateResult) => void = () => undefined;
    const { controller, api, timers } = setup({});
    api.create.mockImplementation(() => new Promise<CreateResult>((resolve) => (finish = resolve)));
    const pending = controller.submit('Rust');
    expect(controller.state.phase).toBe('generating');
    expect(controller.state.announcement).toBe('Generating your journey');
    timers[0]?.fn();
    expect(controller.state.slow).toBe(true);
    finish({ kind: 'not-allowed' });
    await pending;
    expect(controller.state.slow).toBe(false);
  });

  it('accepts no second request while generating', async () => {
    const { controller, api } = setup({});
    api.create.mockImplementation(() => new Promise<CreateResult>(() => undefined));
    void controller.submit('Rust');
    await controller.submit('Rust again');
    await controller.retry();
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('shows not-allowed, keeps going after the topic is edited', async () => {
    const { controller } = setup({ create: { kind: 'not-allowed' } });
    await controller.submit('bad');
    expect(controller.state.phase).toBe('not-allowed');
    controller.topicEdited();
    expect(controller.state.phase).toBe('idle');
  });

  it('shows please-wait when throttled, with no journey check', async () => {
    const { controller, api } = setup({ create: { kind: 'rate-limited' } });
    await controller.submit('Rust');
    expect(controller.state.phase).toBe('rate-limited');
    expect(api.load).not.toHaveBeenCalled();
  });

  it('shows the server topic message when the server rejects a topic the browser passed', async () => {
    const { controller } = setup({ create: { kind: 'topic-invalid' } });
    await controller.submit('Rust');
    expect(controller.state.topicError).toMatch(/between 2 and 100/);
    expect(controller.state.phase).toBe('idle');
  });

  it('topicEdited clears a topic error but not an in-flight request', async () => {
    const { controller } = setup({});
    await controller.submit('!!');
    controller.topicEdited();
    expect(controller.state.topicError).toBeNull();
  });
});

describe('try again after a failure', () => {
  it('shows a journey made in the last minute instead of sending a new request', async () => {
    const recent = makeJourney({ createdAt: new Date(Date.now() - 20_000).toISOString() });
    const { controller, api } = setup({
      create: { kind: 'failed' },
      load: { kind: 'journey', journey: recent },
    });
    await controller.submit('Rust');
    expect(controller.state.phase).toBe('failed');
    await controller.retry();
    expect(controller.state.screen).toBe('journey');
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('creates again when no recent journey exists', async () => {
    const old = makeJourney({ createdAt: new Date(Date.now() - 600_000).toISOString() });
    const journey = makeJourney();
    const { controller, api } = setup({
      create: [{ kind: 'failed' }, { kind: 'journey', journey }],
      load: { kind: 'journey', journey: old },
    });
    await controller.submit('Rust');
    await controller.retry();
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(controller.state.journey).toBe(journey);
  });

  it('creates again when the check finds nothing, and shows please-wait when throttled', async () => {
    const a = setup({ create: [{ kind: 'failed' }, { kind: 'failed' }], load: { kind: 'none' } });
    await a.controller.submit('Rust');
    await a.controller.retry();
    expect(a.api.create).toHaveBeenCalledTimes(2);
    const b = setup({ create: { kind: 'failed' }, load: { kind: 'rate-limited' } });
    await b.controller.submit('Rust');
    await b.controller.retry();
    expect(b.controller.state.phase).toBe('rate-limited');
  });

  it('retries a throttled create without a journey check and does nothing with no topic', async () => {
    const { controller, api } = setup({ create: [{ kind: 'rate-limited' }, { kind: 'failed' }] });
    await controller.retry();
    expect(api.create).not.toHaveBeenCalled();
    await controller.submit('Rust');
    await controller.retry();
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(api.load).not.toHaveBeenCalled();
  });

  it('shows the storage message when storage goes away', async () => {
    const { controller } = setup({ session: false });
    await controller.retry();
    expect(controller.state.screen).toBe('storage-blocked');
    await controller.submit('Rust');
    expect(controller.state.screen).toBe('storage-blocked');
  });
});

const FIVE = [1, 2, 3, 4, 5];

async function open(opts: Parameters<typeof setup>[0], completed: number[] = []) {
  const journey = makeJourney({ completedStages: completed });
  const made = setup({ ...opts, load: { kind: 'journey', journey } });
  await made.controller.start();
  return made;
}

describe('showing a saved journey (BR10.4, BR13.4)', () => {
  it('opens the up-next stage and announces the loading once', async () => {
    const seen: string[] = [];
    const made = setup({
      load: { kind: 'journey', journey: makeJourney({ completedStages: [1] }) },
    });
    made.controller.subscribe((s) => seen.push(s.announcement));
    await made.controller.start();
    expect(seen).toContain('Loading your journey');
    expect(made.controller.state.open).toBe(2);
    expect(made.controller.state.focus).toEqual({ type: 'title' });
  });

  it('opens no stage when every stage is done', async () => {
    const { controller } = await open({}, FIVE);
    expect(controller.state.open).toBeNull();
  });

  it('opens and closes a panel by itself', async () => {
    const { controller } = await open({});
    controller.openPanel(4);
    expect(controller.state.open).toBe(4);
    controller.openPanel(null);
    expect(controller.state.open).toBeNull();
  });
});

describe('marking and unmarking (workflows 1 and 2)', () => {
  it('changes at once, then takes the server list and announces it', async () => {
    let finish: (r: CompletionResult) => void = () => undefined;
    const { controller, api } = await open({});
    api.setCompletion.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const pending = controller.toggleStage(1);
    expect(controller.state.journey?.completedStages).toEqual([1]);
    expect(controller.state.saving).toBe(1);
    expect(controller.state.open).toBe(2);
    expect(controller.state.focus).toEqual({ type: 'heading', stage: 2 });
    finish({ kind: 'completed', completedStages: [1] });
    await pending;
    expect(controller.state.saving).toBeNull();
    expect(api.setCompletion).toHaveBeenCalledWith(SESSION, 1, true);
    expect(controller.state.announcement).toBe(
      'Stage 1 complete. 1 of 5 stages complete, 20 percent. Stage 2 is open.',
    );
  });

  it('replaces the list with the answer when another tab changed it', async () => {
    const { controller } = await open({ set: { kind: 'completed', completedStages: [2, 3] } });
    await controller.toggleStage(3);
    expect(controller.state.journey?.completedStages).toEqual([2, 3]);
    expect(controller.state.open).toBe(1); // the new up-next from the server's list
  });

  it('marking the last stage opens none and asks for the Journey complete heading', async () => {
    const { controller } = await open(
      { set: { kind: 'completed', completedStages: FIVE } },
      [1, 2, 3, 4],
    );
    await controller.toggleStage(5);
    expect(controller.state.open).toBeNull();
    expect(controller.state.focus).toEqual({ type: 'complete-heading' });
    expect(controller.state.announcement).toBe(
      'Stage 5 complete. 5 of 5 stages complete, 100 percent.',
    );
  });

  it('unmarking keeps the pressed panel open with focus on its button', async () => {
    const { controller, api } = await open(
      { set: { kind: 'completed', completedStages: [] } },
      [1],
    );
    await controller.toggleStage(1);
    expect(api.setCompletion).toHaveBeenCalledWith(SESSION, 1, false);
    expect(controller.state.open).toBe(1);
    expect(controller.state.focus).toEqual({ type: 'button', stage: 1 });
    expect(controller.state.announcement).toBe(
      'Stage 1 marked as not complete. 0 of 5 stages complete, 0 percent.',
    );
  });

  it('ignores a press on any stage while a change is saving', async () => {
    const { controller, api } = await open({});
    api.setCompletion.mockImplementation(() => new Promise(() => undefined));
    void controller.toggleStage(1);
    await controller.toggleStage(1);
    await controller.toggleStage(3);
    await controller.retryChange();
    expect(api.setCompletion).toHaveBeenCalledTimes(1);
    expect(controller.state.journey?.completedStages).toEqual([1]);
  });

  it('puts the stage back, reopens the pressed panel and shows the retry error on a failure', async () => {
    for (const result of [{ kind: 'save-failed' }, { kind: 'failed' }] as CompletionResult[]) {
      const { controller } = await open({ set: result }, [2]);
      await controller.toggleStage(1);
      const s = controller.state;
      expect(s.journey?.completedStages).toEqual([2]);
      expect(s.changeError).toEqual({ stage: 1, kind: 'save-failed' });
      expect(s.open).toBe(1);
      expect(s.focus).toEqual({ type: 'button', stage: 1 });
      expect(s.announcement).toContain("couldn't save that change");
    }
  });

  it('Try again repeats the same change and clears the error when it works', async () => {
    const { controller, api } = await open({
      set: [{ kind: 'save-failed' }, { kind: 'completed', completedStages: [1] }],
    });
    await controller.toggleStage(1);
    await controller.retryChange();
    expect(api.setCompletion).toHaveBeenNthCalledWith(2, SESSION, 1, true);
    expect(controller.state.changeError).toBeNull();
    expect(controller.state.journey?.completedStages).toEqual([1]);
  });

  it('maps a vanished journey, a changed journey and a throttle to their messages', async () => {
    const expected: [CompletionResult, string][] = [
      [{ kind: 'not-found' }, 'gone'],
      [{ kind: 'invalid-request' }, 'changed'],
      [{ kind: 'rate-limited' }, 'rate-limited'],
    ];
    for (const [result, kind] of expected) {
      const { controller } = await open({ set: result });
      await controller.toggleStage(2);
      expect(controller.state.changeError).toEqual({ stage: 2, kind });
      expect(controller.state.journey?.completedStages).toEqual([]);
      expect(controller.state.open).toBe(2);
    }
  });

  it('goes back to the home screen from the no-longer-saved message', async () => {
    const { controller } = await open({ set: { kind: 'not-found' } });
    await controller.toggleStage(1);
    controller.goHome();
    expect(controller.state.screen).toBe('home');
    expect(controller.state.journey).toBeNull();
    expect(controller.state.changeError).toBeNull();
  });

  it('shows the storage message and sends nothing when storage turns out blocked', async () => {
    const { controller, api } = await open({});
    let ok = true;
    (controller as unknown as { deps: ControllerDeps }).deps.session = () =>
      ok ? { ok: true, sessionId: SESSION } : { ok: false };
    ok = false;
    await controller.toggleStage(1);
    expect(controller.state.screen).toBe('storage-blocked');
    expect(api.setCompletion).not.toHaveBeenCalled();
  });

  it('does nothing without a journey, and a retry with nothing to repeat does nothing', async () => {
    const { controller, api } = setup({});
    await controller.toggleStage(1);
    await controller.retryChange();
    expect(api.setCompletion).not.toHaveBeenCalled();
  });
});

const GOT: LoadResult = { kind: 'journey', journey: makeJourney({ topic: 'Rust' }) };

describe('the daily limit (BR21.1, BR21.2)', () => {
  it('shows its own phase and keeps the typed topic and the button enabled', async () => {
    const { controller } = setup({ load: { kind: 'none' }, create: { kind: 'daily-limit' } });
    await controller.start();
    await controller.submit('Python');
    expect(controller.state.phase).toBe('daily-limit');
    expect(controller.state.announcement).toMatch(/today's limit of 5/);
    expect(controller.state.announcement).not.toMatch(/Please wait/);
    expect(controller.state.topicError).toBeNull();
    expect(controller.state.screen).toBe('home');
  });

  it('mentions the kept journey when there is one', async () => {
    const { controller } = setup({ load: GOT, create: { kind: 'daily-limit' } });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.submit('Python');
    expect(controller.state.announcement).toContain('Your current journey is still available.');
    expect(controller.state.journey?.topic).toBe('Rust');
  });
});

describe('start a new journey (BR22.1, BR22.2)', () => {
  it('opens a dialog only when a journey is shown, and Cancel changes nothing', async () => {
    const { controller } = setup({ load: { kind: 'none' } });
    await controller.start();
    controller.openDialog('replace');
    expect(controller.state.dialog).toBeNull();
    const second = setup({ load: GOT });
    await second.controller.start();
    second.controller.openDialog('replace');
    expect(second.controller.state.dialog).toEqual({ kind: 'replace', busy: false, error: null });
    second.controller.cancelDialog();
    expect(second.controller.state.dialog).toBeNull();
    expect(second.controller.state.screen).toBe('journey');
  });

  it('on confirm shows the topic screen without any request and keeps the journey', async () => {
    const { controller, api } = setup({ load: GOT });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    expect(controller.state.screen).toBe('home');
    expect(controller.state.replacing).toBe(true);
    expect(controller.state.journey?.topic).toBe('Rust');
    expect(controller.state.focus).toEqual({ type: 'topic' });
    expect(api.create).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('replaces the journey only when the new one is saved', async () => {
    const created = makeJourney({ topic: 'Go' });
    const { controller } = setup({ load: GOT, create: { kind: 'journey', journey: created } });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.submit('Go');
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.journey?.topic).toBe('Go');
    expect(controller.state.replacing).toBe(false);
  });

  it.each(['not-allowed', 'daily-limit', 'rate-limited', 'failed'] as const)(
    'a %s ending leaves the stored journey and the way back',
    async (kind) => {
      const { controller } = setup({ load: GOT, create: { kind } });
      await controller.start();
      controller.openDialog('replace');
      controller.confirmReplace();
      await controller.submit('Go');
      expect(controller.state.screen).toBe('home');
      expect(controller.state.replacing).toBe(true);
      expect(controller.state.journey?.topic).toBe('Rust');
    },
  );

  it('does not take the old journey for a new one when trying again', async () => {
    const { controller, api } = setup({
      load: [GOT, GOT],
      create: [{ kind: 'failed' }, { kind: 'failed' }],
    });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.submit('Go');
    await controller.retry();
    expect(controller.state.screen).toBe('home');
    expect(api.create).toHaveBeenCalledTimes(2);
  });

  it('ignores the way back while a create is running, then shows the new journey normally', async () => {
    const created = makeJourney({ topic: 'Go' });
    const { controller, api } = setup({ load: GOT });
    let finish: (r: CreateResult) => void = () => undefined;
    api.create.mockImplementation(() => new Promise<CreateResult>((r) => (finish = r)));
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    const pending = controller.submit('Go');
    expect(controller.state.phase).toBe('generating');
    await controller.backToJourney();
    expect(controller.state.screen).toBe('home');
    expect(controller.state.backBusy).toBe(false);
    expect(api.load).toHaveBeenCalledTimes(1);
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.submit('Again');
    await controller.retry();
    expect(api.create).toHaveBeenCalledTimes(1);
    finish({ kind: 'journey', journey: created });
    await pending;
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.journey?.topic).toBe('Go');
  });

  it('the way back reloads the stored journey from the server', async () => {
    const newer = makeJourney({ topic: 'Rust', completedStages: [1] });
    const { controller, api } = setup({ load: [GOT, { kind: 'journey', journey: newer }] });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.backToJourney();
    expect(api.load).toHaveBeenCalledTimes(2);
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.journey?.completedStages).toEqual([1]);
    expect(controller.state.replacing).toBe(false);
  });

  it('the way back shows the home screen with a note when the journey is gone', async () => {
    const { controller } = setup({ load: [GOT, { kind: 'none' }] });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.backToJourney();
    expect(controller.state.screen).toBe('home');
    expect(controller.state.journey).toBeNull();
    expect(controller.state.note).toMatch(/no longer saved/);
    expect(controller.state.replacing).toBe(false);
  });

  it.each([
    ['failed', 'failed'],
    ['rate-limited', 'rate-limited'],
  ] as const)('the way back shows an inline error when the load is %s', async (kind, expected) => {
    const { controller } = setup({ load: [GOT, { kind }, GOT] });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.backToJourney();
    expect(controller.state.backError).toBe(expected);
    expect(controller.state.screen).toBe('home');
    await controller.backToJourney(); // Try again
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.backError).toBeNull();
  });

  it('ignores a second press of the way back while it loads', async () => {
    const { controller, api } = setup({ load: [GOT, GOT] });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    await Promise.all([controller.backToJourney(), controller.backToJourney()]);
    expect(api.load).toHaveBeenCalledTimes(2);
  });

  it('stops at the storage message when storage is blocked on the way back', async () => {
    let ok = true;
    const { controller } = setup({ load: GOT });
    (controller as unknown as { deps: ControllerDeps }).deps.session = () =>
      ok ? { ok: true, sessionId: SESSION } : { ok: false };
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    ok = false;
    await controller.backToJourney();
    expect(controller.state.screen).toBe('storage-blocked');
  });
});

describe('delete my journey (BR23.2)', () => {
  it('Cancel closes the dialog and deletes nothing', async () => {
    const { controller, api } = setup({ load: GOT });
    await controller.start();
    controller.openDialog('delete');
    controller.cancelDialog();
    expect(controller.state.dialog).toBeNull();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deleting shows the home screen with focus on the topic box', async () => {
    const { controller, api } = setup({ load: GOT, del: { kind: 'deleted' } });
    await controller.start();
    controller.openDialog('delete');
    await controller.confirmDelete();
    expect(api.delete).toHaveBeenCalledWith(SESSION);
    expect(controller.state.screen).toBe('home');
    expect(controller.state.journey).toBeNull();
    expect(controller.state.dialog).toBeNull();
    expect(controller.state.focus).toEqual({ type: 'topic' });
    expect(controller.state.announcement).toBe('Your journey was deleted.');
  });

  it('drops a stage-change answer that arrives after the delete finished', async () => {
    const { controller, api } = setup({ load: GOT, del: { kind: 'deleted' } });
    let answer: (r: CompletionResult) => void = () => undefined;
    api.setCompletion.mockImplementation(() => new Promise<CompletionResult>((r) => (answer = r)));
    await controller.start();
    const change = controller.toggleStage(1);
    controller.openDialog('delete');
    await controller.confirmDelete();
    expect(controller.state.journey).toBeNull();
    answer({ kind: 'completed', completedStages: [1] });
    await change;
    expect(controller.state.journey).toBeNull();
    expect(controller.state.screen).toBe('home');
    expect(controller.state.saving).toBeNull();
  });

  it('drops a failed stage-change answer that arrives after the delete finished', async () => {
    const { controller, api } = setup({ load: GOT, del: { kind: 'deleted' } });
    let answer: (r: CompletionResult) => void = () => undefined;
    api.setCompletion.mockImplementation(() => new Promise<CompletionResult>((r) => (answer = r)));
    await controller.start();
    const change = controller.toggleStage(1);
    controller.openDialog('delete');
    await controller.confirmDelete();
    answer({ kind: 'save-failed' });
    await change;
    expect(controller.state.journey).toBeNull();
    expect(controller.state.changeError).toBeNull();
  });

  it('is busy while it works, ignores a second press and a Cancel', async () => {
    const { controller, api } = setup({ load: GOT, del: { kind: 'deleted' } });
    await controller.start();
    controller.openDialog('delete');
    const first = controller.confirmDelete();
    expect(controller.state.dialog?.busy).toBe(true);
    controller.cancelDialog();
    expect(controller.state.dialog).not.toBeNull();
    await Promise.all([first, controller.confirmDelete()]);
    expect(api.delete).toHaveBeenCalledTimes(1);
  });

  it('a failure keeps the journey and the dialog, with the error inside it', async () => {
    const { controller } = setup({ load: GOT, del: [{ kind: 'failed' }, { kind: 'deleted' }] });
    await controller.start();
    controller.openDialog('delete');
    await controller.confirmDelete();
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.journey).not.toBeNull();
    expect(controller.state.dialog).toEqual({
      kind: 'delete',
      busy: false,
      error: "We couldn't delete your journey. Your journey is still saved. Try again.",
    });
    await controller.confirmDelete(); // try again
    expect(controller.state.screen).toBe('home');
  });

  it('a throttle asks the learner to wait, inside the dialog', async () => {
    const { controller } = setup({ load: GOT, del: { kind: 'rate-limited' } });
    await controller.start();
    controller.openDialog('delete');
    await controller.confirmDelete();
    expect(controller.state.dialog?.error).toMatch(/Please wait/);
    expect(controller.state.journey).not.toBeNull();
  });

  it('stops at the storage message when storage is blocked', async () => {
    let ok = true;
    const { controller, api } = setup({ load: GOT });
    (controller as unknown as { deps: ControllerDeps }).deps.session = () =>
      ok ? { ok: true, sessionId: SESSION } : { ok: false };
    await controller.start();
    controller.openDialog('delete');
    ok = false;
    await controller.confirmDelete();
    expect(controller.state.screen).toBe('storage-blocked');
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('ignores a confirm for the wrong kind or with no dialog', async () => {
    const { controller, api } = setup({ load: GOT });
    await controller.start();
    await controller.confirmDelete();
    controller.confirmReplace();
    controller.openDialog('replace');
    await controller.confirmDelete();
    expect(api.delete).not.toHaveBeenCalled();
    expect(controller.state.screen).toBe('journey');
  });
});

describe('teaching style choice (BR33.1)', () => {
  const noon = () => new Date(2026, 10, 10, 12, 0, 0).getTime();

  it('starts with no style chosen and sends no request until one is', async () => {
    const { controller, api } = setup({ load: { kind: 'none' }, autoStyle: false });
    await controller.start();
    expect(controller.state.style).toBeNull();
    await controller.submit('Rust');
    expect(api.create).not.toHaveBeenCalled();
    expect(controller.state.phase).toBe('idle');
  });

  it('sends the chosen style with the topic', async () => {
    const { controller, api } = setup({ load: { kind: 'none' }, autoStyle: false });
    await controller.start();
    controller.chooseStyle('planner');
    await controller.submit('Rust');
    expect(api.create).toHaveBeenCalledWith(SESSION, 'Rust', 'planner');
  });

  it('tries again with the style that was chosen', async () => {
    const { controller, api } = setup({
      load: [{ kind: 'none' }, { kind: 'none' }],
      create: [{ kind: 'failed' }, { kind: 'failed' }],
      autoStyle: false,
    });
    await controller.start();
    controller.chooseStyle('instructor');
    await controller.submit('Rust');
    await controller.retry();
    expect(api.create).toHaveBeenLastCalledWith(SESSION, 'Rust', 'instructor');
  });

  it('keeps the choice after a failure and ignores a change while generating', async () => {
    const { controller, api } = setup({ load: { kind: 'none' }, autoStyle: false });
    let finish: (r: CreateResult) => void = () => undefined;
    api.create.mockImplementation(() => new Promise<CreateResult>((r) => (finish = r)));
    await controller.start();
    controller.chooseStyle('guide');
    const pending = controller.submit('Rust');
    controller.chooseStyle('planner');
    expect(controller.state.style).toBe('guide');
    finish({ kind: 'failed' });
    await pending;
    expect(controller.state.style).toBe('guide');
  });

  it('starts empty on every opening of the topic screen', async () => {
    const created = makeJourney({ topic: 'Go' });
    const { controller } = setup({
      load: [GOT, { kind: 'none' }],
      create: { kind: 'journey', journey: created },
      del: { kind: 'deleted' },
      autoStyle: false,
    });
    await controller.start();
    expect(controller.state.style).toBeNull(); // on a journey, nothing carried over
    controller.openDialog('replace');
    controller.confirmReplace(); // "Start a new journey"
    expect(controller.state.style).toBeNull();
    controller.chooseStyle('instructor');
    await controller.submit('Go');
    expect(controller.state.screen).toBe('journey');
    expect(controller.state.style).toBeNull(); // the style of the new journey is not kept
    controller.openDialog('replace');
    controller.confirmReplace();
    expect(controller.state.style).toBeNull(); // not preselected through "Start a new journey"
    controller.chooseStyle('planner');
    controller.goHome();
    expect(controller.state.style).toBeNull();
    controller.chooseStyle('guide');
    await controller.start(); // reopened on a page with no journey
    expect(controller.state.style).toBeNull();
  });

  it('clears the choice when a delete takes the learner to the topic screen', async () => {
    const { controller } = setup({ load: GOT, del: { kind: 'deleted' }, autoStyle: false });
    await controller.start();
    controller.openDialog('delete');
    await controller.confirmDelete();
    expect(controller.state.style).toBeNull();
  });

  it('clears the choice when the way back finds the journey gone', async () => {
    const { controller } = setup({ load: [GOT, { kind: 'none' }], autoStyle: false });
    await controller.start();
    controller.openDialog('replace');
    controller.confirmReplace();
    controller.chooseStyle('guide');
    await controller.backToJourney();
    expect(controller.state.style).toBeNull();
    expect(noon()).toBeGreaterThan(0);
  });
});

describe('the local date and the midnight refresh (BR30.2)', () => {
  it('works out the local date from the injected clock', () => {
    const { controller } = setup({ now: () => new Date(2026, 10, 10, 23, 59, 0).getTime() });
    expect(controller.state.today).toBe('2026-11-10');
  });

  it('sets a timer for the next local midnight, and again after it fires', async () => {
    let moment = new Date(2026, 10, 10, 23, 0, 0).getTime();
    const { controller, timers } = setup({ load: GOT, now: () => moment });
    await controller.start();
    const midnight = timers.find((t) => t.ms > 3_000_000 && t.ms < 3_700_000);
    expect(midnight).toBeDefined();
    moment = new Date(2026, 10, 11, 0, 0, 1).getTime();
    midnight?.fn();
    expect(controller.state.today).toBe('2026-11-11');
    expect(timers.filter((t) => !t.cleared && t.ms > 80_000_000)).toHaveLength(1);
  });

  it('works the date out again when the tab shows again', async () => {
    let moment = new Date(2026, 10, 10, 9, 0, 0).getTime();
    const { controller } = setup({ load: GOT, now: () => moment });
    await controller.start();
    const seen: string[] = [];
    controller.subscribe((s) => seen.push(s.today));
    controller.refreshToday();
    expect(seen).toEqual(['2026-11-10']); // same day: no change announced
    moment = new Date(2026, 10, 12, 9, 0, 0).getTime();
    controller.refreshToday();
    expect(controller.state.today).toBe('2026-11-12');
  });
});

describe('changing the goal date (BR31.1 to BR31.3)', () => {
  const noon = () => new Date(2026, 10, 10, 12, 0, 0).getTime();
  const withGoal = (goalDate: string | null = null) =>
    ({ kind: 'journey', journey: makeJourney({ goalDate }) }) as const;

  it('opens the form with the current date and closes it with Escape, nothing saved', async () => {
    const { controller, api } = setup({ load: withGoal('2026-12-15'), now: noon });
    await controller.start();
    controller.openGoalForm();
    expect(controller.state.goalForm).toMatchObject({ open: true, value: '2026-12-15' });
    expect(controller.state.focus).toEqual({ type: 'goal-field' });
    controller.closeGoalForm();
    expect(controller.state.goalForm.open).toBe(false);
    expect(controller.state.focus).toEqual({ type: 'goal-opener' });
    expect(api.setGoal).not.toHaveBeenCalled();
  });

  it('refuses a date out of range or not a date, keeps the form and sends nothing', async () => {
    const { controller, api } = setup({ load: withGoal(), now: noon });
    await controller.start();
    controller.openGoalForm();
    await controller.saveGoal('2026-11-09');
    expect(controller.state.goalForm.error).toBe('Choose a date from today up to 365 days ahead.');
    expect(controller.state.goalForm.open).toBe(true);
    await controller.saveGoal('soon');
    expect(controller.state.goalForm.error).toMatch(/YYYY-MM-DD/);
    expect(controller.state.focus).toEqual({ type: 'goal-field' });
    expect(api.setGoal).not.toHaveBeenCalled();
    expect(controller.state.journey?.goalDate).toBeNull();
  });

  it('changes the page at once and says "Goal date saved" only after the answer', async () => {
    const { controller, api } = setup({ load: withGoal(), now: noon });
    let answer: (r: GoalResult) => void = () => undefined;
    api.setGoal.mockImplementation(() => new Promise<GoalResult>((r) => (answer = r)));
    await controller.start();
    controller.openGoalForm();
    const pending = controller.saveGoal('2026-12-15');
    expect(controller.state.journey?.goalDate).toBe('2026-12-15'); // the header changes at once
    expect(controller.state.goalSaving).toBe(true);
    expect(controller.state.goalForm.open).toBe(false);
    expect(controller.state.announcement).toBe(''); // nothing says it was saved yet
    answer({ kind: 'saved', goalDate: '2026-12-15' });
    await pending;
    expect(api.setGoal).toHaveBeenCalledWith(SESSION, '2026-12-15');
    expect(controller.state.announcement).toBe('Goal date saved');
    expect(controller.state.goalSaving).toBe(false);
  });

  it('takes the answer as the truth', async () => {
    const { controller } = setup({
      load: withGoal(),
      goal: { kind: 'saved', goalDate: '2026-12-16' },
      now: noon,
    });
    await controller.start();
    await controller.saveGoal('2026-12-15');
    expect(controller.state.journey?.goalDate).toBe('2026-12-16');
  });

  it('clears the date at once and announces "Goal date cleared" after the answer', async () => {
    const { controller, api } = setup({
      load: withGoal('2026-12-15'),
      goal: { kind: 'saved', goalDate: null },
      now: noon,
    });
    await controller.start();
    const pending = controller.clearGoal();
    expect(controller.state.journey?.goalDate).toBeNull();
    expect(controller.state.announcement).toBe('');
    await pending;
    expect(api.setGoal).toHaveBeenCalledWith(SESSION, null);
    expect(controller.state.announcement).toBe('Goal date cleared');
  });

  it.each([
    ['save-failed', 'save-failed'],
    ['failed', 'save-failed'],
    ['rate-limited', 'rate-limited'],
  ] as const)('a %s answer puts the old value back with Try again', async (kind, expected) => {
    const { controller, api } = setup({
      load: withGoal('2026-12-01'),
      goal: [{ kind }, { kind: 'saved', goalDate: '2026-12-15' }],
      now: noon,
    });
    await controller.start();
    await controller.saveGoal('2026-12-15');
    expect(controller.state.journey?.goalDate).toBe('2026-12-01');
    expect(controller.state.goalError).toBe(expected);
    expect(controller.state.announcement).not.toMatch(/saved$/);
    await controller.retryGoal(); // Try again repeats the same change
    expect(api.setGoal).toHaveBeenCalledTimes(2);
    expect(api.setGoal).toHaveBeenLastCalledWith(SESSION, '2026-12-15');
    expect(controller.state.journey?.goalDate).toBe('2026-12-15');
    expect(controller.state.goalError).toBeNull();
  });

  it('a journey that is gone puts the old value back with no Try again', async () => {
    const { controller } = setup({
      load: withGoal('2026-12-01'),
      goal: { kind: 'not-found' },
      now: noon,
    });
    await controller.start();
    await controller.saveGoal('2026-12-15');
    expect(controller.state.journey?.goalDate).toBe('2026-12-01');
    expect(controller.state.goalError).toBe('gone');
    controller.goHome();
    expect(controller.state.screen).toBe('home');
    expect(controller.state.goalError).toBeNull();
  });

  it('an invalid request reopens the form with the old value and no Try again', async () => {
    const { controller, api } = setup({
      load: withGoal('2026-12-01'),
      goal: { kind: 'invalid-request' },
      now: noon,
    });
    await controller.start();
    await controller.saveGoal('2026-12-15');
    expect(controller.state.journey?.goalDate).toBe('2026-12-01');
    expect(controller.state.goalForm).toMatchObject({ open: true, value: '2026-12-01' });
    expect(controller.state.goalForm.error).toMatch(/could not be used/);
    expect(controller.state.goalError).toBeNull();
    await controller.retryGoal();
    expect(api.setGoal).toHaveBeenCalledTimes(1); // Try again is only for save failures
  });

  it('runs one goal change at a time', async () => {
    const { controller, api } = setup({ load: withGoal(), now: noon });
    let answer: (r: GoalResult) => void = () => undefined;
    api.setGoal.mockImplementation(() => new Promise<GoalResult>((r) => (answer = r)));
    await controller.start();
    const first = controller.saveGoal('2026-12-15');
    await controller.saveGoal('2026-12-20');
    await controller.clearGoal();
    controller.openGoalForm();
    expect(api.setGoal).toHaveBeenCalledTimes(1);
    answer({ kind: 'saved', goalDate: '2026-12-15' });
    await first;
  });

  it('ignores "Start a new journey" and "Delete my journey" while a goal change saves', async () => {
    const { controller, api } = setup({ load: withGoal(), now: noon });
    let answer: (r: GoalResult) => void = () => undefined;
    api.setGoal.mockImplementation(() => new Promise<GoalResult>((r) => (answer = r)));
    await controller.start();
    const pending = controller.saveGoal('2026-12-15');
    controller.openDialog('replace');
    controller.openDialog('delete');
    expect(controller.state.dialog).toBeNull();
    answer({ kind: 'saved', goalDate: '2026-12-15' });
    await pending;
    controller.openDialog('delete');
    expect(controller.state.dialog?.kind).toBe('delete');
  });

  it('ignores Save and Clear while a delete runs', async () => {
    const { controller, api } = setup({ load: withGoal(), del: { kind: 'failed' }, now: noon });
    let finish: (r: DeleteResult) => void = () => undefined;
    api.delete.mockImplementation(() => new Promise<DeleteResult>((r) => (finish = r)));
    await controller.start();
    controller.openDialog('delete');
    const deleting = controller.confirmDelete();
    await controller.saveGoal('2026-12-15');
    await controller.clearGoal();
    expect(api.setGoal).not.toHaveBeenCalled();
    finish({ kind: 'failed' });
    await deleting;
  });

  it('drops a late goal answer for a journey that is no longer on the page', async () => {
    const { controller, api } = setup({ load: withGoal(), del: { kind: 'deleted' }, now: noon });
    let answer: (r: GoalResult) => void = () => undefined;
    api.setGoal.mockImplementation(() => new Promise<GoalResult>((r) => (answer = r)));
    await controller.start();
    const pending = controller.saveGoal('2026-12-15');
    controller.goHome(); // the journey leaves the page by another route
    answer({ kind: 'saved', goalDate: '2026-12-15' });
    await pending;
    expect(controller.state.journey).toBeNull();
    expect(controller.state.screen).toBe('home');
    expect(controller.state.announcement).toBe('');
    expect(controller.state.goalSaving).toBe(false);
  });

  it('drops a late failed answer the same way', async () => {
    const { controller, api } = setup({ load: withGoal(), now: noon });
    let answer: (r: GoalResult) => void = () => undefined;
    api.setGoal.mockImplementation(() => new Promise<GoalResult>((r) => (answer = r)));
    await controller.start();
    const pending = controller.saveGoal('2026-12-15');
    controller.goHome();
    answer({ kind: 'save-failed' });
    await pending;
    expect(controller.state.goalError).toBeNull();
  });

  it('keeps the goal date when a stage change answers after it', async () => {
    const { controller, api } = setup({ load: withGoal(), now: noon });
    let mark: (r: CompletionResult) => void = () => undefined;
    api.setCompletion.mockImplementation(() => new Promise<CompletionResult>((r) => (mark = r)));
    api.setGoal.mockResolvedValue({ kind: 'saved', goalDate: '2026-12-15' });
    await controller.start();
    const stage = controller.toggleStage(1);
    await controller.saveGoal('2026-12-15'); // a goal change may overlap a stage mark
    mark({ kind: 'completed', completedStages: [1] });
    await stage;
    expect(controller.state.journey?.goalDate).toBe('2026-12-15');
    expect(controller.state.journey?.completedStages).toEqual([1]);
  });

  it('stops at the storage message when storage is blocked', async () => {
    let ok = true;
    const { controller, api } = setup({ load: withGoal(), now: noon });
    (controller as unknown as { deps: ControllerDeps }).deps.session = () =>
      ok ? { ok: true, sessionId: SESSION } : { ok: false };
    await controller.start();
    ok = false;
    await controller.saveGoal('2026-12-15');
    expect(controller.state.screen).toBe('storage-blocked');
    expect(api.setGoal).not.toHaveBeenCalled();
  });

  it('ignores goal presses with no journey or nothing to retry', async () => {
    const { controller, api } = setup({ load: { kind: 'none' }, now: noon });
    await controller.start();
    controller.openGoalForm();
    controller.closeGoalForm();
    await controller.saveGoal('2026-12-15');
    await controller.clearGoal();
    await controller.retryGoal();
    expect(api.setGoal).not.toHaveBeenCalled();
    expect(controller.state.goalForm.open).toBe(false);
  });
});

// --- U5: milestones, the completion view and the nudge ---------------------------------------

const NOON = new Date(2026, 10, 10, 12, 0, 0).getTime(); // 10 November 2026, local
const saved = (...names: Milestone[]): MilestoneResult => ({
  kind: 'saved',
  milestonesShown: names,
});
const marked = (list: number[]): CompletionResult => ({ kind: 'completed', completedStages: list });

describe('a milestone after a confirmed mark (BR40.1 to BR40.3)', () => {
  it('shows the first-stage banner after the first mark and records it', async () => {
    const { controller, api } = await open({
      set: marked([1]),
      milestone: saved('first-stage'),
    });
    await controller.toggleStage(1);
    expect(controller.state.banner).toMatchObject({ kind: 'milestone', milestone: 'first-stage' });
    expect(api.recordMilestone).toHaveBeenCalledTimes(1);
    expect(api.recordMilestone).toHaveBeenCalledWith(SESSION, 'first-stage');
  });

  it('shows no banner on a plain load, even for a journey with stages done', async () => {
    const { controller, api } = await open({}, [1, 2, 3]);
    expect(controller.state.banner).toBeNull();
    expect(api.recordMilestone).not.toHaveBeenCalled();
  });

  it('shows no banner and makes no call after an unmark', async () => {
    const journey = makeJourney({
      completedStages: [1, 2, 3],
      milestonesShown: [],
    });
    const made = setup({ load: { kind: 'journey', journey }, set: marked([1, 2]) });
    await made.controller.start();
    await made.controller.toggleStage(3);
    expect(made.controller.state.banner).toBeNull();
    expect(made.api.recordMilestone).not.toHaveBeenCalled();
  });

  it('shows no banner and makes no call when the mark fails', async () => {
    const { controller, api } = await open({ set: { kind: 'save-failed' } });
    await controller.toggleStage(1);
    expect(controller.state.banner).toBeNull();
    expect(api.recordMilestone).not.toHaveBeenCalled();
  });

  it('shows only the highest newly reached one and records the lower ones quietly, in order', async () => {
    const { controller, api } = await open(
      {
        set: marked([1, 2, 3]),
        milestone: [saved('first-stage'), saved('first-stage', 'halfway')],
      },
      [1, 2],
    );
    await controller.toggleStage(3);
    expect(controller.state.banner).toMatchObject({ milestone: 'halfway' });
    expect(api.recordMilestone.mock.calls.map(([, name]) => name)).toEqual([
      'first-stage',
      'halfway',
    ]);
  });

  it('shows only the complete banner when the last stage is marked with the others never shown', async () => {
    const { controller, api } = await open({ set: marked([1, 2, 3, 4, 5]) }, [1, 2, 3, 4]);
    await controller.toggleStage(5);
    expect(controller.state.banner).toMatchObject({ milestone: 'complete' });
    expect(api.recordMilestone.mock.calls.map(([, name]) => name)).toEqual([
      'first-stage',
      'halfway',
      'complete',
    ]);
  });

  it('counts what the loaded journey already shows, so nothing repeats', async () => {
    const journey = makeJourney({ completedStages: [1, 2], milestonesShown: ['halfway'] });
    const made = setup({ load: { kind: 'journey', journey }, set: marked([1, 2, 3]) });
    await made.controller.start();
    await made.controller.toggleStage(3);
    expect(made.controller.state.banner).toBeNull(); // first-stage is lower than halfway
    expect(made.api.recordMilestone).not.toHaveBeenCalled();
  });

  it('never shows a banner twice: dismiss, unmark and mark the stage again', async () => {
    const { controller } = await open(
      { set: [marked([1]), marked([]), marked([1])], milestone: saved('first-stage') },
      [],
    );
    await controller.toggleStage(1);
    controller.dismissBanner();
    expect(controller.state.banner).toBeNull();
    await controller.toggleStage(1);
    await controller.toggleStage(1);
    expect(controller.state.banner).toBeNull();
  });

  it('shows each banner once with two quick marks while the first recording runs', async () => {
    let finish: (r: MilestoneResult) => void = () => undefined;
    const made = await open({ set: [marked([1]), marked([1, 2])] });
    made.api.recordMilestone.mockImplementationOnce(
      () => new Promise<MilestoneResult>((resolve) => (finish = resolve)),
    );
    const first = made.controller.toggleStage(1);
    await vi.waitFor(() => expect(made.api.recordMilestone).toHaveBeenCalledTimes(1));
    expect(made.controller.state.banner).toMatchObject({ milestone: 'first-stage' });
    await made.controller.toggleStage(2);
    expect(made.controller.state.banner).toMatchObject({ milestone: 'first-stage' });
    expect(made.api.recordMilestone).toHaveBeenCalledTimes(1);
    finish(saved('first-stage'));
    await first;
  });

  it('keeps the banner and says nothing when the recording fails, whatever the failure', async () => {
    for (const kind of ['not-found', 'invalid-request', 'save-failed', 'rate-limited', 'failed']) {
      const { controller } = await open({
        set: marked([1]),
        milestone: { kind } as MilestoneResult,
      });
      const announcements: string[] = [];
      controller.subscribe((state) => announcements.push(state.announcement));
      await controller.toggleStage(1);
      expect(controller.state.banner).toMatchObject({ milestone: 'first-stage' });
      expect(controller.state.changeError).toBeNull();
      expect(announcements.every((text) => !/milestone|banner/i.test(text))).toBe(true);
    }
  });

  it('never brings the banner back in the same visit after a failed recording', async () => {
    const { controller } = await open({
      set: [marked([1]), marked([1, 2])],
      milestone: { kind: 'save-failed' },
    });
    await controller.toggleStage(1);
    controller.dismissBanner();
    await controller.toggleStage(2);
    expect(controller.state.banner).toBeNull();
  });

  it('gives a replacement journey its own banners', async () => {
    const replacement = makeJourney({ topic: 'Go' });
    const { controller } = await open(
      { set: [marked([1]), marked([1])], create: { kind: 'journey', journey: replacement } },
      [],
    );
    await controller.toggleStage(1);
    expect(controller.state.banner).toMatchObject({ milestone: 'first-stage' });
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.submit('Go');
    expect(controller.state.banner).toBeNull();
    await controller.toggleStage(1);
    expect(controller.state.banner).toMatchObject({ milestone: 'first-stage' });
  });

  it('drops a late answer for a journey that is no longer on the page', async () => {
    let finish: (r: MilestoneResult) => void = () => undefined;
    const replacement = makeJourney({ topic: 'Go' });
    const made = await open({
      set: [marked([1]), marked([1])],
      create: { kind: 'journey', journey: replacement },
    });
    made.api.recordMilestone.mockImplementationOnce(
      () => new Promise<MilestoneResult>((resolve) => (finish = resolve)),
    );
    const pending = made.controller.toggleStage(1);
    await vi.waitFor(() => expect(made.api.recordMilestone).toHaveBeenCalledTimes(1));
    made.controller.openDialog('replace');
    made.controller.confirmReplace();
    await made.controller.submit('Go');
    finish(saved('first-stage', 'halfway', 'complete')); // late: must not fill the new set
    await pending;
    await made.controller.toggleStage(1);
    expect(made.controller.state.banner).toMatchObject({ milestone: 'first-stage' });
  });

  it('empties the banner and the shown set when the journey is deleted', async () => {
    const { controller } = await open({ set: marked([1]), del: { kind: 'deleted' } });
    await controller.toggleStage(1);
    controller.openDialog('delete');
    await controller.confirmDelete();
    expect(controller.state.banner).toBeNull();
    expect(controller.state.view).toBe('journey');
  });
});

describe('the completion view (BR41.1)', () => {
  it('is the view on load when every stage is done, and the journey view otherwise', async () => {
    expect((await open({}, FIVE)).controller.state.view).toBe('completion');
    expect((await open({}, [1, 2])).controller.state.view).toBe('journey');
  });

  it('shows the completion view and the complete banner when the last mark is confirmed', async () => {
    const { controller } = await open({ set: marked(FIVE) }, [1, 2, 3, 4]);
    await controller.toggleStage(5);
    expect(controller.state.view).toBe('completion');
    expect(controller.state.focus).toEqual({ type: 'complete-heading' });
    expect(controller.state.banner).toMatchObject({ milestone: 'complete' });
  });

  it('keeps the journey view while the last mark is not yet confirmed', async () => {
    let finish: (r: CompletionResult) => void = () => undefined;
    const made = await open({}, [1, 2, 3, 4]);
    made.api.setCompletion.mockImplementationOnce(
      () => new Promise<CompletionResult>((resolve) => (finish = resolve)),
    );
    const pending = made.controller.toggleStage(5);
    expect(made.controller.state.view).toBe('journey');
    finish(marked(FIVE));
    await pending;
    expect(made.controller.state.view).toBe('completion');
  });

  it('goes back to the journey view at 100% with no panel open and focus on the heading', async () => {
    const { controller } = await open({}, FIVE);
    const seq = controller.state.focusSeq;
    controller.showJourneyView();
    expect(controller.state.view).toBe('journey');
    expect(controller.state.open).toBeNull();
    expect(controller.state.focus).toEqual({ type: 'title' });
    expect(controller.state.focusSeq).toBe(seq + 1);
    expect(controller.state.journey?.completedStages).toEqual(FIVE);
  });

  it('ignores Back to my journey when the completion view is not showing', async () => {
    const { controller } = await open({}, [1]);
    const before = controller.state;
    controller.showJourneyView();
    expect(controller.state).toBe(before);
  });

  it('returns to the journey view on an unmark and to the completion view on the mark, with no second complete banner', async () => {
    const journey = makeJourney({
      completedStages: FIVE,
      milestonesShown: ['first-stage', 'halfway', 'complete'],
    });
    const made = setup({
      load: { kind: 'journey', journey },
      set: [marked([1, 2, 3, 4]), marked(FIVE)],
    });
    await made.controller.start();
    made.controller.showJourneyView();
    await made.controller.toggleStage(5);
    expect(made.controller.state.view).toBe('journey');
    expect(made.controller.state.banner).toBeNull();
    expect(made.controller.state.announcement).toContain('4 of 5 stages complete, 80 percent');
    await made.controller.toggleStage(5);
    expect(made.controller.state.view).toBe('completion');
    expect(made.controller.state.banner).toBeNull();
  });

  it('resets the view for a new journey', async () => {
    const replacement = makeJourney({ topic: 'Go' });
    const { controller } = await open({ create: { kind: 'journey', journey: replacement } }, FIVE);
    controller.openDialog('replace');
    controller.confirmReplace();
    await controller.submit('Go');
    expect(controller.state.view).toBe('journey');
  });
});

describe('the nudge (BR42, BR43.2)', () => {
  const GOAL_IN_TWO_DAYS = '2026-11-12';
  const nudgeJourney = (completed: number[] = [1], shown: string[] = ['first-stage']) =>
    makeJourney({ completedStages: completed, goalDate: GOAL_IN_TWO_DAYS, milestonesShown: shown });

  async function openNudge(
    options: Partial<Parameters<typeof setup>[0]> = {},
    journey = nudgeJourney(),
  ) {
    const made = setup({ now: () => NOON, load: { kind: 'journey', journey }, ...options });
    await made.controller.start();
    return made;
  }

  it('shows the nudge on load when its conditions hold, naming the next stage', async () => {
    const { controller } = await openNudge({ nudgeStorage: () => null });
    expect(controller.state.banner).toEqual({
      kind: 'nudge',
      text: nudgeMessage(2, 2, 4),
    });
  });

  it('shows none when the conditions do not hold', async () => {
    const noGoal = await openNudge({}, makeJourney({ completedStages: [1] }));
    expect(noGoal.controller.state.banner).toBeNull();
    const half = await openNudge({}, nudgeJourney([1, 2, 3]));
    expect(half.controller.state.banner).toBeNull();
    const far = await openNudge({}, makeJourney({ completedStages: [1], goalDate: '2026-11-20' }));
    expect(far.controller.state.banner).toBeNull();
  });

  it('moves focus to the page heading when a banner is dismissed', async () => {
    const { controller } = await openNudge();
    const before = controller.state.focusSeq;
    controller.dismissBanner();
    expect(controller.state.focus).toEqual({ type: 'title' });
    expect(controller.state.focusSeq).toBe(before + 1);
  });

  it('removes the nudge at once on dismiss and remembers it in the browser for today', async () => {
    const { storage, data } = fakeStorage();
    const { controller, api } = await openNudge({ nudgeStorage: () => storage });
    const calls = api.load.mock.calls.length + api.setCompletion.mock.calls.length;
    controller.dismissBanner();
    expect(controller.state.banner).toBeNull();
    expect([...data.keys()]).toEqual([dismissalKey(GOAL_IN_TWO_DAYS, '2026-11-10')]);
    // No request is made for showing or dismissing a nudge (BR42.4).
    expect(api.load.mock.calls.length + api.setCompletion.mock.calls.length).toBe(calls);
    expect(api.recordMilestone).not.toHaveBeenCalled();
    expect(api.setGoal).not.toHaveBeenCalled();
  });

  it('does not return on a reload the same day', async () => {
    const { storage } = fakeStorage();
    const first = await openNudge({ nudgeStorage: () => storage });
    first.controller.dismissBanner();
    const reloaded = await openNudge({ nudgeStorage: () => storage });
    expect(reloaded.controller.state.banner).toBeNull();
  });

  it('returns the next day and for a changed goal date', async () => {
    const { storage } = fakeStorage();
    const first = await openNudge({ nudgeStorage: () => storage });
    first.controller.dismissBanner();
    const tomorrow = new Date(2026, 10, 11, 12).getTime();
    const next = await openNudge({ nudgeStorage: () => storage, now: () => tomorrow });
    expect(next.controller.state.banner?.kind).toBe('nudge');
    const changed = await openNudge(
      { nudgeStorage: () => storage },
      makeJourney({
        completedStages: [1],
        goalDate: '2026-11-13',
        milestonesShown: ['first-stage'],
      }),
    );
    expect(changed.controller.state.banner?.kind).toBe('nudge');
  });

  it('falls back to page memory when storage is blocked', async () => {
    const made = await openNudge({ nudgeStorage: () => blockedNudgeStorage() });
    expect(made.controller.state.banner?.kind).toBe('nudge');
    made.controller.dismissBanner();
    expect(made.controller.state.banner).toBeNull();
    made.controller.refreshToday();
    made.controller.openPanel(3); // any later change keeps the dismissal for the page's life
    expect(made.controller.state.banner).toBeNull();
  });

  it('is evaluated again when a stage changes or the goal changes', async () => {
    const made = await openNudge(
      { set: marked([1, 2, 3]), goal: { kind: 'saved', goalDate: '2026-11-20' } },
      nudgeJourney([1], ['first-stage', 'halfway']),
    );
    expect(made.controller.state.banner?.kind).toBe('nudge');
    await made.controller.toggleStage(2); // 3 of 5 is 60%: no nudge
    expect(made.controller.state.banner).toBeNull();
    const again = await openNudge({ goal: { kind: 'saved', goalDate: '2026-11-20' } });
    expect(again.controller.state.banner?.kind).toBe('nudge');
    await again.controller.saveGoal('2026-11-20'); // 10 days away: no nudge
    expect(again.controller.state.banner).toBeNull();
  });

  it('is evaluated again at the next local midnight', async () => {
    let now = new Date(2026, 10, 8, 23, 59, 0).getTime(); // goal in 4 days: no nudge
    const made = setup({
      now: () => now,
      load: { kind: 'journey', journey: nudgeJourney() },
    });
    await made.controller.start();
    expect(made.controller.state.banner).toBeNull();
    now = new Date(2026, 10, 9, 0, 0, 5).getTime(); // goal in 3 days
    made.timers.at(-1)?.fn();
    expect(made.controller.state.banner?.kind).toBe('nudge');
  });

  it('waits behind a milestone banner and returns after it is dismissed', async () => {
    const made = await openNudge(
      { set: marked([1]), milestone: saved('first-stage') },
      nudgeJourney([], []),
    );
    expect(made.controller.state.banner?.kind).toBe('nudge');
    await made.controller.toggleStage(1);
    expect(made.controller.state.banner).toMatchObject({ kind: 'milestone' });
    made.controller.dismissBanner();
    expect(made.controller.state.banner?.kind).toBe('nudge');
    made.controller.dismissBanner();
    expect(made.controller.state.banner).toBeNull();
  });

  it('does nothing when there is no banner to dismiss', async () => {
    const { controller } = await open({});
    const before = controller.state;
    controller.dismissBanner();
    expect(controller.state).toBe(before);
  });

  it('removes every dismissal marker when the journey is deleted', async () => {
    const { storage, data } = fakeStorage();
    const made = await openNudge({ nudgeStorage: () => storage, del: { kind: 'deleted' } });
    made.controller.dismissBanner();
    expect(data.size).toBe(1);
    made.controller.openDialog('delete');
    await made.controller.confirmDelete();
    expect(data.size).toBe(0);
  });

  it('removes every dismissal marker when the journey is replaced', async () => {
    const { storage, data } = fakeStorage();
    const replacement = makeJourney({ topic: 'Go' });
    const made = await openNudge({
      nudgeStorage: () => storage,
      create: { kind: 'journey', journey: replacement },
    });
    made.controller.dismissBanner();
    expect(data.size).toBe(1);
    made.controller.openDialog('replace');
    made.controller.confirmReplace();
    expect(data.size).toBe(1); // the old journey is still saved until the new one arrives
    await made.controller.submit('Go');
    expect(data.size).toBe(0);
  });

  it('removes the markers when the journey turns out to be gone', async () => {
    const { storage, data } = fakeStorage();
    const made = await openNudge({ nudgeStorage: () => storage });
    made.controller.dismissBanner();
    made.controller.goHome();
    expect(data.size).toBe(0);
  });
});
