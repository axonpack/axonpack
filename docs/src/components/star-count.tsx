'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { content } from '@/lib/services/content.service';
import { formatStars, starLabel } from '@/lib/services/packages.service';

// One request per page load, shared by the nav and the hero. Unauthenticated GitHub allows 60 an
// hour per IP, and a visitor who burns that keeps the build-time count.
let inFlight: Promise<number | null> | undefined;

const readStars = () =>
  (inFlight ??= fetch(`https://api.github.com/repos/${content.nav.github.repo}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => (typeof body?.stargazers_count === 'number' ? body.stargazers_count : null))
    .catch(() => null));

/**
 * The site is a static export rebuilt once a day, so the count baked in at build time is a day
 * stale at worst. This re-reads it in the browser, and leaves the built-in number when it cannot.
 *
 * `children` sits inside the same span as the count, for a caller whose chip is one bordered box
 * around an icon and a number: hiding the number has to hide the box too.
 */
export function StarCount({ className, children }: { className?: string; children?: ReactNode }) {
  const [label, setLabel] = useState(starLabel);

  useEffect(() => {
    readStars().then((count) => {
      if (count !== null) setLabel(formatStars(count));
    });
  }, []);

  if (label === null) return null;

  return (
    <span className={className}>
      {children}
      {label}
    </span>
  );
}
