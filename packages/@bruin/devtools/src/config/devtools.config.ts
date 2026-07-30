import { patchFetch } from '../utils/network/patchFetch';
import { patchXHR } from '../utils/network/patchXHR';

export const config = () => {
  patchFetch();
  patchXHR();
};
