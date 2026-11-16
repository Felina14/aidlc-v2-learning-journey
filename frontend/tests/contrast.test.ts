import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

// ---- A small stylesheet reader: enough for this file's flat rules and @media blocks ----------

interface Rule {
  context: string;
  selector: string;
  declarations: Record<string, string>;
}

function parseRules(source: string, context = ''): Rule[] {
  const rules: Rule[] = [];
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open === -1) break;
    const head = source.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < source.length && depth > 0) {
      if (source[j] === '{') depth += 1;
      else if (source[j] === '}') depth -= 1;
      j += 1;
    }
    const body = source.slice(open + 1, j - 1);
    if (head.startsWith('@')) {
      rules.push(...parseRules(body, head));
    } else {
      const declarations: Record<string, string> = {};
      for (const part of body.split(';')) {
        const colon = part.indexOf(':');
        if (colon > 0) declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
      }
      for (const selector of head.split(',')) {
        rules.push({ context, selector: selector.trim(), declarations });
      }
    }
    i = j;
  }
  return rules;
}

const rules = parseRules(css);
const root = rules.find((r) => r.selector === ':root')!.declarations;

const token = (name: string): string => {
  const value = root[name];
  if (!value) throw new Error(`token ${name} missing from :root`);
  return value;
};

/** Declared value of `property` for `selector` outside any media query. */
const declared = (selector: string, property: string): string | undefined =>
  rules.find((r) => r.selector === selector && r.context === '' && property in r.declarations)
    ?.declarations[property];

// ---- WCAG contrast ----------------------------------------------------------------------------

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a six-digit hex colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((k) => {
    const channel = parseInt(m[1]!.slice(k, k + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const focusColour = /#[0-9a-f]{6}/i.exec(token('--focus-ring'))?.[0] ?? '';

/** [foreground, background, needed ratio] — the contrast table in the u6 functional spec. */
const PAIRS: [string, string, string, number][] = [];
for (const bg of ['--color-bg', '--color-surface']) {
  PAIRS.push(['--color-text', bg, token('--color-text'), 4.5]);
  PAIRS.push(['--color-text-muted', bg, token('--color-text-muted'), 4.5]);
  PAIRS.push(['--color-accent (text, links)', bg, token('--color-accent'), 4.5]);
  PAIRS.push(['--color-error', bg, token('--color-error'), 4.5]);
  PAIRS.push(['--color-border', bg, token('--color-border'), 3]);
  PAIRS.push(['--focus-ring colour', bg, focusColour, 3]);
  PAIRS.push(['--color-accent (progress fill)', bg, token('--color-accent'), 3]);
}

describe('colour contrast from the tokens in styles.css (BR50.3)', () => {
  it.each(PAIRS)('%s on %s meets its ratio', (name, bg, fg, needed) => {
    const got = ratio(fg, token(bg));
    expect(
      got,
      `${name} (${fg}) on ${bg} (${token(bg)}) is ${got.toFixed(2)} to 1, needs ${needed}`,
    ).toBeGreaterThanOrEqual(needed);
  });

  it('gives button text on the accent fill at least 4.5 to 1', () => {
    const got = ratio(token('--color-accent-contrast'), token('--color-accent'));
    expect(got).toBeGreaterThanOrEqual(4.5);
  });

  it('works the WCAG formula correctly (black on white is 21 to 1)', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(ratio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });

  it('fails a lighter grey, so a changed token would be caught', () => {
    expect(ratio('#999999', token('--color-bg'))).toBeLessThan(4.5);
  });

  it('uses the accent colour for the focus ring, so the two cannot drift apart', () => {
    expect(focusColour.toLowerCase()).toBe(token('--color-accent').toLowerCase());
  });

  it('draws the focus ring at least 3 pixels wide on every focusable element', () => {
    const width = /(\d+)px/.exec(token('--focus-ring'))?.[1];
    expect(Number(width)).toBeGreaterThanOrEqual(3);
    expect(declared(':focus-visible', 'outline')).toBe('var(--focus-ring)');
  });

  it('fills the progress element with the accent colour', () => {
    expect(declared('.progress-summary progress', 'accent-color')).toBe('var(--color-accent)');
  });
});

describe('motion (BR50.3)', () => {
  it('has a prefers-reduced-motion rule that stops animation and transition', () => {
    const rule = rules.find((r) => r.context.includes('prefers-reduced-motion'));
    expect(rule).toBeDefined();
    expect(rule!.declarations['animation-duration']).toContain('0s');
    expect(rule!.declarations['transition-duration']).toContain('0s');
  });

  it('keeps every declared animation or transition duration at 200 ms or less', () => {
    const times: number[] = [];
    for (const r of rules) {
      for (const [property, value] of Object.entries(r.declarations)) {
        if (!/(transition|animation|duration)/.test(property)) continue;
        for (const m of value.matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
          times.push(m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]));
        }
      }
    }
    expect(times.length).toBeGreaterThan(0);
    expect(Math.max(...times)).toBeLessThanOrEqual(200);
  });
});

describe('declared target sizes of at least 44 by 44 pixels (BR50.3, AC8.3.4)', () => {
  const px = (value: string | undefined): number =>
    Number(/^(\d+)px$/.exec(value ?? '')?.[1] ?? NaN);

  it.each([
    ['.button', 'min-height'],
    ['.button', 'min-width'],
    ['.skip-link', 'min-height'],
    ['.stage__toggle', 'min-height'],
    ['.header-details > summary', 'min-height'],
    ["input[type='text']", 'min-height'],
    ["input[type='date']", 'min-height'],
    ['.style-option__label', 'min-height'],
    ['.stage__number', 'width'],
    ['.stage__number', 'height'],
  ])('%s has %s of at least 44px', (selector, property) => {
    expect(px(declared(selector, property))).toBeGreaterThanOrEqual(44);
  });

  it('gives each radio button a 44 by 44 pixel area with its margin, and its label a 44px row', () => {
    const radio = "input[type='radio']";
    const rule = rules.find((r) => r.selector === `.style-option ${radio}`)!.declarations;
    const margin = px(rule['margin']);
    expect(px(rule['width']) + 2 * margin).toBeGreaterThanOrEqual(44);
    expect(px(rule['height']) + 2 * margin).toBeGreaterThanOrEqual(44);
    expect(px(declared('.style-option__label', 'min-height'))).toBeGreaterThanOrEqual(44);
  });

  it('keeps the dialog buttons the same size as every other button', () => {
    const rule = rules.find((r) => r.selector === '.confirm-dialog__actions .button')!.declarations;
    expect(rule['min-height']).toBeUndefined();
    expect(rule['min-width']).toBeUndefined();
  });
});
