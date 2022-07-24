import { IBaseDevice } from './iBaseDevice';

export const UNDEFINED_HUMIDITY_VALUE = -1;

export interface iHumiditySensor extends IBaseDevice {
  humidity: number;

  addHumidityCallback(pCallback: (pValue: number) => void): void;
}
