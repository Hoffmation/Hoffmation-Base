import { DeviceClusterType } from '../enums';
import { iDeviceList } from './iDeviceList';
import { iIoBrokerBaseDevice } from './iIoBrokerBaseDevice';
import { iBaseDevice } from './baseDevices';

/**
 *
 */
export interface iDeviceCluster {
  /**
   *
   */
  deviceMap: Map<DeviceClusterType, iDeviceList>;

  /**
   *
   */
  getIoBrokerDevicesByType(type: DeviceClusterType): iIoBrokerBaseDevice[];

  /**
   *
   */
  getDevicesByType(type: DeviceClusterType): Array<iBaseDevice>;

  /**
   *
   */
  addByDeviceType(device?: iBaseDevice): void;

  /**
   *
   */
  addToList(type: DeviceClusterType, device: iBaseDevice): void;

  /**
   *
   */
  toJSON(): Partial<
    iDeviceCluster & {
      /**
       * Dictionary representation of the normal device map
       */
      deviceDict?: { [p: string]: iDeviceList };
    }
  >;
}
