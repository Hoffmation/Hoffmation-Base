import { ActuatorSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

export interface iActuator extends iRoomDevice {
  settings: ActuatorSettings;
  actuatorOn: boolean;

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
