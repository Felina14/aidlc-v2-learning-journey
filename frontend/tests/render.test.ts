import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { MILESTONE_MESSAGES, MILESTONE_ORDER } from '../src/milestones';
import { nudgeMessage } from '../src/nudge';
import {
  LABEL_AI,
  LABEL_TEMPLATE,
  TEXT,
  applyFocus,
  findElements,
  formatHours,
  renderBanner,
  renderJourney,
  renderState,
  type JourneyHandlers,
} from '../src/render';
import type { AppState, BannerState, ChangeError } from '../src/state';
import type { Journey } from '../src/types';
import { findBlocked } from './blocked-words';
import { loadPage, makeJourney, makeStage } from './helpers';

const base: AppState = {
  screen: 'home',
  phase: 'idle',
  slow: false,
  topicError: null,
  journey: null,
  announcement: '',
  saving: null,
  changeError: null,
  open: null,
  focus: { type: 'none' },
  focusSeq: 0,
  dialog: null,
  replacing: false,
  note: null,
  backBusy: false,
  backError: null,
  style: 'guide',
  today: '2026-11-10',
  goalForm: { open: false, value: '', seq: 0, error: null },
  goalSaving: false,
  goalError: null,
  view: 'journey',
  banner: null,
};

beforeEach(() => loadPage());

const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

/** Draw a journey; the panel handler redraws like the page does. */
function draw(journey: Journey, extra: Partial<AppState> = {}) {
  const els = findElements(document);
  const calls: string[] = [];
  let state: AppState = { ...base, screen: 'journey', journey, open: 1, ...extra };
  const handlers: JourneyHandlers = {
    openPanel: (stage) => {
      state = { ...state, open: stage };
      renderJourney(document, els, state, handlers);
    },
    toggleStage: (stage) => calls.push(`toggle ${stage}`),
    retryChange: () => calls.push('retry'),
    goHome: () => calls.push('home'),
    reload: () => calls.push('reload'),
  };
  els.journey.hidden = false; // focus only works on a visible section
  renderJourney(document, els, state, handlers);
  return { els, calls };
}

