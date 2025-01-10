import { ActuatorSetStateCommand, ActuatorToggleCommand, ActuatorWriteStateToDeviceCommand } from '../../command';
import { iRoomDevice } from './iRoomDevice';
import { iTemporaryDisableAutomatic } from './iTemporaryDisableAutomatic';
import { iActuatorSettings } from '../deviceSettings';

/**
 * Interface for Actuators.
 * An actuator can be any device whos primary function is to be on or off e.g a light, an outlet, a fan, etc.
 *
 * For devices with {@link DeviceCapability.actuator} capability.
 */
export interface iActuator extends iRoomDevice, iTemporaryDisableAutomatic {
  /**
   * The settings for this Actuator primarily for controlling its automatic actions
   */
  settings: iActuatorSettings;

  /**
   * The target automatic state of the device.
   * This is used to store the state the device should be in to fall back to it after automatic was blocked e.g. by a user.
   */
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

  /**
   * Toggles the power state of this actuator
   * @param command
   */
  toggleActuator(command: ActuatorToggleCommand): boolean;

  /**
   * Writes the desired actuator state to the device
   * @param command
   */
  writeActuatorStateToDevice(command: ActuatorWriteStateToDeviceCommand): void;
}
