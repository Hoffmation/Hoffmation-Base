import { iRoomDevice } from './iRoomDevice';

export const UNDEFINED_HUMIDITY_VALUE = -1;

// TODO: Add missing Comments
export interface iHumiditySensor extends iRoomDevice {
  readonly persistHumiditySensorInterval: NodeJS.Timeout;
  readonly humidity: number;

  /**
   * Add a callback that is called when the humidity changes
   * @param {(pValue: number) => void} pCallback - The callback to fire
   */
  addHumidityCallback(pCallback: (pValue: number) => void): void;

  /**
   * Persists the current humidity information to the database
   */
  persistHumiditySensor(): void;
}
