/**
 * Interface for any device data updates
 */
export interface GoveeDeviceData {
  /**
   * The device id form Govee
   */
  id: string;
  /**
   * The current state
   */
  actuatorOn: boolean;
  /**
   * The active brightness
   */
  brightness: number;
  /**
   * The hex coded active color starting with #
   */
  hexColor: string;
  /**
   * The colortemp
   */
  colortemp: number;
}
