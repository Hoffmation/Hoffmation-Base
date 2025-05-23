// TODO: Migrate to new Command Structure
import { iRoomDevice } from './iRoomDevice';
import { iGarageDoorOpenerSettings } from '../deviceSettings';

/**
 * This interface represents a garage door opener device.
 *
 * For devices with {@link DeviceCapability.garageDoorOpener} capability.
 */
export interface iGarageDoorOpener extends iRoomDevice {
  /**
   * The settings of the garage door opener
   */
  settings: iGarageDoorOpenerSettings;

  /**
   * Whether the garage door is currently closed
   */
  readonly isClosed: boolean;

  /**
   * Open the garage door
   */
  open(): void;

  /**
   * Close the garage door
   */
  close(): void;

  /**
   * Trigger the garage door.
   * This mostly results in driving the door to the opposite state, but if fired rapidly, it might stop the door in the middle.
   */
  trigger(): void;
}
