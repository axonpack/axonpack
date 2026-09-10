import { coalesceNotify } from '../coalesce-notify.util';

function fakeEmitter(listeners: number) {
  return {
    emit: jest.fn(),
    listenerCount: () => listeners,
  };
}

describe('coalesceNotify', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('collapses a burst into one notification', () => {
    const emitter = fakeEmitter(1);
    const notify = coalesceNotify(emitter);

    for (let i = 0; i < 50; i++) notify();
    expect(emitter.emit).not.toHaveBeenCalled();

    jest.runAllTimers();
    expect(emitter.emit).toHaveBeenCalledTimes(1);
  });

  it('opens the next frame once the last one has fired', () => {
    const emitter = fakeEmitter(1);
    const notify = coalesceNotify(emitter);

    notify();
    jest.runAllTimers();
    notify();
    jest.runAllTimers();

    expect(emitter.emit).toHaveBeenCalledTimes(2);
  });

  it('schedules nothing while nobody is listening', () => {
    const emitter = fakeEmitter(0);
    const notify = coalesceNotify(emitter);

    notify();
    jest.runAllTimers();

    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
