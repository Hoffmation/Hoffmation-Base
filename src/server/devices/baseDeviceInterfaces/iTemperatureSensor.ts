import { iBaseDevice } from './iBaseDevice';

export const UNDEFINED_TEMP_VALUE = -99;

export interface iTemperatureSensor extends iBaseDevice {
  // Temperature as a number in Celsius
  iTemperature: number;

  // Temperature as a string in Celsius
  sTemperature: string;

  addTempChangeCallback(pCallback: (pValue: number) => void): void;
}
