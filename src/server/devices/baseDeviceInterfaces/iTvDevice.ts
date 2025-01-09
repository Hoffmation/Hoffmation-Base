import { iRoomDevice } from './iRoomDevice.js';

/**
 * This interface represents a TV device.
 *
 * For devices with {@link DeviceCapability.tv} capability.
 */
export interface iTvDevice extends iRoomDevice {
  /**
   * Whether the TV is currently on
   */
  readonly on: boolean;

  /**
   * Turns the TV on
   */
  turnOn(): void;

  /**
   * Turns the TV off
   */
  turnOff(): void;

  /**
   * Increases the volume of the TV
   */
  volumeUp(): void;

  /**
   * Decreases the volume of the TV
   */
  volumeDown(): void;
}
