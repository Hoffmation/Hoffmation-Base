import { ZigbeeHeimanSmoke } from '../zigbee/index.js';
import { BaseGroup } from './base-group.js';
import { DeviceClusterType } from '../device-cluster-type.js';
import { GroupType } from './group-type.js';
import { DeviceList } from '../device-list.js';
import { iSmokeDetectorDevice } from '../baseDeviceInterfaces/index.js';

export class SmokeGroup extends BaseGroup {
  public constructor(roomName: string, smokeDetectorIds: string[]) {
    super(roomName, GroupType.Smoke);
    this.deviceCluster.deviceMap.set(DeviceClusterType.SmokeDetector, new DeviceList(smokeDetectorIds));
  }

  public getSmokeDetectors(): iSmokeDetectorDevice[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.SmokeDetector) as ZigbeeHeimanSmoke[];
  }

  public stopAlarm(): void {
    for (const d of this.getSmokeDetectors()) {
      d.stopAlarm(true);
    }
  }
}
