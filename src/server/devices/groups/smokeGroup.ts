import { ZigbeeHeimanSmoke } from '../zigbee';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';

export class SmokeGroup extends BaseGroup {
  public constructor(roomName: string, smokeDetectorIds: string[]) {
    super(roomName, GroupType.Smoke);
    this.deviceCluster.deviceMap.set(DeviceClusterType.SmokeDetector, new DeviceList(smokeDetectorIds));
  }

  public getSmokeDetectors(): ZigbeeHeimanSmoke[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.SmokeDetector) as ZigbeeHeimanSmoke[];
  }

  public stopAlarm(): void {
    for (const d of this.getSmokeDetectors()) {
      d.stopAlarm(true);
    }
  }
}
