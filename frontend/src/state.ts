/** The page's state machine (functional-spec: "State machine, a create request"). */

import { checkTopic } from './validation';
import { completeCount, openPanelAfter, percent, type FocusTarget } from './progress';
import { checkGoalDate, localDateText, msUntilNextMidnight } from './goal';
import { MILESTONE_MESSAGES, isMilestone, planMilestones, type Milestone } from './milestones';
import { NudgeDismissals, nudgeStatus, type NudgeStorage } from './nudge';
import type {
  CompletionResult,
  CreateResult,
  DeleteResult,
  GoalResult,
  Journey,
  LoadResult,
  MilestoneResult,
  TeachingStyle,
} from './types';
import type { SessionResult } from './session';

export type Screen =
  'loading' | 'storage-blocked' | 'home' | 'journey' | 'load-error' | 'load-rate-limited';

/** Where focus should go after an update; `title` is the journey heading on first showing. */
export type FocusRequest =
  | FocusTarget
  | { type: 'title' }
  | { type: 'topic' }
  | { type: 'goal-field' }
  | { type: 'goal-opener' };

/** The goal date form: open or closed, with the text it starts from and any message (BR31.1). */
export interface GoalFormState {
  open: boolean;
  /** The text the field starts with; it changes only when `seq` changes, so typing is kept. */
  value: string;
  seq: number;
  error: string | null;
}

/** What went wrong with the last goal change, shown beside the goal line (BR31.2, BR31.3). */
export type GoalErrorKind = 'save-failed' | 'rate-limited' | 'gone';

/** What went wrong with the last stage change, shown inside the pressed stage's panel. */
export type ChangeErrorKind = 'save-failed' | 'rate-limited' | 'gone' | 'changed';

export interface ChangeError {
  stage: number;
  kind: ChangeErrorKind;
}

export type Phase =
  'idle' | 'generating' | 'not-allowed' | 'rate-limited' | 'daily-limit' | 'failed';

export type DialogKind = 'replace' | 'delete';

/** An open confirmation: busy while the delete runs, with an error shown inside it. */
export interface DialogState {
  kind: DialogKind;
  busy: boolean;
  error: string | null;
}

/** Why the way back to the saved journey could not show it (BR22.2). */
export type BackError = 'failed' | 'rate-limited';

/** Which of the two views of a journey the page shows (BR41.1). Held in page memory only. */
export type PageView = 'journey' | 'completion';

/** The one message shown above the journey, or none (BR43.2). */
export type BannerState =
  { kind: 'milestone'; milestone: Milestone; text: string } | { kind: 'nudge'; text: string };

export interface AppState {
  screen: Screen;
  phase: Phase;
  /** True once a create request has waited more than 5 seconds (BR6.1). */
  slow: boolean;
  /** Message for a topic the browser rejected; the request was never sent. */
  topicError: string | null;
  journey: Journey | null;
  /** Text for the polite live region; changes when something new should be announced. */
  announcement: string;
  /** The stage whose change is being saved; only one change is in flight (BR13.2). */
  saving: number | null;
  changeError: ChangeError | null;
  /** The one open stage panel (BR10.4), or none. */
  open: number | null;
  focus: FocusRequest;
  /** Goes up each time a focus move is asked for, so the page moves focus once per request. */
  focusSeq: number;
  /** The open confirmation, or none (BR24.1). */
  dialog: DialogState | null;
  /** True on the topic screen reached through "Start a new journey"; the old journey is kept. */
  replacing: boolean;
  /** A plain note on the home screen, e.g. that the journey is no longer saved. */
  note: string | null;
  backBusy: boolean;
  backError: BackError | null;
  /** The teaching style picked on the topic screen; none is preselected (BR33.1). */
  style: TeachingStyle | null;
  /** The learner's local date, "YYYY-MM-DD"; refreshed at midnight and when the tab shows again. */
  today: string;
  goalForm: GoalFormState;
  /** True while a goal change is being saved; only one is in flight (BR31.2). */
  goalSaving: boolean;
  goalError: GoalErrorKind | null;
  /** The completion view or the journey view; completion only when every stage is done. */
  view: PageView;
  /** The banner area: a milestone before a nudge, one at a time (BR43.2). */
  banner: BannerState | null;
}

