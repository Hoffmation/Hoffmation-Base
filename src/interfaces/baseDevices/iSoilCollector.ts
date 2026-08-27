import { iRoomDevice } from './iRoomDevice';
import { SoilSensorChangeAction } from '../../action';
import { iSoilSensor } from './iSoilSensor';

/**
 * This interface represents a device measuring the moisture of the soil it sits in.
 *
 * For devices with {@link DeviceCapability.soilSensor} capability.
 */
export interface iSoilCollector extends iRoomDevice {
  /**
   * Service which handles common aspects of the soil sensor like persisting
   */
  readonly soilSensor: iSoilSensor;
  /**
   * The current soil moisture in percent
   */
  readonly soilMoisture: number;

  /**
   * Add a callback that is called when the soil moisture changes
   * @param pCallback - The callback to fire
   */
  addSoilMoistureCallback(pCallback: (action: SoilSensorChangeAction) => void): void;
}
