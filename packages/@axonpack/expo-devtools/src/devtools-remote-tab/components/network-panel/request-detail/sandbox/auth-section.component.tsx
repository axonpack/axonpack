import type { AuthConfig, AuthType } from '../../../../../features/network/utils/sandbox.util';
import { SyncedInput } from '../../synced-input.component';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No auth' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'apikey', label: 'API key' },
];

/** A label beside each field, the way a form in a wide pane reads. */
export function AuthSection({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  const edit = (patch: Partial<AuthConfig>) => onChange({ ...auth, ...patch });

  return (
    <div className="axonpack-sbx-form">
      <span>Type</span>
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
      {auth.type === 'bearer' && (
        <>
          <span>Token</span>
          <SyncedInput
            value={auth.bearerToken}
            onChange={(bearerToken) => edit({ bearerToken })}
            placeholder="Token"
          />
        </>
      )}
      {auth.type === 'apikey' && (
        <>
          <span>Header</span>
          <SyncedInput
            value={auth.apiKeyName}
            onChange={(apiKeyName) => edit({ apiKeyName })}
            placeholder="X-API-Key"
            label="Header name"
          />
          <span>Value</span>
          <SyncedInput
            value={auth.apiKeyValue}
            onChange={(apiKeyValue) => edit({ apiKeyValue })}
            placeholder="Value"
          />
        </>
      )}
      {auth.type === 'none' && (
        <p className="axonpack-sbx-hint">The request is sent without an auth header of its own.</p>
      )}
    </div>
  );
}
