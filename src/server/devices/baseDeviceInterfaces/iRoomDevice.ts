import { RoomBase } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

// TODO: Add missing Comments
export interface iRoomDevice extends iBaseDevice {
  /**
   * The room the device is in (this might be undefined if the device is not yet properly initialized)
   */
  room: RoomBase | undefined;
}
