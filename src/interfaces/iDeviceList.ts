import { iBaseDevice } from './index';

/**
 *
 */
export interface iDeviceList {
  /**
   *
   */
  readonly ids: string[];

  /**
   *
   */
  getDevices(): Array<iBaseDevice>;
}
