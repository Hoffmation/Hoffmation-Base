import { iBaseDevice } from './iBaseDevice';
import { iRoomBase } from '../iRoomBase';

/**
 * This interface represents a device that is located in a single room.
 */
export interface iRoomDevice extends iBaseDevice {
  /**
   * The room the device is in (this might be undefined if the device is not yet properly initialized)
   */
  room: iRoomBase | undefined;
}