export interface ControllerDeps {
  api: {
    create(sessionId: string, topic: string, style: TeachingStyle): Promise<CreateResult>;
    load(sessionId: string): Promise<LoadResult>;
    setCompletion(
      sessionId: string,
      stageNumber: number,
      completed: boolean,
    ): Promise<CompletionResult>;
    delete(sessionId: string): Promise<DeleteResult>;
    setGoal(sessionId: string, goalDate: string | null): Promise<GoalResult>;
    recordMilestone(sessionId: string, milestone: Milestone): Promise<MilestoneResult>;
  };
  session: () => SessionResult;
  now: () => number;
  setTimer: (callback: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  /** Browser storage for the nudge dismissals; absent or blocked means page memory only. */
  nudgeStorage?: () => NudgeStorage | null;
}

export const SLOW_AFTER_MS = 5000;
export const RECENT_JOURNEY_MS = 60_000;

export const ANNOUNCE_GENERATING = 'Generating your journey';
export const ANNOUNCE_READY = 'Your journey is ready';
export const ANNOUNCE_NOT_ALLOWED = "That topic isn't one I can build a journey for.";
export const ANNOUNCE_RATE_LIMITED = 'Lots of requests at once. Please wait a moment.';
export const ANNOUNCE_FAILED = 'Something went wrong.';
export const DAILY_LIMIT_TEXT =
  "You've reached today's limit of 5 new journeys. Come back tomorrow.";
export const DAILY_LIMIT_KEPT_TEXT = 'Your current journey is still available.';
export const ANNOUNCE_DELETED = 'Your journey was deleted.';
export const DELETE_FAILED_TEXT =
  "We couldn't delete your journey. Your journey is still saved. Try again.";
export const DELETE_RATE_LIMITED_TEXT =
  'Lots of requests at once. Please wait a moment and try again.';
export const NOTE_JOURNEY_GONE = 'That journey is no longer saved. You can start a new one.';
export const ANNOUNCE_LOADING = 'Loading your journey';
export const CHANGE_FAILED_TEXT = "We couldn't save that change. Try again.";
export const CHANGE_GONE_TEXT = 'This journey is no longer saved. You can start a new one.';
export const CHANGE_CHANGED_TEXT = 'Your journey has changed. Reload to see the latest version.';
export const ANNOUNCE_GOAL_SAVED = 'Goal date saved';
export const ANNOUNCE_GOAL_CLEARED = 'Goal date cleared';
export const GOAL_FAILED_TEXT = "We couldn't save the goal date. Try again.";
export const GOAL_INVALID_TEXT = 'That date could not be used. Choose another date.';

type Listener = (state: AppState) => void;

export class JourneyController {
  state: AppState = {
    screen: 'loading',
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
    style: null,
    today: '',
    goalForm: { open: false, value: '', seq: 0, error: null },
    goalSaving: false,
    goalError: null,
    view: 'journey',
    banner: null,
  };

  private listeners: Listener[] = [];
  private lastTopic = '';
  private slowTimer: unknown = null;
  private lastChange: { stage: number; completed: boolean } | null = null;
  /** Goes up whenever the journey on screen is replaced or removed; older change answers are dropped. */
  private journeyGen = 0;
  private lastStyle: TeachingStyle = 'guide';
  private lastGoal: { date: string | null } | null = null;
  private midnightTimer: unknown = null;
  /** The page's shown set (PageShownSet, BR40.1): filled from the load, never reduced in a visit. */
  private shown = new Set<Milestone>();
  /** The milestone banner on screen, if any; it goes only when dismissed or the journey changes. */
  private milestoneBanner: Milestone | null = null;
  private readonly dismissals: NudgeDismissals;

  constructor(private readonly deps: ControllerDeps) {
    this.state = { ...this.state, today: this.localToday() };
    this.dismissals = new NudgeDismissals(deps.nudgeStorage ?? (() => null));
  }

  private localToday(): string {
    return localDateText(new Date(this.deps.now()));
  }

