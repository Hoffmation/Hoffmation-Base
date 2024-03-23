import { LampSetLightCommand, LampSetTimeBasedCommand, LampToggleLightCommand } from '../../../models';
import { iActuator } from './iActuator';

// TODO: Add missing Comments
export interface iLamp extends iActuator {
  /**
   * The state value of the device
   */
  readonly lightOn: boolean;

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
