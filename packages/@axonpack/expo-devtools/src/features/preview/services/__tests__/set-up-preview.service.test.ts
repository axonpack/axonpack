import type { PreviewConfig } from '@axonpack/preview';

const CONFIG: PreviewConfig = {
  enabled: true,
  s3Config: { url: 'https://bucket.example.com/previews' },
};

const FAKE_PREVIEW = { PreviewProvider: () => null, PreviewList: () => null };

/** A fresh module registry where `@axonpack/preview` is the fake above, or missing. */
function load(preview: 'installed' | 'missing') {
  jest.resetModules();
  jest.doMock('@axonpack/preview', () => {
    if (preview === 'missing') throw new Error("Cannot find module '@axonpack/preview'");
    return FAKE_PREVIEW;
  });
  jest.doMock('../../../crash/services/native-crash.service', () => ({
    persistCrashRecord: () => {},
    isNativeCrashCaptureAvailable: () => false,
    installNativeCrashHandler: () => {},
    drainNativeCrashRecords: () => [],
    readNativeDeviceInfo: () => ({}),
  }));
  return {
    ...(require('../set-up-preview.service') as typeof import('../set-up-preview.service')),
    ...(require('../../stores/preview.store') as typeof import('../../stores/preview.store')),
    ...(require('../../../../client/start-devtools.client') as typeof import('../../../../client/start-devtools.client')),
  };
}

describe('setUpPreview', () => {
  it('keeps the package and the config when preview is installed', () => {
    const { setUpPreview, previewStore } = load('installed');
    setUpPreview(CONFIG, true);
    expect(previewStore.getModule()).toBe(FAKE_PREVIEW);
    expect(previewStore.getConfig()).toBe(CONFIG);
    expect(previewStore.isSetUp()).toBe(true);
  });

  it('says how to install preview when it is missing and the devtools are on', () => {
    const { setUpPreview, previewStore } = load('missing');
    expect(() => setUpPreview(CONFIG, true)).toThrow(
      "The devtools config has `preview`, but @axonpack/preview isn't installed. Install it with " +
        '`npx expo install @axonpack/preview expo-file-system`, add `@axonpack/preview` to the ' +
        'plugins in app.json, and rebuild the app.'
    );
    expect(previewStore.isSetUp()).toBe(false);
  });

  it('never throws with the devtools off, so a release build cannot crash on it', () => {
    const { setUpPreview, previewStore } = load('missing');
    expect(() => setUpPreview(CONFIG, false)).not.toThrow();
    expect(previewStore.isSetUp()).toBe(false);
  });
});

describe('config.preview at start', () => {
  it('throws on every start until preview is installed', () => {
    const { startDevtools, PREVIEW_NOT_INSTALLED } = load('missing');
    const config = { preview: CONFIG, network: { http: false } };
    expect(() => startDevtools(config)).toThrow(PREVIEW_NOT_INSTALLED);
    expect(() => startDevtools(config)).toThrow(PREVIEW_NOT_INSTALLED);
  });

  it('sets preview up with the devtools off too, since a preview is a release bundle', () => {
    const { startDevtools, previewStore } = load('installed');
    startDevtools({ enabled: false, preview: CONFIG });
    expect(previewStore.getConfig()).toBe(CONFIG);
  });

  it('leaves preview alone without the config, installed or not', () => {
    const { startDevtools, previewStore } = load('missing');
    expect(() => startDevtools({ network: { http: false } })).not.toThrow();
    expect(previewStore.isSetUp()).toBe(false);
  });
});
