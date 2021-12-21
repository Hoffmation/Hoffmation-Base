import { DeviceClusterType } from './device-cluster-type';
import { DeviceList } from './device-list';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { OwnSonosDevice } from '../services/Sonos/sonos-service';

export class DeviceCluster {
  public constructor(public deviceMap: Map<DeviceClusterType, DeviceList> = new Map<DeviceClusterType, DeviceList>()) {}

  public getIoBrokerDevicesByType(type: DeviceClusterType): IoBrokerBaseDevice[] {
    if (type === DeviceClusterType.Speaker) {
      throw new Error(`This is no IoBroker Device`);
    }
    return this.getDevicesByType(type) as Array<IoBrokerBaseDevice>;
  }

  public getDevicesByType(type: DeviceClusterType): Array<IoBrokerBaseDevice | OwnSonosDevice> {
    return this.deviceMap.get(type)?.getDevices() ?? [];
  }
}
