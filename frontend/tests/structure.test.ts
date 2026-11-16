import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { STATE_CASES, boot, journeyOf, q, tick } from './a11y-states';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

/** Elements the learner can currently perceive: not inside a hidden ancestor. */
const shown = (selector: string): HTMLElement[] =>
  [...document.querySelectorAll<HTMLElement>(selector)].filter(
    (el) => !el.closest('[hidden]') && !(el.closest('dialog') && !el.closest('dialog[open]')),
  );

/** The states that put a different screen or dialog on the page. */
const SCREEN_CASES = STATE_CASES.filter((c) =>
  [
    'S1 home: empty',
    'S1 home: style chosen',
    'loading',
    'load error',
    'S2 journey: first stage up next, open',
    'S2 journey: goal upcoming',
    'S3 banner: nudge, due today',
    'S4 dialog: delete confirmation',
    'S4 dialog: replace confirmation',
    'S5 completion: without a name',
    'S5 completion: Back to my journey view',
  ].includes(c.name),
);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('static page structure (index.html)', () => {
  it('declares the page language and a title', () => {
    expect(/<html[^>]*\slang="en"/.test(html)).toBe(true);
    expect(/<title>[^<]+<\/title>/.test(html)).toBe(true);
  });

  it('has exactly one header, one main and one footer', async () => {
    await boot();
    expect(document.querySelectorAll('header')).toHaveLength(1);
    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelectorAll('footer')).toHaveLength(1);
  });

  it('has unique ids in the static markup', async () => {
    await boot();
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('puts the skip link first, pointing at the main region', async () => {
    await boot();
    const link = q('skip-link');
    expect(link.getAttribute('href')).toBe('#main');
    expect(document.getElementById('main')).not.toBeNull();
  });
});

describe.each(SCREEN_CASES)('page structure in state: $name', ({ run }) => {
  it('shows one h1 and no skipped heading levels', async () => {
    await run();
    const h1 = shown('h1');
    expect(h1.map((h) => h.id)).toHaveLength(1);
    const levels = shown('h1, h2, h3, h4, h5, h6').map((h) => Number(h.tagName[1]));
    const skips = levels.filter((level, i) => i > 0 && level - levels[i - 1]! > 1);
    expect(skips, `heading levels in order: ${levels.join(',')}`).toEqual([]);
  });

  it('keeps ids unique', async () => {
    await run();
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('points every aria reference at an element that exists', async () => {
    await run();
    const refs = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns'];
    const missing: string[] = [];
    for (const attr of refs) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        for (const id of el.getAttribute(attr)!.split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(id)) missing.push(`${attr}="${id}" on ${el.tagName}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('has exactly two page live regions, both polite, and none assertive', async () => {
    await run();
    const live = [
      ...document.querySelectorAll(
        '[aria-live], [role="status"], [role="alert"], [role="log"], output',
      ),
    ].filter((el) => !el.closest('dialog'));
    expect(live.map((el) => el.id).sort()).toEqual(['banner-area', 'live-region']);
    for (const el of live) expect(el.getAttribute('aria-live')).toBe('polite');
    expect(document.querySelectorAll('[role="alert"], [aria-live="assertive"]')).toHaveLength(0);
  });

  it('gives every visible form field a label', async () => {
    await run();
    const unlabelled = shown('input, select, textarea')
      .filter((el) => (el as HTMLInputElement).type !== 'hidden')
      .filter((el) => {
        const labelled = el.id && document.querySelector(`label[for="${el.id}"]`);
        return !labelled && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby');
      });
    expect(unlabelled.map((el) => el.id)).toEqual([]);
  });
});

describe('the dialog error line', () => {
  it('is a polite status line, never an assertive alert', async () => {
    await boot({
      deleteReply: { status: 500, body: { error: { code: 'SAVE_FAILED', message: 'x' } } },
    });
    q('delete-button').click();
    q('confirm-ok').click();
    await tick();
    const line = q('confirm-error');
    expect(line.hidden).toBe(false);
    expect(line.getAttribute('role')).toBe('status');
    expect(line.getAttribute('aria-live')).not.toBe('assertive');
    // It is the only live region inside the dialog: the page's own two are inert while it is open.
    expect(
      document.querySelectorAll('dialog [role="alert"], dialog [aria-live="assertive"]'),
    ).toHaveLength(0);
    expect(document.querySelectorAll('dialog [role="status"]')).toHaveLength(1);
  });
});

describe('stage buttons and the progress element', () => {
  it('gives every stage button aria-expanded, which changes on open and close', async () => {
    await boot();
    for (const n of [1, 2, 3, 4, 5]) {
      const button = q(`stage-toggle-${n}`);
      expect(['true', 'false']).toContain(button.getAttribute('aria-expanded'));
    }
    expect(q('stage-toggle-1').getAttribute('aria-expanded')).toBe('true');
    q('stage-toggle-1').click();
    expect(q('stage-toggle-1').getAttribute('aria-expanded')).toBe('false');
    q('stage-toggle-3').click();
    expect(q('stage-toggle-3').getAttribute('aria-expanded')).toBe('true');
    expect(q('stage-toggle-1').getAttribute('aria-expanded')).toBe('false');
    expect(q('stage-toggle-3').getAttribute('aria-controls')).toBe('stage-panel-3');
  });

  it('gives the progress element an accessible name and a value that follows the stages', async () => {
    await boot({ stored: journeyOf(5, [1, 2]) });
    const bar = q('progress-bar') as HTMLProgressElement;
    expect(bar.getAttribute('aria-label')).toBe('Journey progress');
    expect(bar.max).toBe(100);
    expect(bar.value).toBe(40);
    q('complete-button-3').click();
    await tick();
    expect((q('progress-bar') as HTMLProgressElement).value).toBe(60);
  });

  it('names every stage panel region', async () => {
    await boot();
    for (const n of [1, 2, 3, 4, 5]) {
      const panel = q(`stage-panel-${n}`);
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('aria-label')).toBe(`Stage ${n} details`);
    }
  });
});

describe('decorative content and the content security policy (P1, R1, BR50.8)', () => {
  it('hides decorative icons and the loading skeleton from assistive technology', async () => {
    await boot({ stored: journeyOf(5, [1], '2026-11-12', { milestonesShown: ['first-stage'] }) });
    expect(q('banner-icon').getAttribute('aria-hidden')).toBe('true');
    expect(q('skeleton').getAttribute('aria-hidden')).toBe('true');
    for (const number of document.querySelectorAll('.stage__number')) {
      expect(number.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('keeps inline style, inline script and inline event handlers out of the page', async () => {
    await boot();
    q('stage-toggle-3').click();
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(document.querySelectorAll('[style]')).toHaveLength(0);
    const handlers = [...document.querySelectorAll('*')].filter((el) =>
      el.getAttributeNames().some((name) => name.startsWith('on')),
    );
    expect(handlers).toEqual([]);
  });

  it('declares a favicon in every format browsers ask for', () => {
    const head = new DOMParser().parseFromString(html, 'text/html').head;
    const icons = [...head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')];
    const hrefs = icons.map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']);
    expect(icons[1]?.getAttribute('type')).toBe('image/svg+xml');
  });
});
