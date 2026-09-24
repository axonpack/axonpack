import { SyncedInput } from '../../synced-input.component';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** One bar, as an API client draws it: the method, the URL, and Send at the end. */
export function AddressBar({
  method,
  url,
  sending,
  onMethod,
  onUrl,
  onSend,
}: {
  method: string;
  url: string;
  sending: boolean;
  onMethod: (method: string) => void;
  onUrl: (url: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="axonpack-sbx-address">
      {/* Coloured by method in the CSS, with the app's colours for each. */}
      <span className="axonpack-sbx-method" data-method={method}>
        <select
          value={method}
          aria-label="Method"
          onChange={(event) => onMethod(String(event.target.value))}>
          {/* The captured method is kept even when it is not one of the five offered. */}
          {[...new Set([method, ...METHODS])].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </span>
      <span className="axonpack-sbx-url">
        <SyncedInput value={url} onChange={onUrl} placeholder="Enter a URL" label="URL" />
      </span>
      <button className="axonpack-sbx-send" disabled={sending || !url.trim()} onClick={onSend}>
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
}
