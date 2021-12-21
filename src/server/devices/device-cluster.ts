import { DeviceClusterType } from './device-cluster-type';
import { DeviceList } from './device-list';

export class DeviceCluster {
  public constructor(public deviceMap: Map<DeviceClusterType, DeviceList>) {}
}
