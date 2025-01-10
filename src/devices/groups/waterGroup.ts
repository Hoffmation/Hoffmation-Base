import { ZigbeeAquaraWater } from '../zigbee';
import { DeviceClusterType, GroupType } from '../../enums';
import { DeviceList } from '../device-list';
import { BaseGroup } from './base-group';
import { iWaterGroup } from '../../interfaces';

export class WaterGroup extends BaseGroup implements iWaterGroup {
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
