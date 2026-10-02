import { ICON_PATHS } from '@/lib/constants/icon-paths.const';

/** Inline SVG from the shared path data, so no icon font or runtime library is involved. */
export function Icon({ name, className = 'size-5' }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] ?? ICON_PATHS.box }}
    />
  );
}
