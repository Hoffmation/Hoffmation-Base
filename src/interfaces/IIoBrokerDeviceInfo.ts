import { iDeviceConfig } from './iDeviceConfig';
import { iDeviceInfo } from './iDeviceInfo';

export interface iIoBrokerDeviceInfo extends iDeviceInfo {
  devID: string;
  deviceType: string;
  deviceRoomIndex: number;
  type: 'device' | 'channel' | 'state';
  fullID: string;
  devConf: iDeviceConfig;

  toJSON(): Partial<iIoBrokerDeviceInfo>;
}
