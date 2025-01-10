import { iRoomDevice } from './iRoomDevice';
import { TemperatureSensor } from '../../devices';
import { TemperatureSensorChangeAction } from '../../models';

export const UNDEFINED_TEMP_VALUE = -99;

/**
 * This interface represents a temperature sensor device.
 *
 * For devices with {@link DeviceCapability.temperatureSensor} capability.
 */
export interface iTemperatureSensor extends iRoomDevice {
  /**
   * Service which handles common aspects of the temperature sensor like persisting
   */
  readonly temperatureSensor: TemperatureSensor;
  /**
   * The current room temperature as a number in Celsius
   */
  roomTemperature: number;
  /**
   * The devices measured Temperature as a number in Celsius
   */
  readonly iTemperature: number;

  /**
   * Formatted Temperature as a string in Celsius
   */
  sTemperature: string;

  /**
   * Adds a callback to be called when the temperature changes
   * @param pCallback - The callback to be called
   */
  addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void;

  /**
   * Inform the temperature sensor that the temperature in the room has changed
   * @param newTemperatur - The new temperature in the room in Celsius
   */
  onTemperaturChange(newTemperatur: number): void;
}
