import { afterEach, describe, expect, it } from 'vitest';
import { STATE_CASES, boot, journeyOf, q, tick } from './a11y-states';
import { modalCalls } from './helpers';

/**
 * jsdom has no layout, no real Tab key and no `showModal()` focus trap. These tests therefore
 * check what the page declares (native controls, tab order, focus targets after each action).
 * The visible focus ring, the dialog focus trap and the inert page are in the manual script.
 */

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/** Controls in document order that a learner can reach with Tab right now. */
function tabOrder(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.closest('[hidden]')) return false;
    if (el.closest('dialog') && !el.closest('dialog[open]')) return false;
    if ((el as HTMLButtonElement).disabled) return false;
    const tabindex = el.getAttribute('tabindex');
    return tabindex === null || Number(tabindex) >= 0;
  });
}

const typeText = (id: string, value: string) => {
  const input = q(id) as HTMLInputElement;
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const submit = async (id: string) => {
  q(id).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await tick();
};
const press = (id: string) => {
  const el = q(id);
  el.focus();
  expect(document.activeElement, `${id} can take focus`).toBe(el);
  el.click(); // Enter or Space on a native button is exactly this
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('skip link and tab order (AC8.1.3)', () => {
  const screens = STATE_CASES.filter((c) =>
    [
      'S1 home: empty',
      'loading',
      'load error',
      'S2 journey: first stage up next, open',
      'S5 completion: without a name',
    ].includes(c.name),
  );

  it.each(screens)('makes the skip link the first stop on: $name', async ({ run }) => {
    await run();
    expect(tabOrder()[0]).toBe(q('skip-link'));
  });

  it('points the skip link at a main region that can take focus', async () => {
    await boot();
    const main = document.getElementById('main')!;
    expect(q('skip-link').getAttribute('href')).toBe('#main');
    expect(main.tagName).toBe('MAIN');
    main.focus();
    expect(document.activeElement).toBe(main);
  });

  it('keeps the skip link before the header and every other control', async () => {
    await boot();
    const order = tabOrder();
    const header = document.querySelector('header')!;
    expect(order.indexOf(q('skip-link'))).toBe(0);
    expect(order.filter((el) => header.contains(el))).toEqual([]); // the site name is not a control
  });

  it('uses no positive tabindex anywhere, so Tab follows the visual order', async () => {
    await boot();
    const positive = [...document.querySelectorAll('[tabindex]')].filter(
      (el) => Number(el.getAttribute('tabindex')) > 0,
    );
    expect(positive).toEqual([]);
  });

  it('uses native controls for every action, so Enter and Space work', async () => {
    await boot();
    const clickable = [
      'generate-button',
      'stage-toggle-1',
      'complete-button-1',
      'goal-button',
      'start-new-button',
      'delete-button',
      'confirm-cancel',
      'confirm-ok',
      'certificate-print-button',
      'certificate-back-button',
      'goal-clear-button',
    ];
    for (const id of clickable) expect(q(id).tagName, id).toBe('BUTTON');
    expect(q('goal-save-button').tagName).toBe('BUTTON');
    expect(q('topic-input').tagName).toBe('INPUT');
    expect(q('header-details-summary').tagName).toBe('SUMMARY');
  });
});

describe('the main flow with keyboard activation (AC8.1.1)', () => {
  it('goes from topic to a generated journey, then through a stage, the goal form and the dialogs', async () => {
    await boot({ stored: null });
    // Home: focus starts on the topic field (interaction spec: page load, Home).
    expect(document.activeElement).toBe(q('topic-input'));

    typeText('topic-input', 'Rust');
    press('style-guide');
    expect((q('generate-button') as HTMLButtonElement).disabled).toBe(false);
    await submit('topic-form');

    // Journey generated: focus on the h1.
    expect(q('journey-screen').hidden).toBe(false);
    expect(document.activeElement).toBe(q('journey-title'));

    // Open another stage: focus stays on the heading button that was activated.
    press('stage-toggle-3');
    expect(q('stage-toggle-3').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(q('stage-toggle-3'));

    // Mark the first stage: focus goes to the heading of the stage that opens next.
    press('stage-toggle-1');
    press('complete-button-1');
    await tick();
    expect(q('stage-status-1').textContent).toBe('Done');
    expect(document.activeElement).toBe(q('stage-heading-2'));

    // Unmark: focus stays on the button, which now reads "Mark stage 1 complete".
    press('stage-toggle-1');
    press('complete-button-1');
    await tick();
    expect(q('complete-button-1').textContent).toBe('Mark stage 1 complete');
    expect(document.activeElement).toBe(q('complete-button-1'));

    // Goal form: open, field focused, save, focus back on the opener.
    press('goal-button');
    expect(document.activeElement).toBe(q('goal-input'));
    typeText('goal-input', '2026-12-01');
    await submit('goal-form');
    expect(q('goal-text').textContent).toContain('2026-12-01'.slice(0, 4));
    expect(document.activeElement).toBe(q('goal-button'));

    // Clear it again.
    press('goal-button');
    press('goal-clear-button');
    await tick();
    expect(document.activeElement).toBe(q('goal-button'));
  });

  it('closes the goal form with Escape and returns focus to its opener', async () => {
    await boot();
    press('goal-button');
    expect(document.activeElement).toBe(q('goal-input'));
    q('goal-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(q('goal-form').hidden).toBe(true);
    expect(document.activeElement).toBe(q('goal-button'));
  });

  it('dismisses a banner by keyboard and puts focus on the page heading', async () => {
    await boot({ stored: journeyOf(5, [], '2026-11-12') });
    expect(q('banner').hidden).toBe(false);
    expect(tabOrder()).toContain(q('banner-dismiss'));
    press('banner-dismiss');
    expect(q('banner').hidden).toBe(true);
    expect(document.activeElement).toBe(q('journey-title'));
  });

  it('shows a milestone banner without taking focus from the stage heading', async () => {
    await boot();
    press('complete-button-1');
    await tick();
    expect(q('banner').getAttribute('data-kind')).toBe('milestone');
    expect(document.activeElement).toBe(q('stage-heading-2'));
  });

  it('reaches the completion view, the certificate controls and Back to my journey', async () => {
    await boot({
      stored: journeyOf(5, [1, 2, 3, 4], null, { milestonesShown: ['first-stage', 'halfway'] }),
    });
    press('complete-button-5');
    await tick();
    expect(q('journey-title').textContent).toBe('Journey complete');
    expect(document.activeElement).toBe(q('journey-title'));
    const order = tabOrder();
    for (const id of [
      'certificate-name-input',
      'certificate-print-button',
      'certificate-back-button',
    ]) {
      expect(order, id).toContain(q(id));
    }
    typeText('certificate-name-input', 'Alex Example');
    press('certificate-back-button');
    expect(q('certificate-section').hidden).toBe(true);
    expect(document.activeElement).toBe(q('journey-title'));
  });

  it('restores a saved journey with focus on its h1', async () => {
    await boot();
    expect(document.activeElement).toBe(q('journey-title'));
  });

  it('moves focus to the topic field after a rejected topic is submitted', async () => {
    await boot({ stored: null });
    typeText('topic-input', '!!!!');
    press('style-guide');
    q('generate-button').focus();
    await submit('topic-form');
    expect(q('topic-error').hidden).toBe(false);
    expect(document.activeElement).toBe(q('topic-input'));
    expect((q('topic-input') as HTMLInputElement).value).toBe('!!!!');
  });

  it('does not move focus or change the page while a topic is being typed', async () => {
    await boot({ stored: null });
    typeText('topic-input', 'R');
    expect(q('topic-error').hidden).toBe(true);
    expect(document.activeElement).toBe(q('topic-input'));
    expect(q('home-screen').hidden).toBe(false);
  });
});

describe('dialogs (AC8.1.2)', () => {
  it.each([
    ['delete-button', 'Delete your journey?'],
    ['start-new-button', 'Start a new journey?'],
  ])('opens from %s with showModal, labels and Cancel focused', async (opener, title) => {
    await boot();
    const before = modalCalls.showModal;
    press(opener);
    const dialog = q('confirm-dialog');
    expect(modalCalls.showModal).toBe(before + 1);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(q('confirm-title').textContent).toBe(title);
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-text');
    expect(q('confirm-text').textContent).toContain('Rust');
    expect(document.activeElement).toBe(q('confirm-cancel'));
    // Cancel comes before the confirm button.
    const order = tabOrder();
    expect(order.indexOf(q('confirm-cancel'))).toBeLessThan(order.indexOf(q('confirm-ok')));
  });

  it.each(['delete-button', 'start-new-button'])(
    'closes on Escape and returns focus to %s',
    async (opener) => {
      await boot();
      press(opener);
      q('confirm-dialog').dispatchEvent(new Event('cancel', { cancelable: true })); // what Escape fires
      expect(q('confirm-dialog').hasAttribute('open')).toBe(false);
      expect(document.activeElement).toBe(q(opener));
    },
  );

  it.each(['delete-button', 'start-new-button'])(
    'closes on Cancel and returns focus to %s',
    async (opener) => {
      await boot();
      press(opener);
      press('confirm-cancel');
      expect(q('confirm-dialog').hasAttribute('open')).toBe(false);
      expect(document.activeElement).toBe(q(opener));
    },
  );

  it('confirms the replace dialog by keyboard and lands on the topic field', async () => {
    await boot();
    press('start-new-button');
    press('confirm-ok');
    await tick();
    expect(q('home-screen').hidden).toBe(false);
    expect(document.activeElement).toBe(q('topic-input'));
  });

  it('confirms the delete dialog by keyboard and lands on the topic field', async () => {
    const page = await boot();
    press('delete-button');
    press('confirm-ok');
    await tick();
    expect(page.calls.some((c) => c.method === 'DELETE')).toBe(true);
    expect(q('home-screen').hidden).toBe(false);
    expect(document.activeElement).toBe(q('topic-input'));
  });
});

describe('the Details disclosure (AC8.1.1, narrow screens)', () => {
  it('is a native details element with a summary that can take focus and reports its state', async () => {
    await boot();
    const details = q('header-details') as HTMLDetailsElement;
    const summary = q('header-details-summary');
    expect(details.tagName).toBe('DETAILS');
    expect(summary.parentElement).toBe(details);
    expect(tabOrder()).toContain(summary);
    summary.focus();
    expect(document.activeElement).toBe(summary);
    expect(details.open).toBe(true);
    details.open = false;
    expect(details.open).toBe(false);
    details.open = true;
    expect(details.open).toBe(true);
  });

  it('keeps the goal button inside Details, so it is reached in two steps when collapsed', async () => {
    await boot();
    expect(q('header-details').contains(q('goal-button'))).toBe(true);
    expect(q('goal-button').getAttribute('aria-controls')).toBe('goal-form');
    expect(q('goal-button').getAttribute('aria-expanded')).toBe('false');
    press('goal-button');
    expect(q('goal-button').getAttribute('aria-expanded')).toBe('true');
  });
});

describe('no keyboard trap and no timeouts (AC8.1.1, O4, O8)', () => {
  it('leaves nothing in the page that holds focus: Escape inside the topic field changes nothing', async () => {
    await boot({ stored: null });
    q('topic-input').focus();
    q('topic-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(q('topic-input'));
  });

  it('shows no open dialog on any screen unless a dialog was asked for', async () => {
    await boot();
    expect(q('confirm-dialog').hasAttribute('open')).toBe(false);
  });
});
