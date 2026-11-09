'use client';

import { useEffect, useState } from 'react';
import { Caveat } from 'next/font/google';

const hand = Caveat({ subsets: ['latin'] });

/**
 * The hand-drawn note under the header's GitHub link. It shows for the first 512px of the page,
 * about the hero's height, and hides below that.
 */
export function StarHint() {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY <= 512);
    // A reload can put the page back where it was, part way down.
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`${hand.className} pointer-events-none absolute top-full right-1/2 flex items-end text-fd-primary transition-opacity duration-500 motion-reduce:transition-none max-lg:hidden ${shown ? '' : 'opacity-0'}`}
    >
      <span className="-mb-1.5 text-xl whitespace-nowrap -rotate-6">Leave a star!</span>
      <svg
        viewBox="0 0 60 44"
        className="h-11 w-15"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 37c15 4 32 3 41-8 6-7 9-15 9-25" />
        <path d="M46 10l7-7 4 9" />
      </svg>
    </div>
  );
}
