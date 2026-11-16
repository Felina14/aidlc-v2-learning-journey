import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { STATE_CASES, q } from './a11y-states';

const text = (id: string) => q(id).textContent ?? '';
const openStages = () =>
  [...document.querySelectorAll('[data-testid^="stage-toggle-"]')]
    .map((el, i) => (el.getAttribute('aria-expanded') === 'true' ? i + 1 : 0))
    .filter(Boolean);
const panelShown = (n: number) => !q(`stage-panel-${n}`).hidden;
const journeyShown = () => !q('journey-screen').hidden;
const homeShown = () => !q('home-screen').hidden;

/**
 * Each state really is on screen when axe looks at it (so a quiet axe run is not a blank page).
 * Every state has its own check; a state with none fails the "every state has a check" test.
 */
const REACHED: Record<string, (() => boolean) | undefined> = {
  'S1 home: empty': () =>
    homeShown() &&
    (q('topic-input') as HTMLInputElement).value === '' &&
    !(['style-guide', 'style-instructor', 'style-planner'] as const).some(
      (id) => (q(id) as HTMLInputElement).checked,
    ) &&
    q('topic-error').hidden === true,
  'S1 home: topic error shown': () => !q('topic-error').hidden,
  'S1 home: style chosen': () =>
    homeShown() &&
    (q('style-planner') as HTMLInputElement).checked &&
    !(q('style-guide') as HTMLInputElement).checked &&
    (q('topic-input') as HTMLInputElement).value === 'Rust' &&
    q('topic-error').hidden === true,
  'S1 home: generating, before the 5-second reassurance': () =>
    !q('status-line').hidden && !/longer/.test(text('status-line')),
  'S1 home: generating, after the 5-second reassurance': () => /longer/.test(text('status-line')),
  'S1 home: daily-limit message': () => !q('limit-message').hidden,
  'S1 home: generation failed': () => !q('phase-message').hidden,
  'S1 home: replacing, with Back to my journey': () => !q('back-button').hidden,
  loading: () => !q('loading-screen').hidden,
  'load error': () => !q('message-screen').hidden,
  'S2 journey: first stage up next, open': () =>
    journeyShown() &&
    openStages().join() === '1' &&
    panelShown(1) &&
    text('stage-status-1') === 'Up next',
  'S2 journey: all panels closed': () =>
    journeyShown() &&
    openStages().length === 0 &&
    [...document.querySelectorAll('[data-testid^="stage-panel-"]')].every(
      (el) => (el as HTMLElement).hidden,
    ),
  'S2 journey: to-do stage open': () =>
    openStages().join() === '4' && panelShown(4) && text('stage-status-4') === 'To do',
  'S2 journey: done stage open': () =>
    openStages().join() === '1' && panelShown(1) && text('stage-status-1') === 'Done',
  'S2 journey: stage marked': () =>
    text('stage-status-1') === 'Done' &&
    text('progress-count').startsWith('1 of') &&
    q('complete-button-1').textContent === 'Mark stage 1 as not complete',
  'S2 journey: stage unmarked': () =>
    text('stage-status-1') === 'Up next' &&
    text('progress-count').startsWith('0 of') &&
    q('complete-button-1').textContent === 'Mark stage 1 complete',
  'S2 journey: save error on a stage ("not saved")': () =>
    !!document.querySelector('[data-testid="change-error-1"]') &&
    /couldn't save that change/i.test(text('change-error-1')) &&
    !/no longer saved/i.test(text('change-error-1')),
  'S2 journey: save error on a stage ("no longer saved")': () =>
    !!document.querySelector('[data-testid="change-error-1"]') &&
    /no longer saved/i.test(text('change-error-1')),
  'S2 journey: goal upcoming': () => /\d+ days? left/.test(text('goal-text')),
  'S2 journey: goal due today': () => /today/i.test(text('goal-text')),
  'S2 journey: goal passed': () => /Goal date passed/.test(text('goal-text')),
  'S2 journey: goal form open': () =>
    !q('goal-form').hidden &&
    q('goal-button').getAttribute('aria-expanded') === 'true' &&
    q('goal-field-error').hidden === true,
  'S2 journey: goal form open with an error': () =>
    !q('goal-form').hidden && !q('goal-field-error').hidden,
  'S2 journey: goal save error': () => !q('goal-error').hidden,
  'S2 journey: header details closed': () =>
    journeyShown() && (q('header-details') as HTMLDetailsElement).open === false,
  'S3 banner: first-stage milestone': () => q('banner').getAttribute('data-kind') === 'milestone',
  'S3 banner: halfway milestone': () =>
    q('banner').getAttribute('data-kind') === 'milestone' && /halfway/.test(text('banner-text')),
  'S3 banner: nudge, due today': () => q('banner').getAttribute('data-kind') === 'nudge',
  'S3 banner: nudge, three days left': () => q('banner').getAttribute('data-kind') === 'nudge',
  // The driver throws unless a nudge banner was on screen just before Dismiss was pressed.
  'S3 banner: dismissed': () => q('banner').hidden === true,
  'S4 dialog: delete confirmation': () =>
    q('confirm-dialog').hasAttribute('open') && text('confirm-title') === 'Delete your journey?',
  'S4 dialog: delete confirmation with an error': () =>
    q('confirm-dialog').hasAttribute('open') &&
    text('confirm-title') === 'Delete your journey?' &&
    !q('confirm-error').hidden,
  'S4 dialog: replace confirmation': () =>
    q('confirm-dialog').hasAttribute('open') && text('confirm-title') === 'Start a new journey?',
  'S5 completion: without a name': () =>
    !q('certificate-section').hidden && text('certificate-name') !== 'Alex Example',
  'S5 completion: with a name': () => text('certificate-name') === 'Alex Example',
  'S5 completion: Back to my journey view': () =>
    q('certificate-section').hidden === true &&
    !q('stage-list').hidden &&
    text('progress-percent') === '100%',
};

