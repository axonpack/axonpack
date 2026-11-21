'use client';

import { useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { content } from '@/lib/services/content.service';

/** Bump the key when the notice changes, so a new one shows to people who closed the old one. */
const KEY = 'notice-dismissed:axon-shaft';

/**
 * The strip above the nav. It shows until someone closes it, and remembers that in localStorage.
 * Storage can be missing or throw (private windows, blocked site data), and then it simply shows.
 */
const dismissed = () => {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false; // No storage: keep showing it.
  }
};
const onStorage = (change: () => void) => {
  window.addEventListener('storage', change);
  return () => window.removeEventListener('storage', change);
};

export function NoticeBar() {
  const { notice } = content;
  // The static HTML always has the bar; the browser hides it if it was closed before.
  const closedBefore = useSyncExternalStore(onStorage, dismissed, () => false);
  const [closed, setClosed] = useState(false);
  const open = !closed && !closedBefore;

  if (!open) return null;

  return (
    <section
      aria-label="Announcement"
      className="relative bg-fd-primary px-12 py-2 text-center text-sm text-fd-primary-foreground"
    >
      <p className="text-pretty">
        {notice.text}{' '}
        <a href={notice.link.href} className="font-medium whitespace-nowrap underline underline-offset-4">
          {notice.link.label}
        </a>
      </p>
      <button
        type="button"
        aria-label="Close the announcement"
        onClick={() => {
          setClosed(true);
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            // No storage: it comes back on the next visit.
          }
        }}
        className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-current"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
