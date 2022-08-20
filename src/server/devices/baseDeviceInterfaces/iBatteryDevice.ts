import { iBaseDevice } from './iBaseDevice';

export interface iBatteryDevice extends iBaseDevice {
  battery: number;
}
