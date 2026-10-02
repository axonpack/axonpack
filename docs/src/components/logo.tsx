import Image from 'next/image';
import logo from '../../public/logo.png';
import logoDark from '../../public/assets/logo-dark.png';

/**
 * The mark swaps with the theme instead of sitting on a tile. One of its two strokes is black, so
 * the transparent light version loses half the letter on a dark background. Both images render and
 * CSS picks one, so it is already correct on the first paint rather than after hydration.
 */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <>
      <Image src={logo} alt="" width={size} height={size} className="rounded-md dark:hidden" />
      <Image
        src={logoDark}
        alt=""
        width={size}
        height={size}
        className="hidden rounded-md dark:block"
      />
    </>
  );
}
