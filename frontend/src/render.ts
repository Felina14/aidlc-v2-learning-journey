/**
 * Drawing the page. Every typed or AI-written string is put on the page with `textContent`,
 * never as markup (BR1.5). Interactive elements carry `data-testid`.
 */

import {
  completeCount,
  formatHours as hoursText,
  percent,
  stageStatuses,
  totalHours,
  type StageState,
} from './progress';
import { MAX_GOAL_DAYS, addDays, goalButtonLabel, goalLineText, goalState, paceLine } from './goal';
import {
  COMPLETION_HEADING,
  findCertificateElements,
  renderCertificate,
  type CertificateElements,
} from './certificate';
import {
  DAILY_LIMIT_KEPT_TEXT,
  DAILY_LIMIT_TEXT,
  CHANGE_CHANGED_TEXT,
  CHANGE_FAILED_TEXT,
  CHANGE_GONE_TEXT,
  GOAL_FAILED_TEXT,
  type AppState,
  type ChangeErrorKind,
  type FocusRequest,
} from './state';
import type { Stage, TeachingStyle } from './types';

export const LABEL_AI = 'AI-generated content · May need verification';
export const LABEL_TEMPLATE = 'Template-based journey — AI generation was unavailable';

export const TEXT = {
  generating: 'Generating your journey…',
  slow: 'This is taking a little longer than usual. Your journey will be ready soon.',
  notAllowed: "That topic isn't one I can build a journey for. Try a different topic.",
  rateLimited: 'Lots of requests at once. Please wait a moment and try again.',
  failed: "We couldn't make or save your journey. Please try again.",
  storageBlocked:
    "Your browser is blocking storage, so we can't remember who you are. " +
    'Allow site storage for this page, then reload it.',
  loadError: "We couldn't load your journey.",
  loading: 'Loading your journey…',
  changeFailed: CHANGE_FAILED_TEXT,
  changeGone: CHANGE_GONE_TEXT,
  changeChanged: CHANGE_CHANGED_TEXT,
  dailyLimit: DAILY_LIMIT_TEXT,
  dailyLimitKept: DAILY_LIMIT_KEPT_TEXT,
  backFailed: "We couldn't load your journey.",
} as const;

export const STYLE_NAMES: Record<TeachingStyle, string> = {
  guide: 'Friendly guide',
  instructor: 'Structured instructor',
  planner: 'Planner',
};

export const STYLE_KEYS: readonly TeachingStyle[] = ['guide', 'instructor', 'planner'];

export const STATUS_WORDS: Record<StageState, string> = {
  done: 'Done',
  'up-next': 'Up next',
  'to-do': 'To do',
};

function byTestId(doc: Document, id: string): HTMLElement {
  const found = doc.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (!found) throw new Error(`missing element ${id}`);
  return found;
}

export interface Elements {
  loading: HTMLElement;
  home: HTMLElement;
  journey: HTMLElement;
  message: HTMLElement;
  messageText: HTMLElement;
  messageRetry: HTMLButtonElement;
  input: HTMLInputElement;
  generate: HTMLButtonElement;
  topicError: HTMLElement;
  status: HTMLElement;
  phaseText: HTMLElement;
  retry: HTMLButtonElement;
  live: HTMLElement;
  form: HTMLFormElement;
  title: HTMLElement;
  subtitle: HTMLElement;
  progressBar: HTMLProgressElement;
  progressPercent: HTMLElement;
  progressCount: HTMLElement;
  sourceLabel: HTMLElement;
  total: HTMLElement;
  stageList: HTMLElement;
  limitText: HTMLElement;
  startNew: HTMLButtonElement;
  deleteMine: HTMLButtonElement;
  homeNote: HTMLElement;
  back: HTMLButtonElement;
  backError: HTMLElement;
  backRetry: HTMLButtonElement;
  styleRadios: HTMLInputElement[];
  styleHint: HTMLElement;
  journeyStyle: HTMLElement;
  pace: HTMLElement;
  headerDetails: HTMLDetailsElement;
  goalText: HTMLElement;
  goalButton: HTMLButtonElement;
  goalError: HTMLElement;
  goalRetry: HTMLButtonElement;
  goalHome: HTMLButtonElement;
  goalForm: HTMLFormElement;
  goalInput: HTMLInputElement;
  goalFormatHint: HTMLElement;
  goalFieldError: HTMLElement;
  goalSave: HTMLButtonElement;
  goalClear: HTMLButtonElement;
  banner: HTMLElement;
  bannerIcon: HTMLElement;
  bannerText: HTMLElement;
  bannerDismiss: HTMLButtonElement;
  certificate: CertificateElements;
}

