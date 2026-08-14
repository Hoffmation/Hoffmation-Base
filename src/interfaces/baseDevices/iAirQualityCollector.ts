import { iRoomDevice } from './iRoomDevice';
import { AirQualitySensorChangeAction } from '../../action';
import { iAirQualityReadings, iAirQualitySensor } from './iAirQualitySensor';

/**
 * This interface represents a device measuring air quality.
 *
 * For devices with {@link DeviceCapability.airQualitySensor} capability.
 */
export interface iAirQualityCollector extends iRoomDevice {
  /**
   * Service which handles common aspects of the air quality sensor like persisting
   */
  readonly airQualitySensor: iAirQualitySensor;
  /**
   * The most recent air quality readings of this device
   */
  readonly airQuality: iAirQualityReadings;

  /**
   * Add a callback that is called when any air quality reading changes
   * @param pCallback - The callback to fire
   */
  addAirQualityCallback(pCallback: (action: AirQualitySensorChangeAction) => void): void;
}
