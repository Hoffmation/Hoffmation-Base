import { iRoomDevice } from './iRoomDevice';
import { HumiditySensor } from '../sharedFunctions';
import { HumiditySensorChangeAction } from '../../models/action';

export const UNDEFINED_HUMIDITY_VALUE = -1;

/**
 * This interface represents a humidity sensor device.
 *
 * For devices with {@link DeviceCapability.humiditySensor} capability.
 */
export interface iHumiditySensor extends iRoomDevice {
  /**
   * Common humidity sensor handling like persisting
   */
  readonly humiditySensor: HumiditySensor;
  /**
   * The current humidity in percent
   */
  readonly humidity: number;

  /**
   * Add a callback that is called when the humidity changes
   * @param pCallback - The callback to fire
   */
  addHumidityCallback(pCallback: (action: HumiditySensorChangeAction) => void): void;
}
