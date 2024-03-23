import { iRoomDevice } from './iRoomDevice';

export const UNDEFINED_TEMP_VALUE = -99;

// TODO: Add missing Comments
export interface iTemperatureSensor extends iRoomDevice {
  readonly persistTemperatureSensorInterval: NodeJS.Timeout;
  roomTemperature: number;
  // Temperature as a number in Celsius
  iTemperature: number;

  // Temperature as a string in Celsius
  sTemperature: string;

  addTempChangeCallback(pCallback: (pValue: number) => void): void;

  onTemperaturChange(newTemperatur: number): void;

  persistTemperaturSensor(): void;
}
