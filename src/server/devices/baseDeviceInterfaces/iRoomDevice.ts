import { RoomBase } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

// TODO: Add missing Comments
export interface iRoomDevice extends iBaseDevice {
  room: RoomBase | undefined;
}
