import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import { iHeater, iHumiditySensor, iTemperaturSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';

export class HeatGroup extends BaseGroup {
  public constructor(roomName: string, heaterIds: string[], tempSensorIds: string[], humiditySensorIds: string[]) {
    super(roomName, GroupType.Heating);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Heater, new DeviceList(heaterIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.TemperaturSensor, new DeviceList(tempSensorIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.HumiditySensor, new DeviceList(humiditySensorIds));
  }

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

  public getHeater(): iHeater[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Heater) as iHeater[];
  }

  public getTempSensors(): iTemperaturSensor[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.TemperaturSensor) as iTemperaturSensor[];
  }

  public getHumiditySensors(): iHumiditySensor[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.HumiditySensor) as iHumiditySensor[];
  }

  public initialize(): void {
    this.getTempSensors().forEach((sensor) => {
      sensor.addTempChangeCallback((_newVal) => {
        this.recalcRoomTemperatur();
      });
    });
  }

  private recalcRoomTemperatur(): void {
    let temp: number = UNDEFINED_TEMP_VALUE;
    let count: number = 0;
    this.getTempSensors().forEach((sensor) => {
      const sensorValue: number = sensor.iTemperatur;
      if (sensorValue === UNDEFINED_TEMP_VALUE) {
        return;
      }
      if (count === 0) {
        count = 1;
        temp = sensorValue;
        return;
      }
      temp = (temp * count + sensorValue) / ++count;
    });
    this.getHeater().forEach((heaterAsSensor) => {
      if (!heaterAsSensor.settings.useOwnTemperatur) {
        return;
      }
      const sensorValue: number = heaterAsSensor.iTemperatur;
      if (sensorValue === UNDEFINED_TEMP_VALUE) {
        return;
      }
      if (count === 0) {
        count = 1;
        temp = sensorValue;
        return;
      }
      temp = (temp * count + sensorValue) / ++count;
    });
    if (temp === UNDEFINED_TEMP_VALUE) {
      return;
    }
    this.getHeater().forEach((heater) => {
      heater.onTemperaturChange(temp);
    });
  }
}
