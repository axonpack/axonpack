/** A network this device is on, as native reports it: its own IPv4 address and prefix length. */
export type LocalNetwork = { address: string; prefixLength: number };

/**
 * The other addresses on this device's network that the sweep asks: its own /24, or the smaller
 * network when the prefix is longer than 24. A bigger network is cut to the /24, so a sweep stays
 * a few hundred requests.
 */
export function sweepRange({ address, prefixLength }: LocalNetwork): string[] {
  const octets = address.split(".").map(Number);
  const own = octets[3];
  const size = 2 ** (32 - Math.min(Math.max(prefixLength, 24), 32));
  const first = own - (own % size);
  // The network and broadcast addresses are no device's, except in a /31, which has neither.
  const skip = size > 2 ? 1 : 0;
  const base = octets.slice(0, 3).join(".");
  const range: string[] = [];
  for (let last = first + skip; last < first + size - skip; last++)
    if (last !== own) range.push(`${base}.${last}`);
  return range;
}
