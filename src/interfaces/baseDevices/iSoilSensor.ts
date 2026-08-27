import { iJsonOmitKeys } from '../iJsonOmitKeys';
import { SoilSensorChangeAction } from '../../action';

/**
 * Common handling for a device measuring the moisture of the soil it sits in.
 *
 * Deliberately its own axis rather than a second {@link iHumiditySensor}: a device can measure the moisture of
 * the soil and the humidity of the air around it at the same time, and those are two different quantities that
 * happen to share a unit. Sharing the slot would force one of the two readings out.
 */
export interface iSoilSensor extends iJsonOmitKeys {
  /**
   * The current soil moisture in percent, or {@link UNDEFINED_SOIL_MOISTURE_VALUE} while nothing was reported
   */
  soilMoisture: number;

  /**
   * Persists the current soil moisture to the database
   */
  persist(): void;

  /**
   * Adds a callback to be called when the soil moisture changes
   * @param pCallback - The callback to be called
   */
  addSoilMoistureCallback(pCallback: (action: SoilSensorChangeAction) => void): void;

  /**
   * Frees up the resources of this sensor
   */
  dispose(): void;

  /**
   * @returns The serializable representation of this sensor
   */
  toJSON(): Partial<iSoilSensor>;
}
