import { iBaseDevice } from './iBaseDevice';

export const UNDEFINED_HUMIDITY_VALUE = -1;

export interface iHumiditySensor extends iBaseDevice {
  humidity: number;

  addHumidityCallback(pCallback: (pValue: number) => void): void;
}
