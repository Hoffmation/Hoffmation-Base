import { iAcSettings } from '../deviceSettings';
import { iBaseDevice } from './iBaseDevice';
import { AcMode } from '../../enums';
import { AcSetStateCommand, AcWriteStateToDeviceCommand } from '../../command';

/**
 * Interface for normal air-conditioning devices
 *
 * For devices with {@link DeviceCapability.ac} capability.
 * TODO: Extend from iActuator
 */
export interface iAcDevice extends iBaseDevice {
  /**
   *
   */
  heatingAllowed: boolean;
  /**
   * The settings of the air-conditioning device
   */
  settings: iAcSettings;
  /**
   * Whether the air-conditioning device is currently on
   */
  readonly on: boolean;
  /**
   * The temperature of the room where this device is located
   */
  readonly roomTemperature: number;
  /**
   * The current temperature of the air-conditioning device in degrees Celsius
   */
  readonly temperature: number;
  /**
   * The current state of the air-conditioning device
   */
  readonly mode: AcMode;

  /**
   *
   */
  initializeRoomCbs(): void;

  /**
   * This function should be called to inform the air-conditioning device about a change of the room temperature
   * @param newTemperatur - The new temperature of the room in degrees Celsius
   */
  onTemperaturChange(newTemperatur: number): void;

  /**
   * Updates the desired mode of the air-conditioning device and writes it to the device if desired
   * @param mode - The new desired mode
   * @param writeToDevice - Whether to write the new mode to the device
   */
  setDesiredMode(mode: AcMode, writeToDevice: boolean): void;

  /**
   * Performs a power write, applying any automatic block the command carries
   * @param c - The command to execute
   */
  writeStateToDevice(c: AcWriteStateToDeviceCommand): void;

  /**
   * Turns the air-conditioning device on without changing the settings
   * @param c - The command to execute
   */
  turnOn(c: AcWriteStateToDeviceCommand): void;

  /**
   * Turns the air-conditioning device off
   * @param c - The command to execute
   */
  turnOff(c: AcWriteStateToDeviceCommand): void;

  /**
   * Calculates the desired mode based on the current settings and the room temperature
   * @returns The desired mode
   */
  calculateDesiredMode(): AcMode;

  /**
   * Sets the state of the air-conditioning device.
   *
   * Single entry point for every state change, so each one is recorded in the command log.
   * @param c - The command to execute
   */
  setAcState(c: AcSetStateCommand): void;
}
