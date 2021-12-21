import { ZigbeeAquaraWater } from '../zigbee/zigbeeAquaraWater';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';

export class WaterGroup extends BaseGroup {
  public getWaterDetectors(): ZigbeeAquaraWater[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.WaterDetectors) as ZigbeeAquaraWater[];
  }

  public constructor(roomName: string, waterDetectorIds: string[]) {
    super(roomName, GroupType.Water);
    this.deviceCluster.deviceMap.set(DeviceClusterType.WaterDetectors, new DeviceList(waterDetectorIds));
  }

  public stopAlarm(): void {
    for (const d of this.getWaterDetectors()) {
      d.stopAlarm(true);
    }
  }
}
