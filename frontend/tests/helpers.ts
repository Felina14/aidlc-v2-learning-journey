import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NudgeStorage } from '../src/nudge';
import type { Journey, Stage } from '../src/types';

export const SESSION = '3f6c2d1e-8a4b-4c5d-9e7f-0a1b2c3d4e5f';

export function makeStage(n: number, overrides: Partial<Stage> = {}): Stage {
  return {
    stageNumber: n,
    title: `Stage ${n} title`,
    whatItIs: `What ${n} is`,
    whyItMatters: `Why ${n} matters`,
    afterThis: `After ${n}`,
    materials: {
      reading: [`Read ${n}`],
      exercises: [`Do ${n}`],
      miniProject: `Build ${n}`,
      quiz: [`Quiz ${n}`],
    },
    hours: 3,
    ...overrides,
  };
}

export function makeJourney(overrides: Partial<Journey> = {}): Journey {
  return {
    topic: 'Rust',
    teachingStyle: 'guide',
    source: 'ai',
    stages: [1, 2, 3, 4, 5].map((n) => makeStage(n)),
    completedStages: [],
    goalDate: null,
    milestonesShown: [],
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    ...overrides,
  };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

/**
 * jsdom has no modal dialog support: give `dialog` a small stand-in that sets `open`, and record
 * each call so tests can check that `showModal()` was used.
 */
export const modalCalls = { showModal: 0, close: 0 };

function installDialogStandIn(): void {
  const proto = window.HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  proto.showModal = function (this: HTMLDialogElement) {
    modalCalls.showModal += 1;
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    modalCalls.close += 1;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** Load the real index.html into the jsdom document. */
export function loadPage(): void {
  installDialogStandIn();
  modalCalls.showModal = 0;
  modalCalls.close = 0;
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
}

export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

export function blockedStorage() {
  const fail = () => {
    throw new DOMException('blocked', 'SecurityError');
  };
  return { getItem: fail, setItem: fail };
}

/** A fake browser storage that also lists its keys and counts every call. */
export function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const calls: string[] = [];
  const storage: NudgeStorage = {
    getItem: (key) => {
      calls.push(`get ${key}`);
      return data.get(key) ?? null;
    },
    setItem: (key, value) => {
      calls.push(`set ${key}`);
      data.set(key, value);
    },
    removeItem: (key) => {
      calls.push(`remove ${key}`);
      data.delete(key);
    },
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
  return { storage, data, calls };
}

export function blockedNudgeStorage(): NudgeStorage {
  const fail = () => {
    throw new DOMException('blocked', 'SecurityError');
  };
  return {
    getItem: fail,
    setItem: fail,
    removeItem: fail,
    key: fail,
    get length(): number {
      return fail();
    },
  };
}
