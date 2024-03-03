import { LampSetLightCommand, LampToggleLightCommand, TimeOfDay } from '../../../models';
import { iActuator } from './iActuator';

export interface iLamp extends iActuator {
  /**
   * The state value of the device
   */
  readonly lightOn: boolean;

  /**
   * Set's the lamp based on lamp settings for the current time
   * @param {TimeOfDay} time The time to use for calculation of desired state
   * @param {number} timeout If > 0 this is the time after which the lamp reverts to its original state
   * @param {boolean} force To indicate a higher priority than automatic actions (e.g. a user pressing a button)
   */
  setTimeBased(time: TimeOfDay, timeout?: number, force?: boolean): void;

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
