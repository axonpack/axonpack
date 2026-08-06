export const USER_AGENT_PRESET_IDS = [
  'default',
  'ios-safari',
  'android-chrome',
  'macos-chrome',
  'windows-chrome',
  'googlebot',
  'custom',
] as const;

export type UserAgentPresetId = (typeof USER_AGENT_PRESET_IDS)[number];

export const USER_AGENT_PRESET_LABELS: Record<UserAgentPresetId, string> = {
  default: 'Default',
  'ios-safari': 'iPhone Safari',
  'android-chrome': 'Android Chrome',
  'macos-chrome': 'Chrome (macOS)',
  'windows-chrome': 'Chrome (Windows)',
  googlebot: 'Googlebot',
  custom: 'Custom',
};

/**
 * A short curated list rather than an exhaustive device catalog — these cover the cases worth
 * testing against server-side UA sniffing. `default` (no override) and `custom` (free text)
 * intentionally have no fixed value.
 */
export const USER_AGENT_PRESET_VALUES: Partial<Record<UserAgentPresetId, string>> = {
  'ios-safari':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'android-chrome':
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'macos-chrome':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'windows-chrome':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};
