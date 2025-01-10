/**
 * Settings for tracking a bluetooth device using {@link iBluetoothDetector}
 */
export interface iBluetoothTrackingSettings {
  /**
   * The name of the device to track
   */
  customName: string;
  /**
   * Whether to track the device
   */
  activeTracking: boolean;
}