describe('journey drawing', () => {
  it('shows the AI label for an AI journey and not the template label', () => {
    const { els } = draw(makeJourney({ source: 'ai' }));
    expect(els.sourceLabel.textContent).toBe(LABEL_AI);
    expect(document.body.textContent).not.toContain(LABEL_TEMPLATE);
  });

  it('shows the template label for a template journey and not the AI label', () => {
    const { els } = draw(makeJourney({ source: 'template' }));
    expect(els.sourceLabel.textContent).toBe(LABEL_TEMPLATE);
    expect(els.sourceLabel.textContent).not.toContain('AI-generated');
  });

  it('shows the topic, every stage in order, and the hours', () => {
    const { els } = draw(makeJourney());
    expect(els.title.textContent).toBe('Your Rust journey');
    expect(els.total.textContent).toBe('5 stages · about 15 hours in total');
    const titles = [...els.stageList.querySelectorAll('.stage__title')].map((e) => e.textContent);
    expect(titles).toEqual([1, 2, 3, 4, 5].map((n) => `Stage ${n} title`));
    expect(formatHours(1)).toBe('About 1 hour');
    expect(formatHours(2.5)).toBe('About 2.5 hours');
  });

  it('shows hostile text as text, never as markup', () => {
    const hostile = '<img src=x onerror="window.pwned=1"><script>window.pwned=1</script>';
    const { els } = draw(
      makeJourney({
        topic: hostile,
        stages: [1, 2, 3, 4, 5].map((n) =>
          makeStage(n, { title: hostile, whatItIs: hostile, afterThis: hostile }),
        ),
      }),
    );
    expect(els.title.textContent).toContain(hostile);
    expect(els.stageList.querySelectorAll('img, script')).toHaveLength(0);
    expect(document.querySelectorAll('img, script')).toHaveLength(0);
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
    expect(els.stageList.textContent).toContain(hostile);
  });

  it('opens only the chosen stage and one at a time', () => {
    const { els } = draw(makeJourney());
    const toggle = (n: number) => q(`stage-toggle-${n}`);
    const open = () => [...els.stageList.querySelectorAll('[aria-expanded="true"]')].length;
    expect(toggle(1).getAttribute('aria-expanded')).toBe('true');
    toggle(3).click();
    expect(toggle(1).getAttribute('aria-expanded')).toBe('false');
    expect(toggle(3).getAttribute('aria-expanded')).toBe('true');
    expect(open()).toBe(1);
    toggle(3).click();
    expect(open()).toBe(0);
  });

  it('shows all stage details when a stage is open', () => {
    draw(makeJourney());
    const panel = q('stage-panel-1');
    expect(panel.hidden).toBe(false);
    for (const text of [
      'What 1 is',
      'Why 1 matters',
      'After 1',
      'Read 1',
      'Do 1',
      'Build 1',
      'Quiz 1',
    ]) {
      expect(panel.textContent).toContain(text);
    }
    expect(panel.textContent).toContain('About 3 hours');
  });

  it('offers the goal, new-journey and delete controls and no style radios in the journey', () => {
    const { els } = draw(makeJourney());
    expect(els.goalButton.textContent).toBe('Set a goal date');
    expect(els.startNew.textContent?.trim()).toBe('Start a new journey');
    expect(els.deleteMine.textContent?.trim()).toBe('Delete my journey');
    expect(els.journey.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    // Five stage toggles, five mark buttons, the goal opener, Try again, home, Save, Clear,
    // then Start a new journey and Delete my journey, plus the banner's Dismiss and the
    // certificate's Print and Back buttons (hidden until they are needed).
    expect(els.journey.querySelectorAll('button')).toHaveLength(20);
  });

  it('gives every interactive element a data-testid', () => {
    draw(makeJourney(), { changeError: { stage: 1, kind: 'save-failed' } });
    for (const control of document.querySelectorAll('button, input, a')) {
      expect(control.getAttribute('data-testid'), control.outerHTML).toBeTruthy();
    }
  });
});

describe('header, ladder and buttons (BR10, BR13)', () => {
  it('writes the figures for none done: 0%, 0 of 5, bar named Journey progress', () => {
    const { els } = draw(makeJourney());
    expect(els.progressBar.value).toBe(0);
    expect(els.progressBar.getAttribute('aria-label')).toBe('Journey progress');
    expect(els.progressPercent.textContent).toBe('0%');
    expect(els.progressCount.textContent).toBe('0 of 5 complete');
  });

  it('rounds for six stages: one done reads 17%, five done reads 83%', () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => makeStage(n));
    const one = draw(makeJourney({ stages: six, completedStages: [1] }), { open: 2 });
    expect(one.els.progressPercent.textContent).toBe('17%');
    expect(one.els.progressCount.textContent).toBe('1 of 6 complete');
    const five = draw(makeJourney({ stages: six, completedStages: [1, 2, 3, 4, 5] }), { open: 6 });
    expect(five.els.progressPercent.textContent).toBe('83%');
    expect(five.els.progressBar.value).toBe(83);
  });

  it('shows Done, Up next and To do in words on every stage', () => {
    draw(makeJourney({ completedStages: [1, 2] }), { open: 3 });
    const words = [1, 2, 3, 4, 5].map((n) => q(`stage-status-${n}`).textContent);
    expect(words).toEqual(['Done', 'Done', 'Up next', 'To do', 'To do']);
  });

  it('writes whole or one-decimal hours in the total and on each stage', () => {
    const stages = [2, 3, 3, 4, 4].map((hours, i) => makeStage(i + 1, { hours }));
    const { els } = draw(makeJourney({ stages }));
    expect(els.total.textContent).toBe('5 stages · about 16 hours in total');
    const fraction = [2.5, 3.25, 3, 4, 4].map((hours, i) => makeStage(i + 1, { hours }));
    const second = draw(makeJourney({ stages: fraction }));
    expect(second.els.total.textContent).toBe('5 stages · about 16.8 hours in total');
    expect(q('stage-toggle-2').textContent).toContain('About 3.3 hours');
  });

  it('labels the button by state and reports a press', () => {
    const { calls } = draw(makeJourney({ completedStages: [1] }), { open: 1 });
    expect(q('complete-button-1').textContent).toBe('Mark stage 1 as not complete');
    expect(q('complete-button-2').textContent).toBe('Mark stage 2 complete');
    q('complete-button-2').click();
    expect(calls).toEqual(['toggle 2']);
  });

  it('shows the busy state without changing the label and marks every button not pressable', () => {
    draw(makeJourney(), { saving: 1 });
    expect(q('complete-button-1').getAttribute('aria-busy')).toBe('true');
    expect(q('complete-button-1').textContent).toBe('Mark stage 1 complete');
    expect(q('complete-button-2').getAttribute('aria-disabled')).toBe('true');
    expect(q('complete-button-2').getAttribute('aria-busy')).toBeNull();
  });

  it('shows each change error in the pressed stage with its own button and warning sign', () => {
    const cases: [ChangeError['kind'], string, string][] = [
      ['save-failed', "We couldn't save that change. Try again.", 'change-retry-1'],
      ['rate-limited', 'Please wait a moment', 'change-retry-1'],
      ['gone', 'no longer saved', 'change-home-1'],
      ['changed', 'journey has changed', 'change-reload-1'],
    ];
    for (const [kind, text, buttonId] of cases) {
      loadPage();
      const { calls } = draw(makeJourney(), { changeError: { stage: 1, kind } });
      expect(q('change-error-1').textContent).toMatch(/^⚠ /);
      expect(q('change-error-1').textContent).toContain(text);
      expect(document.querySelectorAll('[data-testid^="change-"][data-testid$="-1"]')).toHaveLength(
        2,
      );
      q(buttonId).click();
      expect(calls).toHaveLength(1);
      expect(q('stage-panel-2').querySelector('[data-testid^="change-"]')).toBeNull();
    }
  });

  it('shows the Journey complete heading when every stage is done, with no panel open', () => {
    const { els } = draw(makeJourney({ completedStages: [1, 2, 3, 4, 5] }), {
      open: null,
      view: 'completion',
    });
    expect(els.title.textContent).toBe('Journey complete');
    expect(els.subtitle.hidden).toBe(false);
    expect(els.subtitle.textContent).toBe('Your Rust journey');
    expect(els.progressPercent.textContent).toBe('100%');
    expect(els.stageList.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0);
  });

  it('moves focus where asked and keeps focus on a control across a redraw', () => {
    const { els } = draw(makeJourney({ completedStages: [1] }), { open: 2 });
    applyFocus(document, els, { type: 'heading', stage: 2 });
    expect(document.activeElement).toBe(q('stage-heading-2'));
    applyFocus(document, els, { type: 'button', stage: 2 });
    expect(document.activeElement).toBe(q('complete-button-2'));
    applyFocus(document, els, { type: 'title' });
    expect(document.activeElement).toBe(els.title);
    applyFocus(document, els, { type: 'complete-heading' });
    expect(document.activeElement).toBe(els.title);
    applyFocus(document, els, { type: 'none' });
    expect(document.activeElement).toBe(els.title);
    q('stage-toggle-3').focus();
    q('stage-toggle-3').click(); // the redraw rebuilds the list; focus stays on the same control
    expect(document.activeElement).toBe(q('stage-toggle-3'));
  });

  it('does nothing when asked to draw without a journey', () => {
    const els = findElements(document);
    const handlers = {} as JourneyHandlers;
    renderJourney(document, els, base, handlers);
    expect(els.stageList.children).toHaveLength(0);
  });

  it('shows the skeleton while loading', () => {
    renderState(findElements(document), { ...base, screen: 'loading' });
    expect(q('loading-screen').hidden).toBe(false);
    expect(q('skeleton').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('state drawing', () => {
  it('shows only the home screen when there is no journey', () => {
    const els = findElements(document);
    renderState(els, base);
    expect(els.home.hidden).toBe(false);
    expect(els.journey.hidden && els.loading.hidden && els.message.hidden).toBe(true);
  });

  it('disables the button and shows the status while generating, adding the reassurance after 5 s', () => {
    const els = findElements(document);
    renderState(els, { ...base, phase: 'generating', announcement: 'Generating your journey' });
    expect(els.generate.disabled).toBe(true);
    expect(els.status.hidden).toBe(false);
    expect(els.status.textContent).not.toContain('longer than usual');
    expect(els.live.textContent).toBe('Generating your journey');
    renderState(els, { ...base, phase: 'generating', slow: true });
    expect(els.status.textContent).toContain(TEXT.slow);
  });

  it('shows words with a warning sign, not colour alone, for each problem state', () => {
    const els = findElements(document);
    renderState(els, { ...base, phase: 'not-allowed' });
    expect(els.phaseText.textContent).toBe(`⚠ ${TEXT.notAllowed}`);
    expect(els.retry.hidden).toBe(true);
    renderState(els, { ...base, phase: 'rate-limited' });
    expect(els.phaseText.textContent).toContain('Please wait a moment');
    expect(els.retry.hidden).toBe(false);
    renderState(els, { ...base, phase: 'failed' });
    expect(els.phaseText.textContent).toContain(TEXT.failed);
    expect(els.retry.hidden).toBe(false);
    renderState(els, { ...base, topicError: 'Enter a topic between 2 and 100 characters.' });
    expect(els.topicError.textContent).toMatch(/^⚠ Enter a topic/);
    expect(els.input.getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps what the learner typed when states change', () => {
    const els = findElements(document);
    els.input.value = 'my topic';
    renderState(els, { ...base, phase: 'not-allowed' });
    renderState(els, { ...base, phase: 'rate-limited' });
    expect(els.input.value).toBe('my topic');
  });

  it('shows the storage-blocked message with no retry, and load errors with one', () => {
    const els = findElements(document);
    renderState(els, { ...base, screen: 'storage-blocked' });
    expect(els.messageText.textContent).toBe(TEXT.storageBlocked);
    expect(els.messageRetry.hidden).toBe(true);
    renderState(els, { ...base, screen: 'load-error' });
    expect(els.messageText.textContent).toBe(TEXT.loadError);
    expect(els.messageRetry.hidden).toBe(false);
    renderState(els, { ...base, screen: 'load-rate-limited' });
    expect(els.messageText.textContent).toBe(TEXT.rateLimited);
  });

  it('throws a clear error when the page markup is missing a piece', () => {
    document.body.innerHTML = '';
    expect(() => findElements(document)).toThrow(/missing element/);
  });
});

describe('limit message, note and way back (BR21.2, BR22.2)', () => {
  it('shows the plain limit message with the kept journey, not in error style', () => {
    const els = findElements(document);
    renderState(els, { ...base, phase: 'daily-limit', journey: makeJourney() });
    expect(els.limitText.hidden).toBe(false);
    expect(els.limitText.textContent).toContain("today's limit of 5 new journeys");
    expect(els.limitText.textContent).toContain('Come back tomorrow');
    expect(els.limitText.textContent).toContain('current journey is still available');
    expect(els.limitText.className).not.toContain('error');
    expect(els.phaseText.hidden).toBe(true);
    expect(els.generate.disabled).toBe(false);
  });

  it('disables the way back while a create is running', () => {
    const els = findElements(document);
    renderState(els, { ...base, replacing: true, phase: 'generating' });
    expect(els.back.disabled).toBe(true);
    renderState(els, { ...base, replacing: true, phase: 'idle' });
    expect(els.back.disabled).toBe(false);
  });

  it('leaves out the kept-journey sentence when there is none, and keeps it apart from the wait message', () => {
    const els = findElements(document);
    renderState(els, { ...base, phase: 'daily-limit' });
    expect(els.limitText.textContent).not.toContain('still available');
    renderState(els, { ...base, phase: 'rate-limited' });
    expect(els.limitText.hidden).toBe(true);
    expect(els.phaseText.textContent).toContain('Please wait a moment');
  });

  it('shows the way back only while replacing, and its inline error with Try again', () => {
    const els = findElements(document);
    renderState(els, { ...base });
    expect(els.back.hidden).toBe(true);
    renderState(els, { ...base, replacing: true, journey: makeJourney() });
    expect(els.back.hidden).toBe(false);
    expect(els.backError.hidden).toBe(true);
    renderState(els, { ...base, replacing: true, backError: 'failed' });
    expect(els.backError.textContent).toContain("couldn't load your journey");
    expect(els.backRetry.hidden).toBe(false);
    renderState(els, { ...base, replacing: true, backBusy: true });
    expect(els.back.getAttribute('aria-disabled')).toBe('true');
  });

  it('writes the home note as text', () => {
    const els = findElements(document);
    renderState(els, { ...base, note: '<b>gone</b>' });
    expect(els.homeNote.hidden).toBe(false);
    expect(els.homeNote.querySelector('b')).toBeNull();
    expect(els.homeNote.textContent).toBe('<b>gone</b>');
  });

  it('puts focus on the topic box when asked', () => {
    const els = findElements(document);
    els.home.hidden = false;
    applyFocus(document, els, { type: 'topic' });
    expect(document.activeElement).toBe(els.input);
  });

  it('gives the new controls and the dialog data-testid values and 44 pixel classes', () => {
    for (const id of [
      'start-new-button',
      'delete-button',
      'back-button',
      'back-retry-button',
      'confirm-cancel',
      'confirm-ok',
    ]) {
      expect(q(id).className).toContain('button');
    }
  });
});

describe('teaching style radios on the topic screen (BR33.1)', () => {
  const radios = () => [...document.querySelectorAll<HTMLInputElement>('input[name="style"]')];

  it('offers three native radios in a labelled group with nothing selected', () => {
    const els = findElements(document);
    renderState(els, { ...base, style: null });
    expect(radios().map((r) => r.value)).toEqual(['guide', 'instructor', 'planner']);
    expect(radios().every((r) => r.type === 'radio' && !r.checked)).toBe(true);
    const group = q('style-choice');
    expect(group.tagName).toBe('FIELDSET');
    expect(group.querySelector('legend')?.textContent).toBe('Choose your teaching style');
    for (const radio of radios()) {
      const label = document.querySelector(`label[for="${radio.id}"]`);
      expect(label?.textContent?.length).toBeGreaterThan(0);
      expect(document.getElementById(`${radio.id}-desc`)?.textContent?.length).toBeGreaterThan(0);
      expect(radio.getAttribute('aria-describedby')).toBe(`${radio.id}-desc`);
    }
  });

  it('disables the button with a visible hint until a style is chosen', () => {
    const els = findElements(document);
    renderState(els, { ...base, style: null });
    expect(els.generate.disabled).toBe(true);
    expect(els.styleHint.hidden).toBe(false);
    expect(els.styleHint.textContent).toMatch(/Choose a teaching style/);
    expect(els.generate.getAttribute('aria-describedby')).toBe('style-hint');
  });

  it('enables the button and hides the hint once a style is chosen', () => {
    const els = findElements(document);
    renderState(els, { ...base, style: 'instructor' });
    expect(els.generate.disabled).toBe(false);
    expect(els.styleHint.hidden).toBe(true);
    expect(radios().map((r) => r.checked)).toEqual([false, true, false]);
  });

  it('locks the radios while a journey is being made and empties them again', () => {
    const els = findElements(document);
    renderState(els, { ...base, style: 'planner', phase: 'generating' });
    expect(radios().every((r) => r.disabled)).toBe(true);
    expect(els.generate.disabled).toBe(true);
    renderState(els, { ...base, style: null });
    expect(radios().every((r) => !r.checked && !r.disabled)).toBe(true);
  });
});

describe('header: style, goal line and pace (BR30.4, BR33.6)', () => {
  const stages = [1, 2, 3, 4].map((n) => makeStage(n, { hours: 4 }));

  it('shows the style name for each style', () => {
    for (const [style, name] of [
      ['guide', 'Friendly guide'],
      ['instructor', 'Structured instructor'],
      ['planner', 'Planner'],
    ] as const) {
      draw(makeJourney({ teachingStyle: style }));
      expect(q('journey-style').textContent).toBe(`Style: ${name}`);
    }
  });

  it('shows the Set a goal date button and no pace when there is no goal', () => {
    draw(makeJourney({ stages }));
    expect(q('goal-button').textContent).toBe('Set a goal date');
    expect(q('goal-text').hidden).toBe(true);
    expect(q('journey-pace').hidden).toBe(true);
  });

  it('shows the date and days left with Change and the pace beside it', () => {
    draw(makeJourney({ stages, goalDate: '2026-12-08' })); // 28 days from 2026-11-10
    expect(q('goal-text').textContent).toBe('Goal date: 8 Dec 2026 · 28 days left');
    expect(q('goal-button').textContent).toBe('Change');
    expect(q('journey-pace').textContent).toBe('Suggested pace: about 4 hours per week');
    expect(q('journey-pace').hidden).toBe(false);
  });

  it('follows the stages done', () => {
    draw(makeJourney({ stages, goalDate: '2026-12-08', completedStages: [1, 2] }));
    expect(q('journey-pace').textContent).toBe('Suggested pace: about 2 hours per week');
    draw(makeJourney({ stages, goalDate: '2026-12-08', completedStages: [1, 2, 3, 4] }));
    expect(q('journey-pace').hidden).toBe(true);
  });

  it('says Due today with Change and no pace on the goal date', () => {
    draw(makeJourney({ stages, goalDate: '2026-11-10' }));
    expect(q('goal-text').textContent).toBe('Goal date: today · Due today');
    expect(q('goal-button').textContent).toBe('Change');
    expect(q('journey-pace').hidden).toBe(true);
  });

  it('says the goal date passed, in words, with Choose a new date and no pace', () => {
    draw(makeJourney({ stages, goalDate: '2026-11-01' }));
    expect(q('goal-text').textContent).toBe('Goal date passed — choose a new date');
    expect(q('goal-button').textContent).toBe('Choose a new date');
    expect(q('journey-pace').hidden).toBe(true);
  });

  it('follows the state the page holds for today', () => {
    draw(makeJourney({ stages, goalDate: '2026-11-12' }), { today: '2026-11-10' });
    expect(q('goal-text').textContent).toContain('2 days left');
    draw(makeJourney({ stages, goalDate: '2026-11-12' }), { today: '2026-11-11' });
    expect(q('goal-text').textContent).toContain('1 day left');
  });

  it('keeps the goal line and the pace together inside Details, and the progress outside', () => {
    draw(makeJourney({ stages, goalDate: '2026-12-08' }));
    const details = q('header-details');
    expect(details.querySelector('summary')?.textContent).toBe('Details');
    expect(details.contains(q('goal-text'))).toBe(true);
    expect(details.contains(q('goal-button'))).toBe(true);
    expect(details.contains(q('goal-form'))).toBe(true);
    expect(q('goal-line').contains(q('journey-pace'))).toBe(true);
    expect(details.contains(q('journey-style'))).toBe(true);
    expect(details.contains(q('progress-bar'))).toBe(false);
    expect(details.contains(q('progress-count'))).toBe(false);
    expect(details.contains(q('progress-percent'))).toBe(false);
  });
});

describe('goal form and its messages (BR31.1 to BR31.3)', () => {
  const open = { open: true, value: '2026-12-01', seq: 1, error: null };

  it('keeps the form hidden until it is opened', () => {
    draw(makeJourney());
    expect(q('goal-form').hidden).toBe(true);
    expect(q('goal-button').getAttribute('aria-expanded')).toBe('false');
  });

  it('shows a labelled native date field limited from today to 365 days ahead', () => {
    draw(makeJourney(), { goalForm: open });
    const input = q('goal-input') as HTMLInputElement;
    expect(q('goal-form').hidden).toBe(false);
    expect(document.querySelector('label[for="goal-input"]')?.textContent).toBe('Goal date');
    expect(input.type).toBe('date');
    expect(input.min).toBe('2026-11-10');
    expect(input.max).toBe('2027-11-10');
    expect(input.value).toBe('2026-12-01');
    expect(q('goal-button').getAttribute('aria-expanded')).toBe('true');
    expect(q('goal-save-button').textContent?.trim()).toBe('Save');
    expect(q('goal-clear-button').textContent?.trim()).toBe('Clear');
  });

  it('puts the starting text in the field only when the form is reopened, so typing is kept', () => {
    draw(makeJourney(), { goalForm: open });
    const input = q('goal-input') as HTMLInputElement;
    input.value = '2026-12-09';
    draw(makeJourney(), {
      goalForm: { ...open, error: 'Choose a date from today up to 365 days ahead.' },
    });
    expect(input.value).toBe('2026-12-09');
    expect(q('goal-field-error').textContent).toContain('Choose a date from today');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    draw(makeJourney(), { goalForm: { ...open, seq: 2, value: '2026-12-02' } });
    expect(input.value).toBe('2026-12-02');
  });

  it('shows the inline error with Try again for a failed save and no home button', () => {
    draw(makeJourney(), { goalError: 'save-failed' });
    expect(q('goal-error').hidden).toBe(false);
    expect(q('goal-error').textContent).toContain("couldn't save the goal date");
    expect(q('goal-retry-button').hidden).toBe(false);
    expect(q('goal-home-button').hidden).toBe(true);
  });

  it('shows please wait with Try again for a throttle', () => {
    draw(makeJourney(), { goalError: 'rate-limited' });
    expect(q('goal-error').textContent).toContain('Please wait');
    expect(q('goal-retry-button').hidden).toBe(false);
  });

  it('shows the no-longer-saved message with the home button and no Try again', () => {
    draw(makeJourney(), { goalError: 'gone' });
    expect(q('goal-error').textContent).toContain('no longer saved');
    expect(q('goal-home-button').hidden).toBe(false);
    expect(q('goal-retry-button').hidden).toBe(true);
  });

  it('hides every goal message when there is none', () => {
    draw(makeJourney());
    expect(q('goal-error').hidden).toBe(true);
    expect(q('goal-retry-button').hidden).toBe(true);
    expect(q('goal-home-button').hidden).toBe(true);
    expect(q('goal-field-error').hidden).toBe(true);
  });

  it('marks Save, Clear, Start a new journey and Delete as not pressable while a goal saves', () => {
    draw(makeJourney(), { goalSaving: true, goalForm: open });
    for (const id of [
      'goal-save-button',
      'goal-clear-button',
      'start-new-button',
      'delete-button',
    ]) {
      expect(q(id).getAttribute('aria-disabled'), id).toBe('true');
    }
    draw(makeJourney(), { goalForm: open });
    expect(q('goal-save-button').getAttribute('aria-disabled')).toBe('false');
  });

  it('marks Save and Clear as not pressable while a delete runs', () => {
    draw(makeJourney(), {
      goalForm: open,
      dialog: { kind: 'delete', busy: true, error: null },
    });
    expect(q('goal-save-button').getAttribute('aria-disabled')).toBe('true');
    expect(q('goal-clear-button').getAttribute('aria-disabled')).toBe('true');
  });

  it('moves focus to the field or back to the opener as asked', () => {
    const { els } = draw(makeJourney(), { goalForm: open });
    applyFocus(document, els, { type: 'goal-field' });
    expect(document.activeElement).toBe(q('goal-input'));
    applyFocus(document, els, { type: 'goal-opener' });
    expect(document.activeElement).toBe(q('goal-button'));
  });

  it('writes the goal text as text, never as markup', () => {
    draw(makeJourney({ goalDate: '<img src=x onerror=alert(1)>' }));
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});

describe('hours beside each stage (BR33.5, BR33.6)', () => {
  const split = { reading: 1, exercises: 1, miniProject: 0.5, quiz: 0.5 };
  const withSplit = () => [1, 2, 3, 4, 5].map((n) => makeStage(n, { hoursByKind: split }));

  it('shows the four hours beside the total for a planner AI journey', () => {
    draw(makeJourney({ teachingStyle: 'planner', source: 'ai', stages: withSplit() }));
    expect(q('stage-hours-split-1').textContent).toBe(
      'Reading 1 hour · Exercises 1 hour · Mini project 0.5 hours · Quiz 0.5 hours',
    );
    expect(q('stage-panel-1').textContent).toContain('About 3 hours');
  });

  it('shows the total only for a planner journey made from the template', () => {
    draw(makeJourney({ teachingStyle: 'planner', source: 'template' }));
    expect(document.querySelector('[data-testid^="stage-hours-split"]')).toBeNull();
    expect(q('stage-panel-1').textContent).toContain('About 3 hours');
  });

  it('shows the total only for the guide and instructor styles', () => {
    for (const style of ['guide', 'instructor'] as const) {
      draw(makeJourney({ teachingStyle: style, stages: withSplit() }));
      expect(document.querySelector('[data-testid^="stage-hours-split"]')).toBeNull();
    }
  });

  it('shows the total only when a planner stage carries no breakdown', () => {
    draw(makeJourney({ teachingStyle: 'planner', source: 'ai' }));
    expect(document.querySelector('[data-testid^="stage-hours-split"]')).toBeNull();
  });
});

describe('the banner area (BR43.2)', () => {
  const draftBanner = (banner: BannerState | null) => draw(makeJourney(), { banner });

  it('is a polite status region that exists even with no banner, and the banner starts hidden', () => {
    const { els } = draftBanner(null);
    const area = q('banner-area');
    expect(area.getAttribute('role')).toBe('status');
    expect(area.getAttribute('aria-live')).toBe('polite');
    expect(els.banner.hidden).toBe(true);
  });

  it('shows a milestone message as text with a hidden icon and a reachable Dismiss button', () => {
    const { els } = draftBanner({
      kind: 'milestone',
      milestone: 'halfway',
      text: MILESTONE_MESSAGES.halfway,
    });
    expect(els.banner.hidden).toBe(false);
    expect(els.bannerText.textContent).toBe(MILESTONE_MESSAGES.halfway);
    expect(els.bannerIcon.getAttribute('aria-hidden')).toBe('true');
    expect(els.banner.getAttribute('data-kind')).toBe('milestone');
    expect(els.bannerDismiss.tagName).toBe('BUTTON');
    expect(els.bannerDismiss.textContent?.trim()).toBe('Dismiss');
    expect(els.bannerDismiss.tabIndex).toBe(0);
  });

  it('shows a nudge the same way, and hides it again when there is no banner', () => {
    const { els } = draftBanner({ kind: 'nudge', text: nudgeMessage(3, 2, 4) });
    expect(els.banner.getAttribute('data-kind')).toBe('nudge');
    expect(els.bannerText.textContent).toBe(nudgeMessage(3, 2, 4));
    renderBanner(els, { ...base, banner: null });
    expect(els.banner.hidden).toBe(true);
  });

  it('never takes focus when it appears', () => {
    const { els } = draw(makeJourney());
    q('stage-toggle-1').focus();
    const before = document.activeElement;
    renderBanner(els, { ...base, banner: { kind: 'nudge', text: 'Stage 1 is your next step.' } });
    expect(document.activeElement).toBe(before);
  });

  it('puts the text on the page as text, never as markup', () => {
    const { els } = draftBanner({ kind: 'nudge', text: '<b>bold</b>' });
    expect(els.bannerText.textContent).toBe('<b>bold</b>');
    expect(els.bannerText.querySelector('b')).toBeNull();
  });

  it('has no error styling and no countdown in the banner rules', () => {
    const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8');
    const bannerRules = css.slice(css.indexOf('/* Banners'), css.indexOf('/* The completion view'));
    expect(bannerRules).not.toMatch(/error|red|#cf222e/i);
    expect(bannerRules).not.toMatch(/countdown/i);
  });

  it('shows no blocked word in any message as it appears on the page', () => {
    const { els } = draftBanner(null);
    const messages: BannerState[] = [
      ...MILESTONE_ORDER.map((milestone) => ({
        kind: 'milestone' as const,
        milestone,
        text: MILESTONE_MESSAGES[milestone],
      })),
    ];
    for (const days of [0, 1, 2, 3] as const) {
      for (const next of [1, 6, 99]) {
        for (const toGo of [1, 5, 99]) {
          messages.push({ kind: 'nudge', text: nudgeMessage(days, next, toGo) });
        }
      }
    }
    for (const banner of messages) {
      renderBanner(els, { ...base, banner });
      expect(findBlocked(els.bannerText.textContent ?? ''), banner.text).toEqual([]);
    }
  });
});

describe('the completion view and the journey view of a finished journey (BR41.1)', () => {
  const finished = () => makeJourney({ completedStages: [1, 2, 3, 4, 5] });

  it('shows the heading, the certificate panel and no stage ladder in the completion view', () => {
    const { els } = draw(finished(), { open: null, view: 'completion' });
    expect(els.title.textContent).toBe('Journey complete');
    expect(els.title.tagName).toBe('H1');
    expect(els.certificate.section.hidden).toBe(false);
    expect(els.stageList.hidden).toBe(true);
    expect(els.certificate.topic.textContent).toBe('Rust');
    expect(els.certificate.stages.textContent).toBe('5 stages');
    expect(els.certificate.date.textContent).toBe('10 November 2026');
  });

  it('keeps the goal line, the header and the two journey controls in the completion view', () => {
    const { els } = draw(finished(), { open: null, view: 'completion' });
    expect(els.journey.querySelector('[data-testid="journey-header"]')).not.toBeNull();
    expect(els.startNew.hidden).toBe(false);
    expect(els.deleteMine.hidden).toBe(false);
    expect(els.goalButton.textContent).toBe('Set a goal date');
  });

  it('shows the topic as the heading and the ladder at 100% in the journey view, with no "Journey complete"', () => {
    const { els } = draw(finished(), { open: null, view: 'journey' });
    expect(els.title.textContent).toBe('Your Rust journey');
    expect(els.title.textContent).not.toContain('Journey complete');
    expect(els.certificate.section.hidden).toBe(true);
    expect(els.stageList.hidden).toBe(false);
    expect(els.subtitle.hidden).toBe(true);
    expect(els.progressPercent.textContent).toBe('100%');
    expect(els.stageList.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0);
  });

  it('never shows the completion view for a journey with a stage not done', () => {
    const { els } = draw(makeJourney({ completedStages: [1, 2, 3, 4] }), { view: 'completion' });
    expect(els.title.textContent).toBe('Your Rust journey');
    expect(els.certificate.section.hidden).toBe(true);
  });

  it('shows the six-stage count and the date of the learner calendar', () => {
    const six = makeJourney({
      stages: [1, 2, 3, 4, 5, 6].map((n) => makeStage(n)),
      completedStages: [1, 2, 3, 4, 5, 6],
    });
    const { els } = draw(six, { view: 'completion', today: '2027-01-02' });
    expect(els.certificate.stages.textContent).toBe('6 stages');
    expect(els.certificate.date.textContent).toBe('2 January 2027');
  });
});
