/** A typed number with anything that is not a digit dropped, and 0 for nothing at all. */
export function parsePositiveInt(text: string): number {
  const parsed = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
