import { limiterStore } from '../limiter.store';

afterEach(() => limiterStore.setState(limiterStore.getInitialState(), true));

describe('limiterStore', () => {
  it('keeps only the digits of a custom duration, and takes them once they are a number', () => {
    limiterStore.setCustomText('1a2');
    expect(limiterStore.getState()).toMatchObject({ customText: '12', durationMs: 12 });
  });

  it('keeps the last duration while the custom field is empty or zero', () => {
    limiterStore.setCustomText('0');
    expect(limiterStore.getState()).toMatchObject({ customText: '0', durationMs: 250 });
  });

  it('clears the custom field when a preset is picked', () => {
    limiterStore.setCustomText('900');
    limiterStore.choosePreset(1000);
    expect(limiterStore.getState()).toMatchObject({ customText: '', durationMs: 1000 });
  });
});