export function findElements(doc: Document): Elements {
  const t = (id: string) => byTestId(doc, id);
  return {
    loading: t('loading-screen'),
    home: t('home-screen'),
    journey: t('journey-screen'),
    message: t('message-screen'),
    messageText: t('message-text'),
    messageRetry: t('load-retry-button') as HTMLButtonElement,
    input: t('topic-input') as HTMLInputElement,
    generate: t('generate-button') as HTMLButtonElement,
    topicError: t('topic-error'),
    status: t('status-line'),
    phaseText: t('phase-message'),
    retry: t('try-again-button') as HTMLButtonElement,
    live: t('live-region'),
    form: t('topic-form') as HTMLFormElement,
    title: t('journey-title'),
    subtitle: t('journey-subtitle'),
    progressBar: t('progress-bar') as HTMLProgressElement,
    progressPercent: t('progress-percent'),
    progressCount: t('progress-count'),
    sourceLabel: t('source-label'),
    total: t('journey-total'),
    stageList: t('stage-list'),
    limitText: t('limit-message'),
    startNew: t('start-new-button') as HTMLButtonElement,
    deleteMine: t('delete-button') as HTMLButtonElement,
    homeNote: t('home-note'),
    back: t('back-button') as HTMLButtonElement,
    backError: t('back-error'),
    backRetry: t('back-retry-button') as HTMLButtonElement,
    styleRadios: STYLE_KEYS.map((key) => t(`style-${key}`) as HTMLInputElement),
    styleHint: t('style-hint'),
    journeyStyle: t('journey-style'),
    pace: t('journey-pace'),
    headerDetails: t('header-details') as HTMLDetailsElement,
    goalText: t('goal-text'),
    goalButton: t('goal-button') as HTMLButtonElement,
    goalError: t('goal-error'),
    goalRetry: t('goal-retry-button') as HTMLButtonElement,
    goalHome: t('goal-home-button') as HTMLButtonElement,
    goalForm: t('goal-form') as HTMLFormElement,
    goalInput: t('goal-input') as HTMLInputElement,
    goalFormatHint: t('goal-format-hint'),
    goalFieldError: t('goal-field-error'),
    goalSave: t('goal-save-button') as HTMLButtonElement,
    goalClear: t('goal-clear-button') as HTMLButtonElement,
    banner: t('banner'),
    bannerIcon: t('banner-icon'),
    bannerText: t('banner-text'),
    bannerDismiss: t('banner-dismiss') as HTMLButtonElement,
    certificate: findCertificateElements(doc),
  };
}

function setVisible(element: HTMLElement, visible: boolean): void {
  element.hidden = !visible;
}

