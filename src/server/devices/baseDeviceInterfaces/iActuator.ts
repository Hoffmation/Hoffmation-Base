import { ActuatorSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

export interface iActuator extends iRoomDevice {
  /**
   * The settings for this Actuator primarily for controlling its automatic actions
   */
  settings: ActuatorSettings;

  /**
   * The state value of the device
   */
  readonly actuatorOn: boolean;

  /**
   * Persisting the current states of this device to the database
   */
  persist(): void;

  /**
   * Controls the power state of this actuator
   * @param {boolean} pValue the new desired State
   * @param {number} timeout if positive the time in ms, after which state should reset
   * @param {boolean} force if true, this command isn't overwritten by automatic actions
   * Accessible in API
   */
  setActuator(pValue: boolean, timeout?: number, force?: boolean): void;

  toggleActuator(force: boolean): boolean;
}
