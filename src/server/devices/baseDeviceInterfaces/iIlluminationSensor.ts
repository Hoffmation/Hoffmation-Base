import { iRoomDevice } from './iRoomDevice';

export interface iIlluminationSensor extends iRoomDevice {
  /**
   * The current illumination level detected by the sensor
   * TODO: Add unit and make it comparable
   */
  currentIllumination: number;
}
