import { IBaseDevice } from './iBaseDevice';

export interface iHumiditySensor extends IBaseDevice {
  humidity: number;

  addHumidityCallback(pCallback: (pValue: number) => void): void;
}
