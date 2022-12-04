import { iBluetoothTrackingSettings } from './iBluetoothTrackingSettings';

export interface iEspresenseSettings {
  mqttInstance: number;
  deviceMap: { [folderId: string]: iBluetoothTrackingSettings };
}
