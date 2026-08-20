import { LogBox } from 'react-native';

import { disableDefaultLogBox } from '../disable-logbox.service';

describe('disableDefaultLogBox', () => {
  it('uninstalls LogBox, which is what stops the red box', () => {
    const uninstall = jest.spyOn(LogBox, 'uninstall').mockImplementation(() => {});
    const ignoreAllLogs = jest.spyOn(LogBox, 'ignoreAllLogs').mockImplementation(() => {});

    disableDefaultLogBox();

    expect(uninstall).toHaveBeenCalledTimes(1);
    // `ignoreAllLogs` only silences the toasts — an uncaught error would still open the full-screen
    // red box, so reaching for it here would half-do the job.
    expect(ignoreAllLogs).not.toHaveBeenCalled();

    uninstall.mockRestore();
    ignoreAllLogs.mockRestore();
  });

  it('survives a React Native version that no longer offers the method', () => {
    const uninstall = jest.spyOn(LogBox, 'uninstall').mockImplementation(() => {
      throw new Error('LogBox.uninstall is not a function');
    });

    expect(() => disableDefaultLogBox()).not.toThrow();
    uninstall.mockRestore();
  });
});
