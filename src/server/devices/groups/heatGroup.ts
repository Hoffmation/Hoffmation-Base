import { HmIpHeizgruppe } from '../hmIPDevices/hmIpHeizgruppe';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import { iTemperaturSensor } from '../iTemperaturSensor';
import { iHumiditySensor } from '../iHumiditySensor';

export class HeatGroup extends BaseGroup {
  public get currentTemp(): number {
    if (this.getHeater().length === 0) {
      return -99;
    }
    let value: number = 0;
    const sensors: iTemperaturSensor[] = this.getTempSensors();
    for (const h of sensors) {
      value += h.iTemperatur;
    }
    return Math.round((value / sensors.length) * 10) / 10;
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

  public getTempSensors(): iTemperaturSensor[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.TemperaturSensor) as iTemperaturSensor[];
  }

  public getHumiditySensors(): iHumiditySensor[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.HumiditySensor) as iHumiditySensor[];
  }

  public constructor(roomName: string, heaterIds: string[], tempSensorIds: string[], humiditySensorIds: string[]) {
    super(roomName, GroupType.Heating);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Heater, new DeviceList(heaterIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.TemperaturSensor, new DeviceList(tempSensorIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.HumiditySensor, new DeviceList(humiditySensorIds));
  }
}
