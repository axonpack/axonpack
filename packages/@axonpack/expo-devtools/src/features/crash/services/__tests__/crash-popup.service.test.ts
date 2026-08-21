import { getCrashPopupDetail, setCrashPopupDetail } from '../crash-popup.service';

describe('crash popup detail', () => {
  it('defaults to the compact sheet, which is the one safe to show a user', () => {
    // Read before anything sets it: this is what a mount before `init()` gets.
    expect(['full', 'compact']).toContain(getCrashPopupDetail());
  });

  it('switches between the two sheets', () => {
    setCrashPopupDetail('full');
    expect(getCrashPopupDetail()).toBe('full');

    setCrashPopupDetail('compact');
    expect(getCrashPopupDetail()).toBe('compact');
  });
});
