/** The same topic checks as the server (BR1.1, BR1.2), run in the browser before any request. */

export const MIN_TOPIC = 2;
export const MAX_TOPIC = 100;
/** Raw bound in code points (review R-01): marks and joiners add no visible length. */
export const MAX_RAW_TOPIC = 200;

export const MESSAGE_LENGTH = 'Enter a topic between 2 and 100 characters.';
export const MESSAGE_NO_LETTER = 'The topic must contain letters or numbers.';

export type TopicCheck =
  | { ok: true; topic: string }
  | { ok: false; topic: string; problem: 'length' | 'no_letter_or_digit'; message: string };

/** Trim the topic and remove control characters. */
export function cleanTopic(raw: string): string {
  return raw.replace(/\p{Cc}/gu, '').trim();
}

/** Count visible characters: an emoji or an accented letter counts as one. */
export function visibleLength(text: string): number {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).length;
  }
  return Array.from(text).length;
}

export function checkTopic(raw: string): TopicCheck {
  const topic = cleanTopic(raw);
  if (Array.from(topic).length > MAX_RAW_TOPIC) {
    return { ok: false, topic, problem: 'length', message: MESSAGE_LENGTH };
  }
  const length = visibleLength(topic);
  if (length < MIN_TOPIC || length > MAX_TOPIC) {
    return { ok: false, topic, problem: 'length', message: MESSAGE_LENGTH };
  }
  if (!/[\p{L}\p{Nd}]/u.test(topic)) {
    return { ok: false, topic, problem: 'no_letter_or_digit', message: MESSAGE_NO_LETTER };
  }
  return { ok: true, topic };
}
