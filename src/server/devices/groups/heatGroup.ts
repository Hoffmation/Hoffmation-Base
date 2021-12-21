import { HmIpHeizgruppe } from '../hmIPDevices/hmIpHeizgruppe';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';

export class HeatGroup extends BaseGroup {
  public get currentTemp(): number {
    if (this.getHeater().length === 0) {
      return -99;
    }
    let value: number = 0;
    for (const h of this.getHeater()) {
      value += h.iTemperatur;
    }
    return Math.round((value / this.getHeater().length) * 10) / 10;
  }

  public get desiredTemp(): number {
    if (this.getHeater().length === 0) {
      return -99;
    }
    let value: number = 0;
    for (const h of this.getHeater()) {
      value += h.desiredTemperatur;
    }
    return Math.round((value / this.getHeater().length) * 10) / 10;
  }

  public getHeater(): HmIpHeizgruppe[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.Heater) as HmIpHeizgruppe[];
  }

  public constructor(roomName: string, heaterIds: string[]) {
    super(roomName, GroupType.Heating);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Heater, new DeviceList(heaterIds));
  }
}
