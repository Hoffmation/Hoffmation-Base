import { iRoomDevice } from './iRoomDevice';

export const UNDEFINED_HUMIDITY_VALUE = -1;

export interface iHumiditySensor extends iRoomDevice {
  humidity: number;

  addHumidityCallback(pCallback: (pValue: number) => void): void;
}
