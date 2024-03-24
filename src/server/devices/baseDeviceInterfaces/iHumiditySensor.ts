import { iRoomDevice } from './iRoomDevice';

export const UNDEFINED_HUMIDITY_VALUE = -1;

/**
 * This interface represents a humidity sensor device.
 *
 * For devices with {@link DeviceCapability.humiditySensor} capability.
 */
export interface iHumiditySensor extends iRoomDevice {
  /**
   * The interval to persist the humidity sensor information
   * This mainly enforces the interval to be implemented.
   */
  readonly persistHumiditySensorInterval: NodeJS.Timeout;
  /**
   * The current humidity in percent
   */
  readonly humidity: number;

  /**
   * Add a callback that is called when the humidity changes
   * @param pCallback - The callback to fire
   */
  addHumidityCallback(pCallback: (pValue: number) => void): void;

  /**
   * Persists the current humidity information to the database
   */
  persistHumiditySensor(): void;
}
