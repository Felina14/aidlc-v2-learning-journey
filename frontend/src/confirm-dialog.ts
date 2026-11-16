/**
 * The confirmation dialog shared by "Start a new journey" and "Delete my journey" (BR24.1).
 *
 * A native `dialog` opened with `showModal()`: focus is trapped and the page behind is inert.
 * Cancel comes first and takes the initial focus; Escape cancels; the confirm button shows
 * "Working…" and ignores a second press. All wording is set with `textContent`, never as markup.
 */

import type { DialogKind, DialogState } from './state';

export const WORKING_TEXT = 'Working…';

interface DialogWording {
  title: string;
  text: (topic: string) => string;
  confirm: string;
}

export const WORDING: Record<DialogKind, DialogWording> = {
  replace: {
    title: 'Start a new journey?',
    text: (topic) =>
      `Your current journey about ${topic} and its progress will be replaced once your new ` +
      'journey is ready. Until then it stays saved.',
    confirm: 'Replace journey',
  },
  delete: {
    title: 'Delete your journey?',
    text: (topic) =>
      `This deletes your ${topic} journey, your progress and your goal date. ` +
      "It can't be undone.",
    confirm: 'Delete journey',
  },
};

export interface DialogElements {
  dialog: HTMLDialogElement;
  title: HTMLElement;
  text: HTMLElement;
  error: HTMLElement;
  cancel: HTMLButtonElement;
  confirm: HTMLButtonElement;
}

export interface DialogHandlers {
  cancel(): void;
  confirm(kind: DialogKind): void;
}

export function findDialogElements(doc: Document): DialogElements {
  const t = <T extends HTMLElement>(id: string) => {
    const found = doc.querySelector<T>(`[data-testid="${id}"]`);
    if (!found) throw new Error(`missing element ${id}`);
    return found;
  };
  return {
    dialog: t<HTMLDialogElement>('confirm-dialog'),
    title: t('confirm-title'),
    text: t('confirm-text'),
    error: t('confirm-error'),
    cancel: t<HTMLButtonElement>('confirm-cancel'),
    confirm: t<HTMLButtonElement>('confirm-ok'),
  };
}

function openModal(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeModal(dialog: HTMLDialogElement): void {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

/** Keeps the dialog in step with the state and returns focus to the opener when it closes. */
export class ConfirmDialog {
  private opener: HTMLElement | null = null;
  private kind: DialogKind | null = null;

  constructor(
    private readonly els: DialogElements,
    private readonly handlers: DialogHandlers,
  ) {
    els.cancel.addEventListener('click', () => handlers.cancel());
    els.confirm.addEventListener('click', () => {
      // A second press while the work runs is ignored (BR24.1).
      if (this.kind && els.confirm.getAttribute('aria-disabled') !== 'true') {
        handlers.confirm(this.kind);
      }
    });
    // Escape fires `cancel`: the controller decides, so a busy dialog is not closed under it.
    els.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      handlers.cancel();
    });
  }

  /** The control that opened the dialog; focus returns to it on close. */
  setOpener(opener: HTMLElement | null): void {
    this.opener = opener;
  }

  /** Show, update or close the dialog to match the state. */
  sync(dialog: DialogState | null, topic: string): void {
    const { els } = this;
    if (!dialog) {
      this.kind = null;
      if (els.dialog.open) {
        closeModal(els.dialog);
        this.opener?.focus();
      }
      return;
    }
    const wording = WORDING[dialog.kind];
    const opening = !els.dialog.open;
    this.kind = dialog.kind;
    els.title.textContent = wording.title;
    els.text.textContent = wording.text(topic);
    els.confirm.textContent = dialog.busy ? WORKING_TEXT : wording.confirm;
    els.confirm.setAttribute('aria-disabled', String(dialog.busy));
    els.confirm.setAttribute('aria-busy', String(dialog.busy));
    els.error.textContent = dialog.error ? `⚠ ${dialog.error}` : '';
    els.error.hidden = dialog.error === null;
    if (opening) {
      openModal(els.dialog);
      els.cancel.focus();
    }
  }
}
