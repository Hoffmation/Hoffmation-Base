import { iRoomDevice } from './iRoomDevice';
import { TemperatureSensorChangeAction } from '../../../models';
import { TemperatureSensorService } from '../sharedFunctions';

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
  readonly temperatureSensorService: TemperatureSensorService;
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

  /**
   * Persists the current temperature sensor information to the database
   */
  persistTemperaturSensor(): void;
}
