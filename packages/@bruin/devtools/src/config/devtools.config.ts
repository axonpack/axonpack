import { patchFetch } from '../utils/network/patchFetch';
import { patchXHR } from '../utils/network/patchXHR';

export type DevtoolsNetworkConfig = {
  includeFetch?: boolean;
  includeXmlHttpRequest?: boolean;
  /** Reserved for a future custom network event hook; not implemented yet. */
  customNetworkEvent?: string;
};

export type DevtoolsConfig = {
  network?: DevtoolsNetworkConfig;
};

export const config = (options?: DevtoolsConfig) => {
  const { includeFetch = true, includeXmlHttpRequest = true } = options?.network ?? {};

  if (includeFetch) patchFetch();
  if (includeXmlHttpRequest) patchXHR();
};