describe('every state has its own reached-check', () => {
  it('has a check for each state and a state for each check', () => {
    expect(Object.keys(REACHED).sort()).toEqual(STATE_CASES.map((c) => c.name).sort());
  });
});

describe.each(STATE_CASES)('state is reached: $name', ({ name, run }) => {
  it('is on screen', async () => {
    await run();
    const check = REACHED[name];
    expect(check, `no reached-check for "${name}"`).toBeTypeOf('function');
    expect(check?.()).toBe(true);
  });
});

/** Rules that need real layout: covered by contrast.test.ts and the manual Lighthouse run. */
const LAYOUT_RULES = ['color-contrast', 'target-size'];
const MUST_FIX = ['critical', 'serious', 'moderate'];

describe.each(STATE_CASES)('axe: $name', ({ name, run }) => {
  it('has no critical, serious or moderate violation', async () => {
    await run();
    const result = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
      rules: Object.fromEntries(LAYOUT_RULES.map((id) => [id, { enabled: false }])),
    });
    const found = result.violations
      .filter((v) => MUST_FIX.includes(v.impact ?? ''))
      .map(
        (v) =>
          `[${name}] ${v.id} (${v.impact}): ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 4)
            .join(' | ')}`,
      );
    expect(found).toEqual([]);
  });
});

describe('axe runs under jsdom and vitest (plan step 2)', () => {
  it('reports an unlabelled input in a test-local fragment as a violation', async () => {
    document.documentElement.lang = 'en';
    document.title = 'Fragment';
    document.body.innerHTML = '<main><h1>Fragment</h1><input type="text" id="bare" /></main>';
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      rules: Object.fromEntries(LAYOUT_RULES.map((id) => [id, { enabled: false }])),
    });
    const ids = result.violations.map((v) => v.id);
    expect(ids).toContain('label');
    expect(result.violations.find((v) => v.id === 'label')?.impact).toBe('critical');
  });

  it('reports nothing for the same fragment once the input has a label', async () => {
    document.body.innerHTML =
      '<main><h1>Fragment</h1><label for="ok">Name</label><input type="text" id="ok" /></main>';
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      rules: Object.fromEntries(LAYOUT_RULES.map((id) => [id, { enabled: false }])),
    });
    expect(result.violations).toEqual([]);
  });
});
