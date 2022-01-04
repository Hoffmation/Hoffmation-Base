import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';

export interface iTemperaturSensor extends IoBrokerBaseDevice {
  // Temperatur as a number in Celsius
  iTemperatur: number;

  // Temperatur as a string in Celsius
  sTemperatur: string;
}
