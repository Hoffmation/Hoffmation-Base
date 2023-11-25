import { ActuatorSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';
import { iTemporaryDisableAutomatic } from './iTemporaryDisableAutomatic';

export interface iActuator extends iRoomDevice, iTemporaryDisableAutomatic {
  /**
   * The settings for this Actuator primarily for controlling its automatic actions
   */
  settings: ActuatorSettings;

  targetAutomaticState: boolean;

  /**
   * The state value of the device
   */
  readonly actuatorOn: boolean;

  /**
   * Queued value for the actuator
   */
  queuedValue: boolean | null;

  /**
   * Persisting the current states of this device to the database
   */
  persist(): void;

  /**
   * Controls the power state of this actuator
   * @param {boolean} pValue the new desired State
   * @param {number} timeout if positive the time in ms, after which state should reset to automatic
   * @param {boolean} force if true, this command isn't overwritten by automatic actions
   * Accessible in API
   */
  setActuator(pValue: boolean, timeout?: number, force?: boolean): void;

  toggleActuator(force: boolean): boolean;
}
