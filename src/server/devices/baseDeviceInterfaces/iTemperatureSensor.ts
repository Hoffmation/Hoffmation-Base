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

  /**
   * Adds a callback to be called when the temperature changes
   * @param {(pValue: number) => void} pCallback - The callback to be called
   */
  addTempChangeCallback(pCallback: (pValue: number) => void): void;

  /**
   * Inform the temperature sensor that the temperature in the room has changed
   * @param {number} newTemperatur - The new temperature in the room in Celsius
   */
  onTemperaturChange(newTemperatur: number): void;

  /**
   * Persists the current temperature sensor information to the database
   */
  persistTemperaturSensor(): void;
}
