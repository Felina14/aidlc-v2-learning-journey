/**
 * The blocked-word list for encouragement messages (BR43.1), kept in one shared test helper and
 * never in production code. Matching is case-insensitive, on whole words or phrases, after
 * typographic apostrophes and quotes are turned into plain ones.
 */

/** The starter list of the requirements plus the extension of the functional design. */
export const BLOCKED_PHRASES: readonly string[] = [
  'behind',
  'failed',
  'failure',
  'late',
  'overdue',
  'lazy',
  'slacking',
  'falling short',
  'wasted',
  'guilty',
  'you must',
  'hurry',
  'running out of time',
  'urgent',
  'deadline is close',
  'last chance',
  "don't miss",
  'miss out',
  'panic',
  'countdown',
  'time is running',
  'ticking',
];

const NUMBER_WORDS =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen';

/** Turn typographic apostrophes and quotes into plain ones, so "don’t miss" is caught too. */
export function normalise(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u02BC\uFF07]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\uFF02]/g, '"');
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phraseExpression(phrase: string): RegExp {
  const body = escape(phrase).replace(/ /g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, 'iu');
}

const EXPRESSIONS: readonly { name: string; expression: RegExp }[] = [
  ...BLOCKED_PHRASES.map((phrase) => ({ name: phrase, expression: phraseExpression(phrase) })),
  // "only N day" and "only N days" for any number, written in digits or in words.
  {
    name: 'only N day(s)',
    expression: new RegExp(
      `(?<![\\p{L}\\p{N}_])only\\s+(?:\\d+|${NUMBER_WORDS})\\s+days?(?![\\p{L}\\p{N}_])`,
      'iu',
    ),
  },
];

/** Every blocked word or phrase found in the text; empty when the text is clean. */
export function findBlocked(text: string): string[] {
  const plain = normalise(text);
  return EXPRESSIONS.filter(({ expression }) => expression.test(plain)).map(({ name }) => name);
}
