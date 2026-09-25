import { adoptPersistedCrash, captureCrash, resetCrashCapture } from '../capture-crash.service';
import { navigationStore } from '../../../navigation/stores/navigation.store';
import { crashStore } from '../../stores/crash.store';

jest.mock('../native-crash.service', () => ({
  persistCrashRecord: () => {},
  isNativeCrashCaptureAvailable: () => false,
  installNativeCrashHandler: () => {},
  drainNativeCrashRecords: () => [],
  readNativeDeviceInfo: () => ({}),
}));

beforeEach(() => {
  resetCrashCapture();
  crashStore.reset();
  crashStore.setEnabled(true);
  navigationStore.reset();
  navigationStore.setEnabled(true);
});

describe('the route on a crash record', () => {
  it('is the route on screen, read from the Navigation tab', () => {
    navigationStore.record({
      id: 'm1',
      timestamp: 1,
      action: 'NAVIGATE',
      from: null,
      to: { key: 'c', name: 'Checkout', path: '/checkout', params: { cart: 3 } },
      noop: false,
    });

    captureCrash(new Error('x'), 'js-error');

    const [record] = crashStore.getSnapshot();
    expect(record.route).toEqual({ name: 'Checkout', path: '/checkout' });
    expect(record.breadcrumbs?.some((crumb) => crumb.category === 'navigation')).toBe(true);
    expect(record.breadcrumbs?.find((crumb) => crumb.category === 'navigation')?.message).toBe(
      'Checkout'
    );
  });

  it('is absent when no navigator was attached', () => {
    captureCrash(new Error('x'), 'js-error');
    expect(crashStore.getSnapshot()[0].route).toBeUndefined();
  });

  it('survives a record read back from disk', () => {
    adoptPersistedCrash({ id: 'p', route: { name: 'Home' } });
    expect(crashStore.getSnapshot()[0].route).toEqual({ name: 'Home' });
  });
});
