import { iBluetoothTrackingSettings } from './iBluetoothTrackingSettings.js';

/**
 * The configuration for Espresense devices (if present)
 * This can be used to monitor/tack/locate the position of certain bluetooth devices within the house.
 */
export interface iEspresenseSettings {
  /**
   * The instance of the mqtt adapter providing the data for espresense devices within ioBroker.
   */
  mqttInstance: number;
  /**
   * An map providing settings for some devices to be tracked.
   */
  deviceMap: { [folderId: string]: iBluetoothTrackingSettings };
}
