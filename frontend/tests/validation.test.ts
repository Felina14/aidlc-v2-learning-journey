import { describe, expect, it } from 'vitest';
import {
  MESSAGE_LENGTH,
  MESSAGE_NO_LETTER,
  checkTopic,
  cleanTopic,
  visibleLength,
} from '../src/validation';

describe('topic checks in the browser (BR1.1, BR1.2)', () => {
  it('trims the topic and removes control characters but keeps inner spaces', () => {
    expect(cleanTopic('  data  story\u0000telling \n')).toBe('data  storytelling');
  });

  it('accepts 2 and 100 visible characters', () => {
    expect(checkTopic('ab').ok).toBe(true);
    expect(checkTopic('a'.repeat(100)).ok).toBe(true);
  });

  it('rejects 1 and 101 characters with the length message', () => {
    for (const text of ['a', 'a'.repeat(101), '   ']) {
      const result = checkTopic(text);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toBe(MESSAGE_LENGTH);
    }
  });

  it('counts an emoji or an accented letter as one character', () => {
    expect(visibleLength('é')).toBe(1);
    expect(visibleLength('e\u0301')).toBe(1);
    expect(visibleLength('👍🏽')).toBe(1);
    expect(checkTopic('😀'.repeat(101)).ok).toBe(false);
    expect(checkTopic('é'.repeat(100)).ok).toBe(true);
  });

  it('rejects a topic with no letter or digit', () => {
    for (const text of ['!!!!', '?? ??', '😀😀']) {
      const result = checkTopic(text);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.problem).toBe('no_letter_or_digit');
        expect(result.message).toBe(MESSAGE_NO_LETTER);
      }
    }
  });

  it('accepts a letter or digit in any script and keeps markup as plain text', () => {
    for (const text of ['日本語', 'Привет', '42', '!!a!!', '<script>alert(1)</script>']) {
      expect(checkTopic(text).ok).toBe(true);
    }
  });

  it('rejects a joiner flood and a combining-mark flood on raw length (review R-01)', () => {
    const joinerFlood = 'ab' + '\u200dx'.repeat(4000) + '\u0301'.repeat(1000);
    const markFlood = 'ab' + '\u0301'.repeat(5000);
    expect(visibleLength(markFlood)).toBeLessThanOrEqual(100); // looks short to the visible rule
    for (const text of [joinerFlood, markFlood]) {
      const result = checkTopic(text);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.problem).toBe('length');
        expect(result.message).toBe(MESSAGE_LENGTH);
      }
    }
  });

  it('allows exactly 200 code points and rejects 201 when the text looks short', () => {
    expect(checkTopic('ab' + '\u0301'.repeat(198)).ok).toBe(true); // 200 code points
    expect(checkTopic('ab' + '\u0301'.repeat(199)).ok).toBe(false); // 201 code points
  });

  it('falls back to counting code points when the segmenter is missing', () => {
    const intl = Intl as unknown as { Segmenter?: unknown };
    const original = intl.Segmenter;
    delete intl.Segmenter; // simulate an old browser
    try {
      expect(visibleLength('abc')).toBe(3);
    } finally {
      intl.Segmenter = original;
    }
  });
});
