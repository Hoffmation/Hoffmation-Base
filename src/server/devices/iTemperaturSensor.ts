import { IBaseDevice } from './iBaseDevice';

export const UNDEFINED_TEMP_VALUE = -99;

export interface iTemperaturSensor extends IBaseDevice {
  // Temperatur as a number in Celsius
  iTemperatur: number;

  // Temperatur as a string in Celsius
  sTemperatur: string;

  addTempChangeCallback(pCallback: (pValue: number) => void): void;
}
