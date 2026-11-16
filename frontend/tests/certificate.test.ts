import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACK_TO_JOURNEY_LABEL,
  CERTIFICATE_NAME_LABEL,
  COMPLETION_HEADING,
  PRINT_LABEL,
  certificateDateText,
  clearCertificateName,
  findCertificateElements,
  printCertificate,
  renderCertificate,
  setCertificateName,
  stageCountText,
} from '../src/certificate';
import { loadPage } from './helpers';

beforeEach(() => loadPage());

describe('the certificate facts (BR41.1)', () => {
  it('writes the local date in a plain long form', () => {
    expect(certificateDateText('2026-11-10')).toBe('10 November 2026');
    expect(certificateDateText('2027-01-02')).toBe('2 January 2027');
    expect(certificateDateText('2028-02-29')).toBe('29 February 2028');
  });

  it('returns text that is not a date as it is', () => {
    expect(certificateDateText('')).toBe('');
    expect(certificateDateText('soon')).toBe('soon');
    expect(certificateDateText('2026-13-01')).toBe('2026-13-01');
  });

  it('writes 5 stages or 6 stages', () => {
    expect(stageCountText(5)).toBe('5 stages');
    expect(stageCountText(6)).toBe('6 stages');
    expect(stageCountText(1)).toBe('1 stage');
  });

  it('keeps the exact wording the design asks for', () => {
    expect(COMPLETION_HEADING).toBe('Journey complete');
    expect(CERTIFICATE_NAME_LABEL).toBe('Name on certificate (optional, not saved)');
    expect(PRINT_LABEL).toBe('Print or save certificate');
    expect(BACK_TO_JOURNEY_LABEL).toBe('Back to my journey');
  });
});

describe('the certificate on the page (BR41.1 to BR41.3)', () => {
  const draw = () => {
    const els = findCertificateElements(document);
    renderCertificate(els, { topic: 'Rust', stageCount: 5, today: '2026-11-10' });
    return els;
  };

  it('shows the topic, the stage count and the date as plain text', () => {
    const els = draw();
    expect(els.topic.textContent).toBe('Rust');
    expect(els.stages.textContent).toBe('5 stages');
    expect(els.date.textContent).toBe('10 November 2026');
  });

  it('shows a topic with markup characters as text, never as elements', () => {
    const els = findCertificateElements(document);
    renderCertificate(els, {
      topic: '<img src=x onerror=alert(1)>',
      stageCount: 6,
      today: '2026-11-10',
    });
    expect(els.topic.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(els.panel.querySelector('img')).toBeNull();
    expect(els.stages.textContent).toBe('6 stages');
  });

  it('labels the field and the panel, and the buttons carry the agreed wording', () => {
    const els = draw();
    const label = document.querySelector(`label[for="${els.nameInput.id}"]`);
    expect(label?.textContent?.trim()).toBe(CERTIFICATE_NAME_LABEL);
    expect(els.panel.getAttribute('aria-labelledby')).toBe('certificate-title');
    expect(document.getElementById('certificate-title')?.textContent).toBe(
      'Certificate of completion',
    );
    expect(els.print.textContent?.trim()).toBe(PRINT_LABEL);
    expect(els.back.textContent?.trim()).toBe(BACK_TO_JOURNEY_LABEL);
  });

  it('shows a typed name as plain text, including script text', () => {
    const els = draw();
    expect(els.name.hidden).toBe(true);
    setCertificateName(els, '  Ada <script>alert(1)</script>  ');
    expect(els.name.textContent).toBe('Ada <script>alert(1)</script>');
    expect(els.name.hidden).toBe(false);
    expect(els.panel.querySelector('script')).toBeNull();
  });

  it('hides the name line again when the field is emptied, and forgets the name on clear', () => {
    const els = draw();
    setCertificateName(els, 'Ada');
    setCertificateName(els, '   ');
    expect(els.name.hidden).toBe(true);
    els.nameInput.value = 'Ada';
    setCertificateName(els, 'Ada');
    clearCertificateName(els);
    expect(els.nameInput.value).toBe('');
    expect(els.name.textContent).toBe('');
    expect(els.name.hidden).toBe(true);
  });

  it('opens the print dialog through the function it is given, once, with nothing else', () => {
    const print = vi.fn();
    printCertificate(print);
    expect(print).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledWith();
  });

  it('has a field and controls inside the tools area, which the print style hides', () => {
    const els = draw();
    const tools = document.querySelector('.certificate__tools');
    expect(tools?.contains(els.nameInput)).toBe(true);
    expect(tools?.contains(els.print)).toBe(true);
    expect(tools?.contains(els.back)).toBe(true);
    expect(els.panel.contains(els.nameInput)).toBe(false);
  });
});

describe('the print style (BR41.3)', () => {
  const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8');
  const printStyle = css.slice(css.indexOf('@media print'));

  it('is present in styles.css', () => {
    expect(css).toContain('@media print');
  });

  it('hides the header, the goal line area and the two journey controls', () => {
    for (const selector of [
      '.site-header',
      '.journey-header',
      '.journey-actions',
      '.certificate__tools',
      '.stages',
      '.banner-area',
    ]) {
      expect(printStyle).toContain(selector);
    }
    expect(printStyle).toMatch(/display:\s*none\s*!important/);
  });

  it('prints in black and white and keeps the certificate panel', () => {
    expect(printStyle).toMatch(/color:\s*#000\s*!important/);
    expect(printStyle).toMatch(/background:\s*#fff\s*!important/);
    expect(printStyle).toContain('.certificate__panel');
    expect(printStyle).not.toMatch(/\.certificate__panel[^{]*\{[^}]*display:\s*none/);
  });
});