/** Update the static page to match the state. The topic box is never touched, so typing is kept. */
export function renderState(els: Elements, state: AppState): void {
  const { screen, phase } = state;
  setVisible(els.loading, screen === 'loading');
  setVisible(els.home, screen === 'home');
  setVisible(els.journey, screen === 'journey');
  const showMessage =
    screen === 'storage-blocked' || screen === 'load-error' || screen === 'load-rate-limited';
  setVisible(els.message, showMessage);
  if (showMessage) {
    els.messageText.textContent =
      screen === 'storage-blocked'
        ? TEXT.storageBlocked
        : screen === 'load-error'
          ? TEXT.loadError
          : TEXT.rateLimited;
    setVisible(els.messageRetry, screen !== 'storage-blocked');
  }

  const generating = phase === 'generating';
  // The button stays disabled, with its hint showing, until a style is chosen (BR33.1).
  els.generate.disabled = generating || state.style === null;
  els.generate.textContent = generating ? 'Generating…' : 'Generate my journey';
  els.input.setAttribute('aria-invalid', state.topicError ? 'true' : 'false');
  for (const radio of els.styleRadios) {
    radio.checked = radio.value === state.style;
    radio.disabled = generating;
  }
  setVisible(els.styleHint, state.style === null);

  els.topicError.textContent = state.topicError ? `⚠ ${state.topicError}` : '';
  setVisible(els.topicError, state.topicError !== null);

  els.status.textContent = generating
    ? state.slow
      ? `${TEXT.generating} ${TEXT.slow}`
      : TEXT.generating
    : '';
  setVisible(els.status, generating);

  // The daily limit is a plain notice: no warning mark and no error colour (BR21.2).
  const limit = phase === 'daily-limit';
  const message =
    phase === 'not-allowed'
      ? TEXT.notAllowed
      : phase === 'rate-limited'
        ? TEXT.rateLimited
        : phase === 'failed'
          ? TEXT.failed
          : '';
  els.phaseText.textContent = message ? `⚠ ${message}` : '';
  setVisible(els.phaseText, message !== '');
  els.limitText.textContent = limit
    ? state.journey
      ? `ℹ ${TEXT.dailyLimit} ${TEXT.dailyLimitKept}`
      : `ℹ ${TEXT.dailyLimit}`
    : '';
  setVisible(els.limitText, limit);
  setVisible(els.retry, phase === 'failed' || phase === 'rate-limited');

  els.homeNote.textContent = state.note ?? '';
  setVisible(els.homeNote, state.note !== null);
  setVisible(els.back, state.replacing);
  els.back.disabled = generating;
  els.back.setAttribute('aria-disabled', String(state.backBusy || generating));
  els.back.textContent = state.backBusy ? 'Loading…' : 'Back to my journey';
  const backMessage =
    state.backError === 'rate-limited'
      ? TEXT.rateLimited
      : state.backError === 'failed'
        ? TEXT.backFailed
        : '';
  els.backError.textContent = backMessage ? `⚠ ${backMessage}` : '';
  setVisible(els.backError, backMessage !== '');
  setVisible(els.backRetry, backMessage !== '');

  if (els.live.textContent !== state.announcement) els.live.textContent = state.announcement;
}

function make(
  doc: Document,
  tag: string,
  text?: string,
  attrs: Record<string, string> = {},
): HTMLElement {
  const element = doc.createElement(tag);
  if (text !== undefined) element.textContent = text;
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  return element;
}

function labelled(doc: Document, heading: string, body: HTMLElement): HTMLElement {
  const wrapper = make(doc, 'div', undefined, { class: 'detail' });
  wrapper.append(make(doc, 'h3', heading), body);
  return wrapper;
}

function list(doc: Document, items: string[]): HTMLElement {
  const ul = make(doc, 'ul');
  for (const item of items) ul.append(make(doc, 'li', item));
  return ul;
}

/** "About 3 hours": whole or one decimal (BR10.2). */
export function formatHours(hours: number): string {
  const written = hoursText(hours);
  return `About ${written} ${written === '1' ? 'hour' : 'hours'}`;
}

/** What the page does when the learner presses something in the journey. */
export interface JourneyHandlers {
  openPanel(stage: number | null): void;
  toggleStage(stage: number): void;
  retryChange(): void;
  goHome(): void;
  reload(): void;
}

const CHANGE_MESSAGES: Record<ChangeErrorKind, string> = {
  'save-failed': TEXT.changeFailed,
  'rate-limited': TEXT.rateLimited,
  gone: TEXT.changeGone,
  changed: TEXT.changeChanged,
};

