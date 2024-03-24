import { iRoomDevice } from './iRoomDevice';

/**
 * This interface represents a illumination sensor device.
 *
 * For devices with {@link DeviceCapability.illuminationSensor} capability.
 */
export interface iIlluminationSensor extends iRoomDevice {
  /**
   * The current illumination level detected by the sensor
   * TODO: Add unit and make it comparable
   */
  currentIllumination: number;
}
