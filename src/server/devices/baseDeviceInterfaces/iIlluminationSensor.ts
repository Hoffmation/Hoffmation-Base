import { iRoomDevice } from './iRoomDevice';

export interface iIlluminationSensor extends iRoomDevice {
  currentIllumination: number;
}
