import { performanceStore } from '../../stores/performance.store';
import {
  clearRecordedMarks,
  clearRecordedMeasures,
  recordMark,
  recordMeasure,
} from '../user-timing.service';

const entries = () => performanceStore.getSnapshot().userTiming;
const measures = () => entries().filter((entry) => entry.kind === 'measure');

describe('user timing, per W3C User Timing', () => {
  beforeEach(() => {
    performanceStore.setEnabled(true);
    performanceStore.setPaused(false);
    performanceStore.clear();
    clearRecordedMarks();
  });

  it('records a mark with zero duration, as the spec requires', () => {
    recordMark('checkout');
    expect(entries()[0]).toMatchObject({ kind: 'mark', name: 'checkout', duration: 0 });
  });

  it('honours an explicit startTime on a mark', () => {
    recordMark('seeded', { startTime: 1234 });
    expect(entries()[0]?.startTime).toBe(1234);
  });

  it('closes a measure against a mark of the same name', () => {
    recordMark('checkout', { startTime: 100 });
    recordMeasure('checkout', { start: 'checkout', end: 250 });
    expect(measures()[0]).toMatchObject({ name: 'checkout', startTime: 100, duration: 150 });
  });

  it('accepts a differently named start mark and an end mark', () => {
    recordMark('a', { startTime: 10 });
    recordMark('b', { startTime: 60 });
    recordMeasure('span', 'a', 'b');
    expect(measures()[0]).toMatchObject({ startTime: 10, duration: 50 });
  });

  it('derives the end from start plus duration', () => {
    recordMeasure('fixed', { start: 200, duration: 75 });
    expect(measures()[0]).toMatchObject({ startTime: 200, duration: 75 });
  });

  it('derives the start from end minus duration', () => {
    recordMeasure('backwards', { end: 300, duration: 100 });
    expect(measures()[0]).toMatchObject({ startTime: 200, duration: 100 });
  });

  it('rejects start, end and duration together', () => {
    expect(() => recordMeasure('bad', { start: 1, end: 2, duration: 3 })).toThrow(TypeError);
  });

  it('keeps a negative duration rather than clamping it', () => {
    recordMeasure('reversed', { start: 500, end: 200 });
    expect(measures()[0]?.duration).toBe(-300);
  });

  it('preserves detail as text', () => {
    recordMark('with-detail', { detail: { cartSize: 3 } });
    expect(entries()[0]?.detail).toBe('{"cartSize":3}');
  });

  it('survives a detail that cannot be serialized', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => recordMark('circular', { detail: circular })).not.toThrow();
  });

  it('clears marks by name, leaving measures alone', () => {
    recordMark('keep');
    recordMark('drop');
    recordMeasure('measured', { start: 0, end: 1 });
    clearRecordedMarks('drop');
    expect(
      entries()
        .map((entry) => entry.name)
        .sort()
    ).toEqual(['keep', 'measured']);
  });

  it('clears every measure when given no name', () => {
    recordMark('kept');
    recordMeasure('one', { start: 0, end: 1 });
    recordMeasure('two', { start: 0, end: 1 });
    clearRecordedMeasures();
    expect(entries().map((entry) => entry.name)).toEqual(['kept']);
  });

  it('records nothing while paused, like every other collector', () => {
    performanceStore.setPaused(true);
    recordMark('ignored');
    expect(entries()).toHaveLength(0);
  });
});
