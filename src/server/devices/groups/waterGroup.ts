import { ZigbeeAquaraWater } from '../zigbee/index.js';
import { BaseGroup } from './base-group.js';
import { DeviceClusterType } from '../device-cluster-type.js';
import { GroupType } from './group-type.js';
import { DeviceList } from '../device-list.js';

export class WaterGroup extends BaseGroup {
  public constructor(roomName: string, waterDetectorIds: string[]) {
    super(roomName, GroupType.Water);
    this.deviceCluster.deviceMap.set(DeviceClusterType.WaterDetectors, new DeviceList(waterDetectorIds));
  }

  public getWaterDetectors(): ZigbeeAquaraWater[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.WaterDetectors) as ZigbeeAquaraWater[];
  }

  public stopAlarm(timeout: number = 3600000): void {
    for (const d of this.getWaterDetectors()) {
      d.stopAlarm(true, timeout);
    }
  }
}
