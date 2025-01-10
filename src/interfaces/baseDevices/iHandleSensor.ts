import { iRoomDevice } from './iRoomDevice';
import { WindowPosition } from '../../enums';
import { HandleSensor, Window } from '../../devices';
import { HandleChangeAction } from '../../action';

/**
 * Interface for Handle Sensors.
 * A handle sensor can be any device that is capable of detecting the position of a window handle e.g. a sensor, a window handle, etc.
 *
 * For devices with {@link DeviceCapability.handleSensor} capability.
 */
export interface iHandleSensor extends iRoomDevice {
  /**
   * A common object for all handle sensors handling stuff like persist and callbacks
   */
  handleSensor: HandleSensor;
  /**
   * The current position of the handle
   */
  position: WindowPosition;
  /**
   * The time the handle was open in minutes
   */
  minutesOpen: number;

  /**
   * If known the window this handle is attached to
   */
  window: Window | undefined;

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

  /**
   * Add a callback that is called when the handle is changed to any position
   * @param cb - The callback to fire
   */
  addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void;
}
