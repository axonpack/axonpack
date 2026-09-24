import { useState } from 'react';

import type { AuthConfig, AuthType } from '../../../../../features/network/utils/sandbox.util';
import { SyncedInput } from '../../synced-input.component';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'none' },
  { value: 'bearer', label: 'bearer' },
  { value: 'apikey', label: 'api key' },
];

/**
 * Scalar's authentication section: the type on the fold, the fields as labelled rows under it, and
 * a secret hidden until it is asked for.
 */
export function AuthSection({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  const [shown, setShown] = useState(false);
  const edit = (patch: Partial<AuthConfig>) => onChange({ ...auth, ...patch });
  const secret = (label: string, value: string, key: 'bearerToken' | 'apiKeyValue') => (
    <label className="axonpack-sbx-field">
      <span>{label}:</span>
      <SyncedInput
        value={value}
        onChange={(next) => edit({ [key]: next })}
        placeholder={key === 'bearerToken' ? 'Token' : 'Value'}
        label={label}
        type={shown ? 'text' : 'password'}
      />
      <button
        className="axonpack-net-button"
        data-icon="eye"
        aria-pressed={shown}
        title={shown ? 'Hide' : 'Show'}
        aria-label={shown ? 'Hide' : 'Show'}
        onClick={() => setShown((current) => !current)}
      />
    </label>
  );

  return (
    <details open className="axonpack-sbx-section">
      <summary>
        Authentication
        {auth.type !== 'none' && <span className="axonpack-sbx-count">1</span>}
        <span className="axonpack-sbx-summary-end">
          {/* In the fold, as Scalar has it. A select is its own control, so a click on it does not fold. */}
          <span className="axonpack-net-select">
            <select
              value={auth.type}
              aria-label="Auth type"
              onChange={(event) => edit({ type: event.target.value as AuthType })}>
              {AUTH_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </span>
        </span>
      </summary>
      {auth.type === 'none' && (
        <p className="axonpack-sbx-note">The request is sent without an auth header of its own.</p>
      )}
      {auth.type === 'bearer' && secret('Bearer Token', auth.bearerToken, 'bearerToken')}
      {auth.type === 'apikey' && (
        <>
          <label className="axonpack-sbx-field">
            <span>Header:</span>
            <SyncedInput
              value={auth.apiKeyName}
              onChange={(apiKeyName) => edit({ apiKeyName })}
              placeholder="X-API-Key"
              label="Header name"
            />
          </label>
          {secret('Value', auth.apiKeyValue, 'apiKeyValue')}
        </>
      )}
    </details>
  );
}
