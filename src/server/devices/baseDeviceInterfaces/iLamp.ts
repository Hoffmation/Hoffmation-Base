import { LampSetLightCommand, LampSetTimeBasedCommand, LampToggleLightCommand } from '../../../models';
import { iActuator } from './iActuator';

// TODO: Add missing Comments
/**
 * This interface represents a lamp device.
 *
 * For devices with {@link DeviceCapability.lamp} capability.
 */
export interface iLamp extends iActuator {
  /**
   * The state value of the device
   */
  readonly lightOn: boolean;

  /**
   * Changes the state of the lamp based on the time
   * @param {LampSetTimeBasedCommand} command - The command to execute
   */
  setTimeBased(command: LampSetTimeBasedCommand): void;

  /**
   * Toggles the state of the lamp
   * @param command
   */
  toggleLight(command: LampToggleLightCommand): void;

  /**
   * This function sets the light to a specific value
   * Accessible in API
   * @param command
   */
  setLight(command: LampSetLightCommand): void;
}
