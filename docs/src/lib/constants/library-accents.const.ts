// One accent per library so a grid stays scannable instead of reading as identical boxes.
// Applied as a solid icon colour, never a background wash. Assigned by index, so a new package
// needs no colour decision before it can ship.
export const LIBRARY_ACCENTS = [
  "text-sky-500",
  "text-violet-500",
  "text-emerald-500",
  "text-amber-500",
  "text-rose-500",
  "text-cyan-500",
] as const;
