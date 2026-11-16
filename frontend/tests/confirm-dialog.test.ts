import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, WORKING_TEXT, findDialogElements } from '../src/confirm-dialog';
import { loadPage, modalCalls } from './helpers';

beforeEach(() => loadPage());

function setup() {
  const els = findDialogElements(document);
  const handlers = { cancel: vi.fn(), confirm: vi.fn() };
  const dialog = new ConfirmDialog(els, handlers);
  const opener = document.createElement('button');
  document.body.append(opener);
  dialog.setOpener(opener);
  return { els, handlers, dialog, opener };
}

describe('confirmation dialog (BR24.1)', () => {
  it('opens as a modal, labelled and described, with Cancel first and focused', () => {
    const { els, dialog } = setup();
    dialog.sync({ kind: 'delete', busy: false, error: null }, 'Rust');
    expect(modalCalls.showModal).toBe(1);
    expect(els.dialog.open).toBe(true);
    expect(els.dialog.getAttribute('aria-labelledby')).toBe('confirm-title');
    expect(els.dialog.getAttribute('aria-describedby')).toBe('confirm-text');
    expect(els.title.textContent).toBe('Delete your journey?');
    expect(els.text.textContent).toContain('Rust');
    expect(document.activeElement).toBe(els.cancel);
    const buttons = [...els.dialog.querySelectorAll('button')];
    expect(buttons[0]).toBe(els.cancel);
    expect(buttons[buttons.length - 1]).toBe(els.confirm);
    expect(els.confirm.textContent).toBe('Delete journey');
  });

  it('uses the replace wording for the new-journey confirmation', () => {
    const { els, dialog } = setup();
    dialog.sync({ kind: 'replace', busy: false, error: null }, 'Rust');
    expect(els.title.textContent).toBe('Start a new journey?');
    expect(els.confirm.textContent).toBe('Replace journey');
    expect(els.text.textContent).toContain('Rust');
  });

  it('shows the topic as plain text, never as markup', () => {
    const { els, dialog } = setup();
    dialog.sync({ kind: 'replace', busy: false, error: null }, '<script>alert(1)</script>');
    expect(els.dialog.querySelector('script')).toBeNull();
    expect(els.text.textContent).toContain('<script>alert(1)</script>');
  });

  it('Cancel and Escape both ask for a cancel; Escape is not closed by the browser', () => {
    const { els, handlers, dialog } = setup();
    dialog.sync({ kind: 'delete', busy: false, error: null }, 'Rust');
    els.cancel.click();
    const escape = new Event('cancel', { cancelable: true });
    els.dialog.dispatchEvent(escape);
    expect(handlers.cancel).toHaveBeenCalledTimes(2);
    expect(escape.defaultPrevented).toBe(true);
    expect(els.dialog.open).toBe(true); // closing is the controller's decision
  });

  it('confirm passes the kind, and shows Working... and ignores a second press when busy', () => {
    const { els, handlers, dialog } = setup();
    dialog.sync({ kind: 'delete', busy: false, error: null }, 'Rust');
    els.confirm.click();
    expect(handlers.confirm).toHaveBeenCalledWith('delete');
    dialog.sync({ kind: 'delete', busy: true, error: null }, 'Rust');
    expect(els.confirm.textContent).toBe(WORKING_TEXT);
    expect(els.confirm.getAttribute('aria-busy')).toBe('true');
    els.confirm.click();
    expect(handlers.confirm).toHaveBeenCalledTimes(1);
  });

  it('shows an error inside the dialog and keeps it open', () => {
    const { els, dialog } = setup();
    dialog.sync({ kind: 'delete', busy: false, error: 'It failed.' }, 'Rust');
    expect(els.error.hidden).toBe(false);
    expect(els.error.textContent).toContain('It failed.');
    expect(els.error.getAttribute('role')).toBe('status');
    expect(modalCalls.showModal).toBe(1);
    dialog.sync({ kind: 'delete', busy: false, error: 'It failed.' }, 'Rust');
    expect(modalCalls.showModal).toBe(1); // updating does not reopen
  });

  it('closes and returns focus to the opener', () => {
    const { els, dialog, opener } = setup();
    dialog.sync({ kind: 'replace', busy: false, error: null }, 'Rust');
    dialog.sync(null, 'Rust');
    expect(els.dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
    dialog.sync(null, 'Rust'); // already closed: nothing happens
    expect(modalCalls.close).toBe(1);
  });

  it('ignores a confirm press when no dialog is open', () => {
    const { els, handlers } = setup();
    els.confirm.click();
    expect(handlers.confirm).not.toHaveBeenCalled();
  });
});
