/**
 * The completion view's certificate (BR41.1 to BR41.3, BR45.1). The optional name is held only in
 * the page: it is read from the field and shown with `textContent`, and is never put in a request,
 * in browser storage, in a log line or in an announcement. This module imports neither the
 * milestone nor the nudge module.
 */

export const COMPLETION_HEADING = 'Journey complete';
export const CERTIFICATE_NAME_LABEL = 'Name on certificate (optional, not saved)';
export const PRINT_LABEL = 'Print or save certificate';
export const BACK_TO_JOURNEY_LABEL = 'Back to my journey';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-11-10" as "10 November 2026", in the learner's own calendar; other text is unchanged. */
export function certificateDateText(localDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || month === undefined) return localDate;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/** "5 stages" or "6 stages". */
export function stageCountText(stageCount: number): string {
  return `${stageCount} ${stageCount === 1 ? 'stage' : 'stages'}`;
}

export interface CertificateFacts {
  topic: string;
  stageCount: number;
  /** The learner's local date, "YYYY-MM-DD". */
  today: string;
}

export interface CertificateElements {
  section: HTMLElement;
  panel: HTMLElement;
  topic: HTMLElement;
  stages: HTMLElement;
  date: HTMLElement;
  name: HTMLElement;
  nameInput: HTMLInputElement;
  print: HTMLButtonElement;
  back: HTMLButtonElement;
}

export function findCertificateElements(doc: Document): CertificateElements {
  const t = <T extends HTMLElement>(id: string): T => {
    const found = doc.querySelector<T>(`[data-testid="${id}"]`);
    if (!found) throw new Error(`missing element ${id}`);
    return found;
  };
  return {
    section: t('certificate-section'),
    panel: t('certificate-panel'),
    topic: t('certificate-topic'),
    stages: t('certificate-stages'),
    date: t('certificate-date'),
    name: t('certificate-name'),
    nameInput: t<HTMLInputElement>('certificate-name-input'),
    print: t<HTMLButtonElement>('certificate-print-button'),
    back: t<HTMLButtonElement>('certificate-back-button'),
  };
}

/** Put the topic, the stage count and the date on the certificate (all plain text). */
export function renderCertificate(els: CertificateElements, facts: CertificateFacts): void {
  els.topic.textContent = facts.topic;
  els.stages.textContent = stageCountText(facts.stageCount);
  els.date.textContent = certificateDateText(facts.today);
}

/** Show the typed name on the certificate as plain text; an empty name hides the line. */
export function setCertificateName(els: CertificateElements, name: string): void {
  const trimmed = name.trim();
  els.name.textContent = trimmed;
  els.name.hidden = trimmed === '';
}

/** Forget the name: the field and the certificate line are both emptied. */
export function clearCertificateName(els: CertificateElements): void {
  els.nameInput.value = '';
  setCertificateName(els, '');
}

/** Open the browser's print dialog; nothing is generated on the server and nothing is sent. */
export function printCertificate(print: () => void): void {
  print();
}
