import { WindowPosition } from '../models';
import { iRoomDevice } from './iRoomDevice';

/**
 * Interface for Handle Sensors.
 * A handle sensor can be any device that is capable of detecting the position of a window handle e.g. a sensor, a window handle, etc.
 *
 * For devices with {@link DeviceCapability.handleSensor} capability.
 */
export interface iHandleSensor extends iRoomDevice {
  /**
   * The current position of the handle
   */
  position: WindowPosition;
  /**
   * The time the handle was open in minutes
   */
  minutesOpen: number;

  /**
   * Add a callback that is called when the handle is change to open
   * @param pCallback - The callback to fire
   */
  addOffenCallback(pCallback: (pValue: boolean) => void): void;

  /**
   * Add a callback that is called when the handle is changed to ajar
   * @param pCallback - The callback to fire
   */
  addKippCallback(pCallback: (pValue: boolean) => void): void;

  /**
   * Add a callback that is called when the handle is changed to closed
   * @param pCallback - The callback to fire
   */
  addClosedCallback(pCallback: (pValue: boolean) => void): void;
}
