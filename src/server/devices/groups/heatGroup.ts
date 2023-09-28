import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import {
  iHeater,
  iHumiditySensor,
  iTemperatureSensor,
  UNDEFINED_HUMIDITY_VALUE,
  UNDEFINED_TEMP_VALUE,
} from '../baseDeviceInterfaces';
import { AcDevice, API } from '../../services';
import { HeatGroupSettings } from '../../../models/groupSettings/heatGroupSettings';
import { LogLevel, RoomBase, TemperatureSettings } from '../../../models';

export class HeatGroup extends BaseGroup {
  public settings: HeatGroupSettings = new HeatGroupSettings();

  public constructor(
    roomName: string,
    heaterIds: string[],
    tempSensorIds: string[],
    humiditySensorIds: string[],
    acIds: string[],
  ) {
    super(roomName, GroupType.Heating);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Heater, new DeviceList(heaterIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.TemperaturSensor, new DeviceList(tempSensorIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.HumiditySensor, new DeviceList(humiditySensorIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Ac, new DeviceList(acIds));
  }

  /**
   * The current measured temperature of the room in Celsius
   * @returns {number}
   */
  public get humidity(): number {
    let humidity: number = UNDEFINED_HUMIDITY_VALUE;
    let count: number = 0;
    this.getHumiditySensors().forEach((sensor) => {
      const sensorValue: number = sensor.humidity;
      if (sensorValue === UNDEFINED_HUMIDITY_VALUE) {
        return;
      }
      if (count === 0) {
        count = 1;
        humidity = sensorValue;
        return;
      }
      humidity = (humidity * count + sensorValue) / ++count;
    });
    return humidity;
  }

  /**
   * The current measured temperature of the room in Celsius
   * @returns {number}
   */
  public get temperature(): number {
    let temp: number = UNDEFINED_TEMP_VALUE;
    let count: number = 0;
    this.getTempSensors().forEach((sensor) => {
      const sensorValue: number = sensor.iTemperature;
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
      const sensorValue: number = heaterAsSensor.iTemperature;
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
    return temp;
  }

  public get desiredTemp(): number {
    if (this.getHeater().length === 0) {
      return -99;
    }
    let value: number = 0;
    for (const h of this.getHeater()) {
      value += h.desiredTemperature;
    }
    return Math.round((value / this.getHeater().length) * 10) / 10;
  }

  public static getInfo(): string {
    const rooms: RoomBase[] = Array.from(API.getRooms().values()).filter((r) => {
      return r.HeatGroup !== undefined;
    });
    rooms.sort((a, b): number => {
      return a.roomName.localeCompare(b.roomName);
    });

    const response: string[] = [`Dies sind die aktuellen Informationen der Heizungen:`];
    response.push(`Name\t\tLuft Feuchtigkeit\t\tAktuelle Temperatur\t\tSoll Temperatur\t\tVentilstellung`);
    for (const r of rooms) {
      response.push(
        `${r.roomName}:\t\t${r.HeatGroup?.humidity}%\t\t${r.HeatGroup?.temperature}°C\t\t${r.HeatGroup?.desiredTemp}°C`,
        // TODO: Add AC Info and Heating Valve percentage
      );
    }
    return response.join('\n');
  }

  public getHeater(): iHeater[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Heater) as iHeater[];
  }

  public getTempSensors(): iTemperatureSensor[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.TemperaturSensor) as iTemperatureSensor[];
  }

  public getHumiditySensors(): iHumiditySensor[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.HumiditySensor) as iHumiditySensor[];
  }

  public getOwnAcDevices(): AcDevice[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Ac) as AcDevice[];
  }

  public initialize(): void {
    this.getTempSensors().forEach((sensor) => {
      sensor.addTempChangeCallback((_newVal) => {
        this.recalcRoomTemperatur();
      });
    });
    this.getOwnAcDevices().forEach((acDev: AcDevice) => {
      acDev.room = this.getRoom();
    });
  }

  /**
   * Sets all ACs to new desired Value
   * @param {boolean} newDesiredState
   * @param {boolean} force Whether this was a manual trigger, thus blocking automatic changes for 1 hour
   */
  public setAc(newDesiredState: boolean, force: boolean = false): void {
    const devs: AcDevice[] = this.getOwnAcDevices();
    this.log(LogLevel.Debug, `set ${devs.length} Ac's to new State: ${newDesiredState}`);
    for (const dev of devs) {
      if (newDesiredState) {
        dev.turnOn();
        continue;
      }
      dev.turnOff();
      if (force) {
        dev.deactivateAutomaticChange(60 * 60 * 1000);
      }
    }
  }

  public deleteAutomaticPoint(name: string): void {
    this.settings.deleteAutomaticPoint(name, this);
  }

  public setAutomaticPoint(setting: TemperatureSettings): void {
    this.settings.setAutomaticPoint(setting, this);
  }

  private recalcRoomTemperatur(): void {
    const temp: number = this.temperature;
    if (temp == UNDEFINED_TEMP_VALUE) {
      return;
    }
    this.getHeater().forEach((heater) => {
      heater.onTemperaturChange(temp);
    });
    this.getTempSensors().forEach((sensor) => {
      sensor.onTemperaturChange(temp);
    });
    this.getOwnAcDevices().forEach((ac) => {
      ac.onTemperaturChange(temp);
    });
  }
}
