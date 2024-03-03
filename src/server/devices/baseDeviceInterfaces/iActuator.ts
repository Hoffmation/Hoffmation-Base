import { ActuatorSetStateCommand, ActuatorSettings, ActuatorToggleCommand } from '../../../models';
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
   * Accessible in API
   * @param command
   */
  setActuator(command: ActuatorSetStateCommand): void;

  toggleActuator(command: ActuatorToggleCommand): boolean;
}