function button(
  doc: Document,
  label: string,
  testId: string,
  onPress: () => void,
  secondary = true,
): HTMLButtonElement {
  const element = make(doc, 'button', label, {
    type: 'button',
    class: secondary ? 'button button--secondary' : 'button',
    'data-testid': testId,
  }) as HTMLButtonElement;
  element.addEventListener('click', onPress);
  return element;
}

function buildActions(
  doc: Document,
  state: AppState,
  stage: Stage,
  done: boolean,
  handlers: JourneyHandlers,
): HTMLElement {
  const n = stage.stageNumber;
  const actions = make(doc, 'div', undefined, { class: 'stage__actions' });
  const label = done ? `Mark stage ${n} as not complete` : `Mark stage ${n} complete`;
  const press = button(doc, label, `complete-button-${n}`, () => handlers.toggleStage(n), false);
  // A busy button keeps its label; every mark button ignores presses while a change saves.
  if (state.saving !== null) press.setAttribute('aria-disabled', 'true');
  if (state.saving === n) press.setAttribute('aria-busy', 'true');
  actions.append(press);
  const error = state.changeError;
  if (error && error.stage === n) {
    const message = make(doc, 'p', `⚠ ${CHANGE_MESSAGES[error.kind]}`, {
      class: 'message message--error',
      'data-testid': `change-error-${n}`,
    });
    actions.append(message);
    if (error.kind === 'save-failed' || error.kind === 'rate-limited') {
      actions.append(button(doc, 'Try again', `change-retry-${n}`, () => handlers.retryChange()));
    } else if (error.kind === 'gone') {
      actions.append(button(doc, 'Back to the home screen', `change-home-${n}`, handlers.goHome));
    } else {
      actions.append(button(doc, 'Reload', `change-reload-${n}`, handlers.reload));
    }
  }
  return actions;
}

const SPLIT_LABELS = [
  ['reading', 'Reading'],
  ['exercises', 'Exercises'],
  ['miniProject', 'Mini project'],
  ['quiz', 'Quiz'],
] as const;

/** The four hours of a planner-style AI journey, beside the stage total (BR33.6). */
function hoursSplit(doc: Document, state: AppState, stage: Stage): HTMLElement[] {
  const journey = state.journey;
  const split = stage.hoursByKind;
  if (!journey || journey.source !== 'ai' || journey.teachingStyle !== 'planner' || !split) {
    return [];
  }
  const parts = SPLIT_LABELS.map(([key, label]) => {
    const written = hoursText(split[key]);
    return `${label} ${written} ${written === '1' ? 'hour' : 'hours'}`;
  });
  return [
    make(doc, 'p', parts.join(' · '), {
      class: 'stage__hours-split',
      'data-testid': `stage-hours-split-${stage.stageNumber}`,
    }),
  ];
}

function buildPanel(
  doc: Document,
  state: AppState,
  stage: Stage,
  done: boolean,
  handlers: JourneyHandlers,
): HTMLElement {
  const panel = make(doc, 'div', undefined, {
    id: `stage-panel-${stage.stageNumber}`,
    class: 'stage__panel',
    role: 'region',
    'aria-label': `Stage ${stage.stageNumber} details`,
    'data-testid': `stage-panel-${stage.stageNumber}`,
  });
  panel.hidden = state.open !== stage.stageNumber;
  panel.append(
    labelled(doc, 'What it is', make(doc, 'p', stage.whatItIs)),
    labelled(doc, 'Why it matters', make(doc, 'p', stage.whyItMatters)),
    labelled(doc, 'After this', make(doc, 'p', stage.afterThis)),
    labelled(doc, 'Reading', list(doc, stage.materials.reading)),
    labelled(doc, 'Exercises', list(doc, stage.materials.exercises)),
    labelled(doc, 'Mini project', make(doc, 'p', stage.materials.miniProject)),
    labelled(doc, 'Quiz', list(doc, stage.materials.quiz)),
    make(doc, 'p', formatHours(stage.hours), { class: 'stage__hours' }),
    ...hoursSplit(doc, state, stage),
    buildActions(doc, state, stage, done, handlers),
  );
  return panel;
}

