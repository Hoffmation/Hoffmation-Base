import { iSmokeDetectorDevice } from '../../interfaces';
import { BaseGroup } from './base-group';
import { DeviceClusterType, GroupType } from '../../enums';
import { DeviceList } from '../device-list';
import { ZigbeeHeimanSmoke } from '../zigbee';

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
