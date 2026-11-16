/** Wires the page: the controller, the API client, the session and the drawing code. */

import {
  createJourney,
  deleteJourney,
  loadJourney,
  recordMilestone,
  setGoalDate,
  setStageCompletion,
  type FetchLike,
} from './api';
import { clearCertificateName, printCertificate, setCertificateName } from './certificate';
import { ConfirmDialog, findDialogElements } from './confirm-dialog';
import type { NudgeStorage } from './nudge';
import { applyFocus, findElements, renderJourney, renderState, STYLE_KEYS } from './render';
import { getSession } from './session';
import { JourneyController, type ControllerDeps } from './state';

export interface MountDeps {
  fetch: FetchLike;
  getStorage: () => Pick<Storage, 'getItem' | 'setItem'>;
  /** Storage for the nudge dismissals; when absent or blocked they live in page memory only. */
  getNudgeStorage?: () => NudgeStorage | null;
  /** Opens the browser's print dialog; defaults to the window's own. */
  print?: () => void;
  now?: () => number;
  setTimer?: ControllerDeps['setTimer'];
  clearTimer?: ControllerDeps['clearTimer'];
}

/** Start the page in `doc`. Returns the controller so callers (and tests) can drive it. */
export function mount(doc: Document, deps: MountDeps): JourneyController {
  const els = findElements(doc);
  const apiDeps = { fetch: deps.fetch };
  const controller = new JourneyController({
    api: {
      create: (sessionId, topic, style) => createJourney(apiDeps, sessionId, topic, style),
      load: (sessionId) => loadJourney(apiDeps, sessionId),
      setCompletion: (sessionId, stageNumber, completed) =>
        setStageCompletion(apiDeps, sessionId, stageNumber, completed),
      delete: (sessionId) => deleteJourney(apiDeps, sessionId),
      setGoal: (sessionId, goalDate) => setGoalDate(apiDeps, sessionId, goalDate),
      recordMilestone: (sessionId, milestone) => recordMilestone(apiDeps, sessionId, milestone),
    },
    session: () => getSession(deps.getStorage),
    now: deps.now ?? (() => Date.now()),
    setTimer: deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms)),
    clearTimer: deps.clearTimer ?? ((handle) => clearTimeout(handle as number)),
    ...(deps.getNudgeStorage ? { nudgeStorage: deps.getNudgeStorage } : {}),
  });

  const handlers = {
    openPanel: (stage: number | null) => controller.openPanel(stage),
    toggleStage: (stage: number) => void controller.toggleStage(stage),
    retryChange: () => void controller.retryChange(),
    goHome: () => controller.goHome(),
    reload: () => void controller.start(),
  };

  // The Details disclosure is open on wide screens and starts closed under 768 pixels.
  const wide = doc.defaultView?.matchMedia?.('(min-width: 768px)');
  if (wide) {
    els.headerDetails.open = wide.matches;
    wide.addEventListener?.('change', (event) => {
      els.headerDetails.open = event.matches;
    });
  }

  // A browser that shows a plain text box for a date field needs the format hint (BR31.1).
  els.goalInput.type = 'date';
  els.goalFormatHint.hidden = els.goalInput.type === 'date';

  const dialog = new ConfirmDialog(findDialogElements(doc), {
    cancel: () => controller.cancelDialog(),
    confirm: (kind) =>
      kind === 'delete' ? void controller.confirmDelete() : controller.confirmReplace(),
  });

  let focusSeq = 0;
  // The certificate name lives only in the field and on the certificate: it is emptied whenever
  // the journey on the page changes, and a reload clears it (BR41.2).
  let certificateJourney: string | null = null;
  controller.subscribe((state) => {
    renderState(els, state);
    dialog.sync(state.dialog, state.journey?.topic ?? '');
    const journeyKey = state.journey?.createdAt ?? null;
    if (journeyKey !== certificateJourney) {
      certificateJourney = journeyKey;
      clearCertificateName(els.certificate);
    }
    if (state.screen === 'journey' && state.journey) {
      renderJourney(doc, els, state, handlers);
      if (state.focusSeq !== focusSeq) {
        focusSeq = state.focusSeq;
        applyFocus(doc, els, state.focus);
      }
    } else if (state.screen === 'home' && state.focus.type === 'topic') {
      if (state.focusSeq !== focusSeq) {
        focusSeq = state.focusSeq;
        applyFocus(doc, els, state.focus);
      }
    }
  });

  const openDialog = (button: HTMLElement, kind: 'replace' | 'delete') => {
    dialog.setOpener(button);
    controller.openDialog(kind);
  };
  els.startNew.addEventListener('click', () => openDialog(els.startNew, 'replace'));
  els.deleteMine.addEventListener('click', () => openDialog(els.deleteMine, 'delete'));
  els.back.addEventListener('click', () => void controller.backToJourney());
  els.backRetry.addEventListener('click', () => void controller.backToJourney());

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    void controller.submit(els.input.value);
  });
  els.input.addEventListener('input', () => controller.topicEdited());
  STYLE_KEYS.forEach((key, index) => {
    els.styleRadios[index]?.addEventListener('change', () => controller.chooseStyle(key));
  });

  els.goalButton.addEventListener('click', () => controller.openGoalForm());
  els.goalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void controller.saveGoal(els.goalInput.value);
  });
  els.goalClear.addEventListener('click', () => void controller.clearGoal());
  els.goalForm.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      controller.closeGoalForm();
    }
  });
  els.goalRetry.addEventListener('click', () => void controller.retryGoal());
  els.goalHome.addEventListener('click', () => controller.goHome());
  // The goal state is worked out again when the tab shows again, so a page left open stays right.
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') controller.refreshToday();
  });
  els.retry.addEventListener('click', () => void controller.retry());
  els.messageRetry.addEventListener('click', () => void controller.start());

  els.bannerDismiss.addEventListener('click', () => controller.dismissBanner());
  const cert = els.certificate;
  cert.nameInput.addEventListener('input', () => setCertificateName(cert, cert.nameInput.value));
  cert.print.addEventListener('click', () =>
    printCertificate(deps.print ?? (() => doc.defaultView?.print())),
  );
  cert.back.addEventListener('click', () => controller.showJourneyView());

  void controller.start();
  return controller;
}