function buildStage(
  doc: Document,
  state: AppState,
  stage: Stage,
  status: StageState,
  handlers: JourneyHandlers,
): HTMLElement {
  const n = stage.stageNumber;
  const isOpen = state.open === n;
  const item = make(doc, 'li', undefined, { class: `stage stage--${status}` });
  const heading = make(doc, 'h2', undefined, {
    class: 'stage__heading',
    tabindex: '-1',
    'data-testid': `stage-heading-${n}`,
  });
  const toggle = make(doc, 'button', undefined, {
    type: 'button',
    class: 'stage__toggle',
    'aria-expanded': String(isOpen),
    'aria-controls': `stage-panel-${n}`,
    'data-testid': `stage-toggle-${n}`,
  });
  toggle.append(
    make(doc, 'span', status === 'done' ? '✓' : String(n), {
      class: 'stage__number',
      'aria-hidden': 'true',
    }),
    make(doc, 'span', `Stage ${n}: `, { class: 'visually-hidden' }),
    make(doc, 'span', stage.title, { class: 'stage__title' }),
    make(doc, 'span', STATUS_WORDS[status], {
      class: 'stage__status',
      'data-testid': `stage-status-${n}`,
    }),
    make(doc, 'span', formatHours(stage.hours), { class: 'stage__meta' }),
  );
  toggle.addEventListener('click', () => handlers.openPanel(isOpen ? null : n));
  heading.append(toggle);
  item.append(heading, buildPanel(doc, state, stage, status === 'done', handlers));
  return item;
}

/** The goal line, the goal form, the style name and the pace (BR30.4, BR31, BR33.6). */
function renderHeader(els: Elements, state: AppState): void {
  const { journey, goalForm, goalSaving, goalError, today, dialog } = state;
  if (!journey) return;
  const goal = goalState(journey.goalDate, today);
  const style = STYLE_KEYS.find((key) => key === journey.teachingStyle) ?? 'guide';
  els.journeyStyle.textContent = `Style: ${STYLE_NAMES[style]}`;

  const pace = paceLine(goal, journey.stages, journey.completedStages);
  els.pace.textContent = pace === null ? '' : `Suggested pace: ${pace}`;
  setVisible(els.pace, pace !== null);

  els.goalText.textContent = goalLineText(goal, journey.goalDate);
  setVisible(els.goalText, goal.kind !== 'none');
  els.goalButton.textContent = goalButtonLabel(goal);
  els.goalButton.setAttribute('aria-expanded', String(goalForm.open));

  const deleting = dialog !== null && dialog.kind === 'delete' && dialog.busy;
  const locked = goalSaving || deleting;
  els.goalSave.setAttribute('aria-disabled', String(locked));
  els.goalClear.setAttribute('aria-disabled', String(locked));
  els.goalSave.toggleAttribute('aria-busy', goalSaving);
  els.startNew.setAttribute('aria-disabled', String(goalSaving));
  els.deleteMine.setAttribute('aria-disabled', String(goalSaving));

  // The field gets its starting text only when the form is (re)opened, so typing is kept.
  setVisible(els.goalForm, goalForm.open);
  if (els.goalForm.getAttribute('data-seq') !== String(goalForm.seq)) {
    els.goalForm.setAttribute('data-seq', String(goalForm.seq));
    els.goalInput.value = goalForm.value;
  }
  els.goalInput.min = today;
  els.goalInput.max = today === '' ? '' : addDays(today, MAX_GOAL_DAYS);
  els.goalFieldError.textContent = goalForm.error ? `⚠ ${goalForm.error}` : '';
  setVisible(els.goalFieldError, goalForm.error !== null);
  els.goalInput.setAttribute('aria-invalid', goalForm.error ? 'true' : 'false');

  const messages: Record<string, string> = {
    'save-failed': GOAL_FAILED_TEXT,
    'rate-limited': TEXT.rateLimited,
    gone: TEXT.changeGone,
  };
  els.goalError.textContent = goalError ? `⚠ ${messages[goalError]}` : '';
  setVisible(els.goalError, goalError !== null);
  setVisible(els.goalRetry, goalError === 'save-failed' || goalError === 'rate-limited');
  setVisible(els.goalHome, goalError === 'gone');
}

