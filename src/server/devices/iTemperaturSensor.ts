import { IBaseDevice } from './iBaseDevice';

export interface iTemperaturSensor extends IBaseDevice {
  // Temperatur as a number in Celsius
  iTemperatur: number;

  // Temperatur as a string in Celsius
  sTemperatur: string;
}
