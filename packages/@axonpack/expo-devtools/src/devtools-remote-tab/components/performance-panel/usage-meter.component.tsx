import { formatSize } from '../../../core/utils/format-bytes.util';

export function UsageMeter({
  label,
  usedBytes,
  totalBytes,
  caption,
}: {
  label: string;
  usedBytes?: number;
  totalBytes?: number;
  caption?: string;
}) {
  const known = usedBytes !== undefined && totalBytes !== undefined && totalBytes > 0;
  const fraction = known ? Math.min(1, Math.max(0, usedBytes / totalBytes)) : 0;

  return (
    <div className="axonpack-perf-meter">
      <div className="axonpack-perf-meter-row">
        <strong>{label}</strong>
        <span className="axonpack-perf-muted">
          {known ? `${formatSize(usedBytes)} of ${formatSize(totalBytes)}` : '–'}
        </span>
      </div>
      <div className="axonpack-perf-meter-track">
        <div style={{ width: `${fraction * 100}%` }} />
      </div>
      <div className="axonpack-perf-meter-row axonpack-perf-muted">
        <span>{caption ?? ''}</span>
        <span>{known ? `${Math.round(fraction * 100)}%` : ''}</span>
      </div>
    </div>
  );
}