/** The one banner above the journey: real text, a hidden icon, a Dismiss button (BR43.2). */
export function renderBanner(els: Elements, state: AppState): void {
  const { banner } = state;
  if (banner === null) {
    if (!els.banner.hidden) els.banner.hidden = true;
    return;
  }
  // Only change the text when it differs, so the polite region is not read out again.
  if (els.bannerText.textContent !== banner.text) els.bannerText.textContent = banner.text;
  els.banner.setAttribute('data-kind', banner.kind);
  els.bannerIcon.textContent = banner.kind === 'milestone' ? '★' : '✦';
  if (els.banner.hidden) els.banner.hidden = false;
}

/** Draw the header, the progress figures and the stage ladder from the state (BR10, BR13). */
export function renderJourney(
  doc: Document,
  els: Elements,
  state: AppState,
  handlers: JourneyHandlers,
): void {
  const { journey } = state;
  if (!journey) return;
  const stageNumbers = journey.stages.map((stage) => stage.stageNumber);
  const count = completeCount(journey.completedStages, journey.stages.length);
  const pct = percent(count, journey.stages.length);
  const allDone = count === journey.stages.length;
  // The completion view only when every stage is done and the view says so (BR41.1); "Back to my
  // journey" shows the journey view at 100% with the topic as its heading.
  const completion = allDone && state.view === 'completion';

  els.title.textContent = completion ? COMPLETION_HEADING : `Your ${journey.topic} journey`;
  els.subtitle.textContent = completion ? `Your ${journey.topic} journey` : '';
  els.subtitle.hidden = !completion;
  els.certificate.section.hidden = !completion;
  els.stageList.hidden = completion;
  renderCertificate(els.certificate, {
    topic: journey.topic,
    stageCount: journey.stages.length,
    today: state.today,
  });
  renderBanner(els, state);
  els.sourceLabel.textContent = journey.source === 'ai' ? LABEL_AI : LABEL_TEMPLATE;
  els.sourceLabel.setAttribute('data-source', journey.source);
  els.progressBar.value = pct;
  els.progressPercent.textContent = `${pct}%`;
  els.progressCount.textContent = `${count} of ${journey.stages.length} complete`;
  els.total.textContent =
    `${journey.stages.length} stages · about ${hoursText(totalHours(journey.stages))} ` +
    'hours in total';

  renderHeader(els, state);

  const active = doc.activeElement;
  const keep = active && els.stageList.contains(active) ? active.getAttribute('data-testid') : null;
  const statuses = stageStatuses(stageNumbers, journey.completedStages);
  els.stageList.replaceChildren(
    ...journey.stages.map((stage, index) =>
      buildStage(doc, state, stage, statuses[index] ?? 'to-do', handlers),
    ),
  );
  if (keep) doc.querySelector<HTMLElement>(`[data-testid="${keep}"]`)?.focus();
}

/** Move focus where the interaction rules say (BR10.4). */
export function applyFocus(doc: Document, els: Elements, focus: FocusRequest): void {
  switch (focus.type) {
    case 'none':
      return;
    case 'topic':
      els.input.focus();
      return;
    case 'title':
    case 'complete-heading':
      els.title.focus();
      return;
    case 'heading':
      doc.querySelector<HTMLElement>(`[data-testid="stage-heading-${focus.stage}"]`)?.focus();
      return;
    case 'button':
      doc.querySelector<HTMLElement>(`[data-testid="complete-button-${focus.stage}"]`)?.focus();
      return;
    case 'goal-field':
      els.goalInput.focus();
      return;
    case 'goal-opener':
      els.goalButton.focus();
      return;
  }
}
