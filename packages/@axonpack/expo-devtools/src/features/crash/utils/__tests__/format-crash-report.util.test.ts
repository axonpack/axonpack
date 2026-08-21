import type { CrashRecord } from '../../stores/crash.store';
import { formatCrashJson, formatCrashReport, formatCrashTitle } from '../format-crash-report.util';

function record(patch: Partial<CrashRecord> = {}): CrashRecord {
  return {
    id: 'crash-1',
    kind: 'js-fatal',
    name: 'TypeError',
    message: 'undefined is not a function',
    stack: 'at loadUser (/app.bundle:1:1)',
    fromPreviousLaunch: false,
    timestamp: 1_700_000_000_000,
    seen: false,
    ...patch,
  };
}

describe('formatCrashTitle', () => {
  it('joins name and message', () => {
    expect(formatCrashTitle(record())).toBe('TypeError: undefined is not a function');
  });

  it('falls back to the name alone when there is no message', () => {
    expect(formatCrashTitle(record({ message: '' }))).toBe('TypeError');
  });
});

describe('formatCrashReport', () => {
  it('fences the stack so a chat client cannot re-wrap it', () => {
    const report = formatCrashReport(record());
    expect(report).toContain('### Stack');
    expect(report).toContain('```\nat loadUser (/app.bundle:1:1)\n```');
  });

  it('includes the component stack when React supplied one', () => {
    const report = formatCrashReport(
      record({ kind: 'react-render', componentStack: '\n    in Profile' })
    );
    expect(report).toContain('### Component stack');
    expect(report).toContain('in Profile');
  });

  it('omits device fields the platform did not report', () => {
    const report = formatCrashReport(record({ device: { platform: 'ios', model: 'iPhone15,2' } }));
    expect(report).toContain('- Model: iPhone15,2');
    expect(report).not.toContain('- Brand:');
  });

  it('notes that the record came from a run that ended', () => {
    expect(formatCrashReport(record({ fromPreviousLaunch: true }))).toContain('previous launch');
  });

  it('leaves out sections the record has nothing for', () => {
    const report = formatCrashReport(record({ stack: null }));
    expect(report).not.toContain('### Stack');
    expect(report).not.toContain('### Breadcrumbs');
  });
});

describe('formatCrashJson', () => {
  it('round-trips the record', () => {
    expect(JSON.parse(formatCrashJson(record())).name).toBe('TypeError');
  });

  it('survives a value that cannot be serialized', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => formatCrashJson(record({ context: circular }))).not.toThrow();
  });
});
