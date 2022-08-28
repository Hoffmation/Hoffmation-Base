import { RoomBase } from '../../../models';
import { iBaseDevice } from './iBaseDevice';

export interface iRoomDevice extends iBaseDevice {
  room: RoomBase | undefined;
}
