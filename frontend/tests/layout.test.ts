import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

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

/** Resolve one level of var(--name) against :root. */
const resolveVar = (value: string | undefined): string | undefined => {
  const m = /^var\((--[a-z0-9-]+)\)$/.exec(value ?? '');
  return m ? root[m[1]!] : value;
};

/** Merge every top-level (no media query) declaration for a selector, later rules winning. */
const styleOf = (selector: string): Record<string, string> =>
  Object.assign(
    {},
    ...rules.filter((r) => r.selector === selector && r.context === '').map((r) => r.declarations),
  );

const px = (value: string | undefined): number => Number(/^(\d+)px$/.exec(value ?? '')?.[1] ?? NaN);

describe('colour tokens are unchanged', () => {
  it('keeps every colour token and the focus ring byte-identical', () => {
    expect({
      '--color-bg': root['--color-bg'],
      '--color-surface': root['--color-surface'],
      '--color-text': root['--color-text'],
      '--color-text-muted': root['--color-text-muted'],
      '--color-accent': root['--color-accent'],
      '--color-accent-contrast': root['--color-accent-contrast'],
      '--color-border': root['--color-border'],
      '--color-divider': root['--color-divider'],
      '--color-error': root['--color-error'],
      '--focus-ring': root['--focus-ring'],
    }).toEqual({
      '--color-bg': '#ffffff',
      '--color-surface': '#f6f8fa',
      '--color-text': '#1f2328',
      '--color-text-muted': '#57606a',
      '--color-accent': '#8a4b08',
      '--color-accent-contrast': '#ffffff',
      '--color-border': '#6e7781',
      '--color-divider': '#d0d7da',
      '--color-error': '#cf222e',
      '--focus-ring': '3px solid #8a4b08',
    });
  });

  it('defines no other colour token', () => {
    const colourTokens = Object.keys(root).filter((k) => k.startsWith('--color-'));
    expect(colourTokens.sort()).toEqual(
      [
        '--color-bg',
        '--color-surface',
        '--color-text',
        '--color-text-muted',
        '--color-accent',
        '--color-accent-contrast',
        '--color-border',
        '--color-divider',
        '--color-error',
      ].sort(),
    );
  });
});

describe('the centred page container', () => {
  it.each(['.site-header', 'main', '.site-footer'])(
    '%s is at most 960px wide, centred, with 24px side gutters',
    (selector) => {
      const style = styleOf(selector);
      expect(px(resolveVar(style['max-width']))).toBe(960);
      expect(style['margin-inline']).toMatch(/auto/);
      expect(px(resolveVar(style['padding-inline']))).toBe(24);
    },
  );

  it('sizes boxes with border-box so the gutters never cause sideways scrolling', () => {
    expect(styleOf('*')['box-sizing']).toBe('border-box');
  });

  it('does not make the whole main element sticky', () => {
    expect(styleOf('main')['position']).not.toBe('sticky');
  });
});

describe('the header bar', () => {
  it('has a surface background, a divider line and padding from the spacing tokens', () => {
    const style = styleOf('.site-header');
    expect(style['background']).toBe('var(--color-surface)');
    expect(style['border-bottom']).toContain('var(--color-divider)');
    expect(style['padding-block']).toMatch(/var\(--space-\d\)/);
  });
});

describe('the type scale', () => {
  const scale = Object.keys(root).filter((k) => k.startsWith('--font-size-'));

  it('defines at least five font-size steps, each in rem', () => {
    expect(scale.length).toBeGreaterThanOrEqual(5);
    for (const name of scale) expect(root[name]).toMatch(/^\d*\.?\d+rem$/);
  });

  it('keeps body text at 1rem or more', () => {
    expect(resolveVar(styleOf('body')['font-size'])).toMatch(/^1rem$/);
  });

  it.each(['h1', 'h2', 'h3', '.stage__heading', '.site-name'])(
    '%s takes its size from the scale',
    (selector) => {
      expect(styleOf(selector)['font-size']).toMatch(/^var\(--font-size-[a-z0-9]+\)$/);
    },
  );
});

describe('the primary button', () => {
  const button = styleOf('.button');

  it('is accent on accent-contrast, at least 44px high, with spacing tokens', () => {
    expect(button['background']).toBe('var(--color-accent)');
    expect(button['color']).toBe('var(--color-accent-contrast)');
    expect(px(button['min-height'])).toBeGreaterThanOrEqual(44);
    expect(button['padding']).toMatch(/var\(--space-\d\)/);
    expect(button['border-radius']).toBe('var(--radius)');
  });
});

describe('stage cards and the summary block', () => {
  it.each(['.stage', '.stage__panel', '.journey-header', '.progress-summary'])(
    '%s pads with --space-* tokens',
    (selector) => {
      expect(styleOf(selector)['padding']).toMatch(/^((var\(--space-\d\)|0)\s*)+$/);
    },
  );

  it.each(['.stage', '.journey-header'])('%s spaces itself with --space-* tokens', (selector) => {
    expect(styleOf(selector)['margin']).toMatch(/var\(--space-\d\)/);
  });
});
