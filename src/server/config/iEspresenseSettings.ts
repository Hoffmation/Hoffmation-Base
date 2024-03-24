import { iBluetoothTrackingSettings } from './iBluetoothTrackingSettings';

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