  /** Work the local date out again; the goal line follows it (BR30.2). Called by the page. */
  refreshToday(): void {
    const today = this.localToday();
    if (today !== this.state.today) this.update({ today });
  }

  /** Set a timer for the next local midnight, then again after it, so the goal stays right. */
  private scheduleMidnight(): void {
    if (this.midnightTimer !== null) this.deps.clearTimer(this.midnightTimer);
    const wait = msUntilNextMidnight(new Date(this.deps.now()));
    this.midnightTimer = this.deps.setTimer(() => {
      this.midnightTimer = null;
      this.refreshToday();
      this.scheduleMidnight();
    }, wait + 50);
  }

  /** The learner picks a teaching style; none is picked until they do (BR33.1). */
  chooseStyle(style: TeachingStyle): void {
    if (this.state.phase === 'generating') return;
    this.update({ style });
  }

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.state);
  }

  private update(changes: Partial<AppState>): void {
    const merged = { ...this.state, ...changes };
    // The banner area is worked out from the state on every change, so a stage change, a goal
    // change, a load, the next midnight and the tab showing again all re-evaluate the nudge.
    this.state = { ...merged, banner: this.computeBanner(merged) };
    for (const listener of this.listeners) listener(this.state);
  }

  /** A milestone before a nudge; the nudge waits until the milestone is dismissed (BR43.2). */
  private computeBanner(state: AppState): BannerState | null {
    if (state.screen !== 'journey' || !state.journey) return null;
    if (this.milestoneBanner !== null) {
      return {
        kind: 'milestone',
        milestone: this.milestoneBanner,
        text: MILESTONE_MESSAGES[this.milestoneBanner],
      };
    }
    const { journey, today } = state;
    const nudge = nudgeStatus({
      stageNumbers: journey.stages.map((stage) => stage.stageNumber),
      completedStages: journey.completedStages,
      goalDate: journey.goalDate,
      today,
    });
    if (!nudge.applies || journey.goalDate === null) return null;
    if (this.dismissals.isDismissed(journey.goalDate, today)) return null;
    return { kind: 'nudge', text: nudge.message };
  }

  /** Dismiss removes the banner at once; a nudge's dismissal is kept for today (BR42.3). */
  dismissBanner(): void {
    const { banner, journey, today } = this.state;
    if (!banner) return;
    if (banner.kind === 'milestone') {
      this.milestoneBanner = null;
    } else if (journey?.goalDate) {
      this.dismissals.dismiss(journey.goalDate, today);
    }
    // The dismiss button goes away, so focus moves to the page heading (interaction spec).
    this.update({ focus: { type: 'title' }, focusSeq: this.state.focusSeq + 1 });
  }

  /** "Back to my journey" on the completion view: the journey view, no panel open (BR41.1). */
  showJourneyView(): void {
    if (this.state.view !== 'completion') return;
    this.update({
      view: 'journey',
      open: null,
      focus: { type: 'title' },
      focusSeq: this.state.focusSeq + 1,
    });
  }

  /** Workflow 3: open the page. */
  async start(): Promise<void> {
    const session = this.deps.session();
    if (!session.ok) {
      this.update({ screen: 'storage-blocked' });
      return;
    }
    this.update({ screen: 'loading', announcement: ANNOUNCE_LOADING });
    this.refreshToday();
    this.scheduleMidnight();
    const result = await this.deps.api.load(session.sessionId);
    switch (result.kind) {
      case 'journey':
        this.enter(result.journey, '');
        break;
      case 'none':
        this.update({
          screen: 'home',
          announcement: '',
          replacing: false,
          note: null,
          style: null,
          // Page load on Home: focus starts on the Topic field (interaction spec).
          focus: { type: 'topic' },
          focusSeq: this.state.focusSeq + 1,
        });
        break;
      case 'rate-limited':
        this.update({ screen: 'load-rate-limited', announcement: '' });
        break;
      case 'failed':
        this.update({ screen: 'load-error', announcement: '' });
        break;
    }
  }

  /** The learner edited the topic: leave the "not allowed" and error states. */
  topicEdited(): void {
    if (this.state.phase === 'generating') return;
    if (this.state.topicError !== null || this.state.phase === 'not-allowed') {
      this.update({ topicError: null, phase: 'idle', announcement: '' });
    }
  }

  /** Workflow 1: the learner presses "Generate my journey". */
  async submit(raw: string): Promise<void> {
    if (this.state.phase === 'generating') return;
    const { style } = this.state;
    if (style === null) return; // the button is disabled until a style is chosen (BR33.1)
    const checked = checkTopic(raw);
    if (!checked.ok) {
      this.update({
        topicError: checked.message,
        phase: 'idle',
        announcement: checked.message,
        // Focus goes to the field in error after a submit (interaction spec, "Error shown").
        focus: { type: 'topic' },
        focusSeq: this.state.focusSeq + 1,
      });
      return;
    }
    this.lastTopic = checked.topic;
    this.lastStyle = style;
    await this.create();
  }

  /** "Try again" after a failure: look for a journey made in the last minute first. */
  async retry(): Promise<void> {
    if (this.state.phase === 'generating') return;
    const session = this.deps.session();
    if (!session.ok) {
      this.update({ screen: 'storage-blocked' });
      return;
    }
    if (this.state.phase === 'failed') {
      const recent = await this.deps.api.load(session.sessionId);
      if (recent.kind === 'rate-limited') {
        this.update({ phase: 'rate-limited', announcement: ANNOUNCE_RATE_LIMITED });
        return;
      }
      // While replacing, the stored journey may still be the old one: it is not a new result.
      const isOld =
        recent.kind === 'journey' && recent.journey.createdAt === this.state.journey?.createdAt;
      if (recent.kind === 'journey' && !isOld && this.isRecent(recent.journey)) {
        this.show(recent.journey);
        return;
      }
    }
    if (this.lastTopic) await this.create();
  }

  private isRecent(journey: Journey): boolean {
    const made = Date.parse(journey.createdAt);
    return Number.isFinite(made) && this.deps.now() - made <= RECENT_JOURNEY_MS;
  }

  private show(journey: Journey): void {
    // A new journey replaces the old one: no goal date of the old journey stays in the browser.
    this.dismissals.clearAll();
    this.enter(journey, ANNOUNCE_READY);
  }

  /** True when the journey has stages and every one of them is done (BR41.1). */
  private static allDone(completed: readonly number[], stageCount: number): boolean {
    return stageCount > 0 && completeCount(completed, stageCount) === stageCount;
  }

  /** Show a journey for the first time: the up-next stage opens and the heading gets focus. */
  private enter(journey: Journey, announcement: string): void {
    const { open } = openPanelAfter({
      kind: 'first',
      stageNumbers: journey.stages.map((stage) => stage.stageNumber),
      completed: journey.completedStages,
    });
    this.journeyGen += 1;
    // The shown set is emptied and refilled from the journey that is now on the page (BR40.2).
    this.shown = new Set(journey.milestonesShown.filter(isMilestone));
    this.milestoneBanner = null;
    this.update({
      screen: 'journey',
      phase: 'idle',
      slow: false,
      journey,
      view: JourneyController.allDone(journey.completedStages, journey.stages.length)
        ? 'completion'
        : 'journey',
      topicError: null,
      announcement,
      saving: null,
      changeError: null,
      open,
      focus: { type: 'title' },
      focusSeq: this.state.focusSeq + 1,
      dialog: null,
      replacing: false,
      note: null,
      backBusy: false,
      backError: null,
      style: null,
      goalForm: { open: false, value: '', seq: this.state.goalForm.seq + 1, error: null },
      goalSaving: false,
      goalError: null,
      today: this.localToday(),
    });
  }

  /** The learner opens or closes a stage panel; only one is open at a time (BR6.2). */
  openPanel(stage: number | null): void {
    this.update({ open: stage, focus: { type: 'none' } });
  }

  /** The learner presses "Mark stage N complete" or "Mark stage N as not complete". */
  async toggleStage(stage: number): Promise<void> {
    const { journey, saving } = this.state;
    if (saving !== null || !journey) return;
    await this.applyChange(stage, !journey.completedStages.includes(stage));
  }

  /** "Try again" after a failed change: repeat the same change. */
  async retryChange(): Promise<void> {
    if (this.state.saving !== null || !this.lastChange) return;
    await this.applyChange(this.lastChange.stage, this.lastChange.completed);
  }

  /** The "no longer saved" message's button: back to the home screen. */
  goHome(): void {
    this.journeyGen += 1;
    this.shown = new Set();
    this.milestoneBanner = null;
    this.dismissals.clearAll();
    this.update({
      screen: 'home',
      journey: null,
      view: 'journey',
      changeError: null,
      saving: null,
      open: null,
      announcement: '',
      replacing: false,
      dialog: null,
      style: null,
      goalSaving: false,
      goalError: null,
      goalForm: { open: false, value: '', seq: this.state.goalForm.seq + 1, error: null },
    });
  }

  /** "Start a new journey" or "Delete my journey": open that confirmation (BR22.1, BR23.2). */
  openDialog(kind: DialogKind): void {
    if (this.state.phase === 'generating') return;
    if (this.state.goalSaving) return; // a goal change is never in flight when the journey goes
    if (this.state.screen !== 'journey' || !this.state.journey || this.state.dialog) return;
    this.update({ dialog: { kind, busy: false, error: null } });
  }

  /** Cancel or Escape: close the confirmation and change nothing. Ignored while it works. */
  cancelDialog(): void {
    const { dialog } = this.state;
    if (!dialog || dialog.busy) return;
    this.update({ dialog: null });
  }

  /** The replace confirmation was accepted: show the topic screen; the old journey stays saved. */
  confirmReplace(): void {
    const { dialog } = this.state;
    if (!dialog || dialog.kind !== 'replace' || dialog.busy) return;
    if (this.state.phase === 'generating' || this.state.goalSaving) return;
    this.update({
      dialog: null,
      screen: 'home',
      replacing: true,
      phase: 'idle',
      slow: false,
      topicError: null,
      note: null,
      backBusy: false,
      backError: null,
      announcement: '',
      style: null,
      goalForm: { open: false, value: '', seq: this.state.goalForm.seq + 1, error: null },
      focus: { type: 'topic' },
      focusSeq: this.state.focusSeq + 1,
    });
  }

  /** The delete confirmation was accepted: delete, then show the home screen (BR23.2). */
  async confirmDelete(): Promise<void> {
    const { dialog } = this.state;
    if (!dialog || dialog.kind !== 'delete' || dialog.busy || this.state.goalSaving) return;
    const session = this.deps.session();
    if (!session.ok) {
      this.update({ dialog: null, screen: 'storage-blocked' });
      return;
    }
    this.update({ dialog: { kind: 'delete', busy: true, error: null } });
    const result = await this.deps.api.delete(session.sessionId);
    if (result.kind === 'deleted') {
      this.journeyGen += 1;
      this.shown = new Set();
      this.milestoneBanner = null;
      this.dismissals.clearAll();
      this.update({
        dialog: null,
        screen: 'home',
        journey: null,
        view: 'journey',
        replacing: false,
        phase: 'idle',
        slow: false,
        topicError: null,
        changeError: null,
        saving: null,
        open: null,
        note: null,
        style: null,
        goalSaving: false,
        goalError: null,
        goalForm: { open: false, value: '', seq: this.state.goalForm.seq + 1, error: null },
        announcement: ANNOUNCE_DELETED,
        focus: { type: 'topic' },
        focusSeq: this.state.focusSeq + 1,
      });
      return;
    }
    const error = result.kind === 'rate-limited' ? DELETE_RATE_LIMITED_TEXT : DELETE_FAILED_TEXT;
    this.update({ dialog: { kind: 'delete', busy: false, error }, announcement: error });
  }

  /** "Back to my journey" on the topic screen: load the stored journey again (BR22.2). */
  async backToJourney(): Promise<void> {
    if (this.state.backBusy || !this.state.replacing || this.state.phase === 'generating') return;
    const session = this.deps.session();
    if (!session.ok) {
      this.update({ screen: 'storage-blocked' });
      return;
    }
    this.update({ backBusy: true, backError: null });
    const result = await this.deps.api.load(session.sessionId);
    switch (result.kind) {
      case 'journey':
        this.enter(result.journey, '');
        break;
      case 'none':
        this.update({
          screen: 'home',
          journey: null,
          replacing: false,
          backBusy: false,
          style: null,
          note: NOTE_JOURNEY_GONE,
          announcement: NOTE_JOURNEY_GONE,
        });
        break;
      case 'rate-limited':
        this.update({ backBusy: false, backError: 'rate-limited' });
        break;
      case 'failed':
        this.update({ backBusy: false, backError: 'failed' });
        break;
    }
  }

  /** "Set a goal date" or "Change": open the form with the current date in it (BR31.1). */
  openGoalForm(): void {
    const { journey, goalSaving, dialog } = this.state;
    if (!journey || goalSaving || dialog) return;
    const { seq } = this.state.goalForm;
    this.update({
      goalError: null,
      goalForm: { open: true, value: journey.goalDate ?? '', seq: seq + 1, error: null },
      focus: { type: 'goal-field' },
      focusSeq: this.state.focusSeq + 1,
    });
  }

  /** Escape or closing the form: nothing is saved and focus goes back to the opener. */
  closeGoalForm(): void {
    const { goalForm, goalSaving } = this.state;
    if (!goalForm.open || goalSaving) return;
    this.update({
      goalForm: { ...goalForm, open: false, error: null },
      focus: { type: 'goal-opener' },
      focusSeq: this.state.focusSeq + 1,
    });
  }

  /** Save: check the date (BR30.1), change the page at once, then send it (BR31.1, BR31.2). */
  async saveGoal(text: string): Promise<void> {
    if (!this.canChangeGoal()) return;
    const checked = checkGoalDate(text, this.state.today);
    if (!checked.ok) {
      // Nothing is sent and what was typed is kept; focus goes to the field (BR30.1).
      this.update({
        goalForm: { ...this.state.goalForm, open: true, error: checked.message },
        announcement: checked.message,
        focus: { type: 'goal-field' },
        focusSeq: this.state.focusSeq + 1,
      });
      return;
    }
    await this.applyGoal(checked.date);
  }

  /** Clear: remove the date at once, then send that (BR31.1). */
  async clearGoal(): Promise<void> {
    if (!this.canChangeGoal()) return;
    await this.applyGoal(null);
  }

  /** "Try again" after a failed goal change: repeat the same change. */
  async retryGoal(): Promise<void> {
    const { goalError } = this.state;
    if (!this.canChangeGoal() || !this.lastGoal) return;
    if (goalError !== 'save-failed' && goalError !== 'rate-limited') return;
    await this.applyGoal(this.lastGoal.date);
  }

  /** One goal change at a time, and none while a delete runs (BR31.1, BR31.2). */
  private canChangeGoal(): boolean {
    const { journey, goalSaving, dialog } = this.state;
    if (!journey || goalSaving) return false;
    return !(dialog && dialog.kind === 'delete' && dialog.busy);
  }

  private async applyGoal(goalDate: string | null): Promise<void> {
    const { journey } = this.state;
    if (!journey) return;
    const session = this.deps.session();
    if (!session.ok) {
      this.update({ screen: 'storage-blocked' });
      return;
    }
    const before = journey.goalDate;
    const gen = this.journeyGen;
    this.lastGoal = { date: goalDate };
    // The page changes first; nothing says "saved" until the server answers (BR31.1).
    this.update({
      journey: { ...journey, goalDate },
      goalSaving: true,
      goalError: null,
      announcement: '',
      goalForm: { ...this.state.goalForm, open: false, error: null },
      focus: { type: 'goal-opener' },
      focusSeq: this.state.focusSeq + 1,
    });
    const result = await this.deps.api.setGoal(session.sessionId, goalDate);
    if (gen !== this.journeyGen) return; // that journey is no longer on the page: drop the answer
    const current = this.state.journey;
    if (!current) return;
    if (result.kind === 'saved') {
      this.update({
        journey: { ...current, goalDate: result.goalDate },
        goalSaving: false,
        announcement: result.goalDate === null ? ANNOUNCE_GOAL_CLEARED : ANNOUNCE_GOAL_SAVED,
      });
      return;
    }
    // Every failure puts the old value back and never claims a save (BR31.2, BR31.3).
    const restored = { journey: { ...current, goalDate: before }, goalSaving: false };
    if (result.kind === 'invalid-request') {
      this.update({
        ...restored,
        goalForm: {
          open: true,
          value: before ?? '',
          seq: this.state.goalForm.seq + 1,
          error: GOAL_INVALID_TEXT,
        },
        announcement: GOAL_INVALID_TEXT,
        focus: { type: 'goal-field' },
        focusSeq: this.state.focusSeq + 1,
      });
      return;
    }
    const kind: GoalErrorKind =
      result.kind === 'not-found'
        ? 'gone'
        : result.kind === 'rate-limited'
          ? 'rate-limited'
          : 'save-failed';
    this.update({
      ...restored,
      goalError: kind,
      announcement:
        kind === 'gone'
          ? CHANGE_GONE_TEXT
          : kind === 'rate-limited'
            ? ANNOUNCE_RATE_LIMITED
            : GOAL_FAILED_TEXT,
    });
  }

  private async applyChange(stage: number, completed: boolean): Promise<void> {
    const { journey } = this.state;
    if (this.state.saving !== null || !journey) return;
    const session = this.deps.session();
    if (!session.ok) {
      this.update({ screen: 'storage-blocked' });
      return;
    }
    const stageNumbers = journey.stages.map((s) => s.stageNumber);
    const before = journey.completedStages;
    const others = before.filter((n) => n !== stage);
    const optimistic = completed ? [...others, stage].sort((a, b) => a - b) : others;
    const kind = completed ? 'mark' : 'unmark';
    const decision = openPanelAfter({ kind, pressed: stage, stageNumbers, completed: optimistic });
    this.lastChange = { stage, completed };
    const gen = this.journeyGen;
    this.update({
      journey: { ...journey, completedStages: optimistic },
      saving: stage,
      changeError: null,
      open: decision.open,
      focus: decision.focus,
      focusSeq: this.state.focusSeq + 1,
    });

    const result = await this.deps.api.setCompletion(session.sessionId, stage, completed);
    if (gen !== this.journeyGen) return;
    if (result.kind === 'completed') {
      const list = [...new Set(result.completedStages)].sort((a, b) => a - b);
      const settled = openPanelAfter({ kind, pressed: stage, stageNumbers, completed: list });
      const moved = settled.open !== decision.open;
      // The milestone check runs only after a confirmed mark (BR40.1): never after an unmark.
      const plan = completed ? this.planAfterMark(list, journey.stages.length) : null;
      const arrives =
        JourneyController.allDone(list, journey.stages.length) && this.state.view !== 'completion';
      this.update({
        journey: { ...(this.state.journey ?? journey), completedStages: list },
        // Any confirmed stage change resets the view (BR41.1).
        view: JourneyController.allDone(list, journey.stages.length) ? 'completion' : 'journey',
        saving: null,
        announcement: this.describe(stage, completed, list, journey.stages.length, settled.open),
        ...(moved ? { open: settled.open, focus: settled.focus } : {}),
        ...(moved ? { focusSeq: this.state.focusSeq + 1 } : {}),
        // Arriving at the completion view puts focus on its "Journey complete" heading.
        ...(arrives
          ? { focus: { type: 'complete-heading' } as const, focusSeq: this.state.focusSeq + 1 }
          : {}),
      });
      if (plan) await this.recordMilestones(session.sessionId, gen, plan);
      return;
    }
    const failure = openPanelAfter({
      kind: 'failure',
      pressed: stage,
      stageNumbers,
      completed: before,
    });
    const error: Record<Exclude<CompletionResult['kind'], 'completed'>, ChangeErrorKind> = {
      'not-found': 'gone',
      'invalid-request': 'changed',
      'rate-limited': 'rate-limited',
      'save-failed': 'save-failed',
      failed: 'save-failed',
    };
    const kindOfError = error[result.kind];
    this.update({
      journey: { ...(this.state.journey ?? journey), completedStages: before },
      saving: null,
      changeError: { stage, kind: kindOfError },
      open: failure.open,
      focus: failure.focus,
      focusSeq: this.state.focusSeq + 1,
      announcement:
        kindOfError === 'gone'
          ? CHANGE_GONE_TEXT
          : kindOfError === 'changed'
            ? CHANGE_CHANGED_TEXT
            : kindOfError === 'rate-limited'
              ? ANNOUNCE_RATE_LIMITED
              : CHANGE_FAILED_TEXT,
    });
  }

  /**
   * After a confirmed mark: work out which milestone to show and which to record quietly. Every
   * newly reached one joins the shown set at once, before any call, so a banner is never shown
   * twice and a failed recording never brings one back in this visit (BR40.1 to BR40.3).
   */
  private planAfterMark(list: readonly number[], stageCount: number): Milestone[] {
    const done = completeCount(list, stageCount);
    const plan = planMilestones(done, stageCount, this.shown);
    for (const milestone of plan.toRecord) this.shown.add(milestone);
    if (plan.toShow !== null) this.milestoneBanner = plan.toShow;
    return plan.toRecord;
  }

  /** Record the milestones one call each, lowest first; every failure is quiet (BR44.2). */
  private async recordMilestones(
    sessionId: string,
    gen: number,
    milestones: readonly Milestone[],
  ): Promise<void> {
    for (const milestone of milestones) {
      const result: MilestoneResult = await this.deps.api.recordMilestone(sessionId, milestone);
      if (gen !== this.journeyGen) return; // that journey is no longer on the page: drop it
      if (result.kind !== 'saved') continue; // nothing is said and the banner stays as it is
      for (const name of result.milestonesShown) if (isMilestone(name)) this.shown.add(name);
    }
  }

  private describe(
    stage: number,
    completed: boolean,
    list: number[],
    stageCount: number,
    open: number | null,
  ): string {
    const count = completeCount(list, stageCount);
    const figures = `${count} of ${stageCount} stages complete, ${percent(count, stageCount)} percent.`;
    if (!completed) return `Stage ${stage} marked as not complete. ${figures}`;
    return open === null
      ? `Stage ${stage} complete. ${figures}`
      : `Stage ${stage} complete. ${figures} Stage ${open} is open.`;
  }

  private async create(): Promise<void> {
    const session = this.deps.session();
    if (!session.ok) {
      this.update({ screen: 'storage-blocked' });
      return;
    }
    this.update({
      phase: 'generating',
      slow: false,
      topicError: null,
      announcement: ANNOUNCE_GENERATING,
    });
    this.slowTimer = this.deps.setTimer(() => {
      if (this.state.phase === 'generating') this.update({ slow: true });
    }, SLOW_AFTER_MS);
    const result = await this.deps.api.create(session.sessionId, this.lastTopic, this.lastStyle);
    this.deps.clearTimer(this.slowTimer);
    switch (result.kind) {
      case 'journey':
        this.show(result.journey);
        break;
      case 'topic-invalid':
        this.update({
          phase: 'idle',
          slow: false,
          topicError: 'Enter a topic between 2 and 100 characters.',
          announcement: 'Enter a topic between 2 and 100 characters.',
        });
        break;
      case 'not-allowed':
        this.update({ phase: 'not-allowed', slow: false, announcement: ANNOUNCE_NOT_ALLOWED });
        break;
      case 'rate-limited':
        this.update({ phase: 'rate-limited', slow: false, announcement: ANNOUNCE_RATE_LIMITED });
        break;
      case 'daily-limit':
        this.update({
          phase: 'daily-limit',
          slow: false,
          announcement: this.state.journey
            ? `${DAILY_LIMIT_TEXT} ${DAILY_LIMIT_KEPT_TEXT}`
            : DAILY_LIMIT_TEXT,
        });
        break;
      case 'failed':
        this.update({ phase: 'failed', slow: false, announcement: ANNOUNCE_FAILED });
        break;
    }
  }
}
