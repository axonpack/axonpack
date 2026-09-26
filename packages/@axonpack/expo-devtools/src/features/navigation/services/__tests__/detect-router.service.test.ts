import { containerContextFrom, detectRouter } from '../detect-router.service';

/** Neither package is installed here, and the real loaders answer `null` for one that is not. */
const none = () => null;

describe('detectRouter', () => {
  it('finds neither router when neither is installed', () => {
    expect(detectRouter()).toBeNull();
    expect(detectRouter({ expoRouter: none, reactNavigation: none })).toBeNull();
  });

  it('prefers Expo Router and hands over its container ref getter', () => {
    const ref = { current: null };
    const found = detectRouter({
      expoRouter: () => ({ useNavigationContainerRef: () => ref }),
      reactNavigation: () => ({}),
    });

    expect(found?.kind).toBe('expo-router');
    expect(found?.getContainerRef?.()).toBe(ref);
  });

  it('finds React Navigation, which has no ref to hand over', () => {
    expect(detectRouter({ expoRouter: none, reactNavigation: () => ({}) })).toEqual({
      kind: 'react-navigation',
    });
  });

  it('treats an Expo Router without the container hook as not there', () => {
    expect(detectRouter({ expoRouter: () => ({}), reactNavigation: none })).toBeNull();
  });
});

describe('containerContextFrom', () => {
  it('hands back the context the library exports, and nothing otherwise', () => {
    const context = { Provider: () => null };
    expect(containerContextFrom({ NavigationContainerRefContext: context })).toBe(context);
    expect(containerContextFrom({})).toBeNull();
    expect(containerContextFrom(null)).toBeNull();
  });
});
