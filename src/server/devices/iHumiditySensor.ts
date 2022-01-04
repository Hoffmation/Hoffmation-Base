import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';

export interface iHumiditySensor extends IoBrokerBaseDevice {
  humidity: number;
}
