import {
  iHeater,
  iHeatGroup,
  iHumidityCollector,
  iRoomBase,
  iTemperatureCollector,
  iTemperatureSettings,
  UNDEFINED_HUMIDITY_VALUE,
  UNDEFINED_TEMP_VALUE,
} from '../../interfaces';
import { HeatGroupSettings, TemperatureSettings } from '../../settingsObjects';
import { CommandSource, DeviceClusterType, GroupType, LogLevel } from '../../enums';
import { DeviceList } from '../device-list';
import { AcDevice } from '../../services';
import { API } from '../../api';
import { Utils } from '../../utils';
import { HandleChangeAction } from '../../action';
import { BlockAutomaticCommand } from '../../command';
import { BaseGroup } from './base-group';

export class HeatGroup extends BaseGroup implements iHeatGroup {
  /** @inheritDoc */
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
   * Calculates the combined humidity Level in this room
   * @returns The humidity in percent
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
   * Calculates the temperature based on all available sensors.
   * @returns The temperature in °C
   */
  public get temperature(): number {
    let temp: number = UNDEFINED_TEMP_VALUE;
    let count: number = 0;
    const usedIds: string[] = [];
    this.getHeater().forEach((heaterAsSensor) => {
      usedIds.push(heaterAsSensor.id);
      if (!heaterAsSensor.settings.useOwnTemperatureForRoomTemperature) {
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
    this.getTempSensors().forEach((sensor) => {
      if (usedIds.includes(sensor.id)) {
        // Heater which correctly implement sensor as well.
        return;
      }
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
    return temp;
  }

  public get desiredTemp(): number {
    if (!this.settings.automaticMode) {
      return this.settings.manualTemperature;
    }
    const activeSetting: iTemperatureSettings | undefined = TemperatureSettings.getActiveSetting(
      this.settings.automaticPoints,
      new Date(),
    );
    if (!activeSetting) {
      return this.settings.automaticFallBackTemperatur;
    }
    return activeSetting.temperature;
  }

  public static getInfo(): string {
    const rooms: iRoomBase[] = Array.from(API.getRooms().values()).filter((r) => {
      return r.HeatGroup !== undefined;
    });
    rooms.sort((a, b): number => {
      return a.roomName.localeCompare(b.roomName);
    });

    const response: string[] = ['Dies sind die aktuellen Informationen der Heizungen:'];
    response.push('Name\t\tLuft Feuchtigkeit\t\tAktuelle Temperatur\t\tSoll Temperatur\t\tVentilstellung');
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

  public getTempSensors(): iTemperatureCollector[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.TemperaturSensor) as iTemperatureCollector[];
  }

  public getHumiditySensors(): iHumidityCollector[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.HumiditySensor) as iHumidityCollector[];
  }

  public getOwnAcDevices(): AcDevice[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Ac) as AcDevice[];
  }

  public initialize(): void {
    Utils.guardedTimeout(
      () => {
        this.settings.initializeFromDb(this);
      },
      200,
      this,
    );
    this.getTempSensors().forEach((sensor) => {
      sensor.addTempChangeCallback((_newVal) => {
        this.recalcRoomTemperatur();
      });
    });
    this.getOwnAcDevices().forEach((acDev: AcDevice) => {
      acDev.initializeRoomCbs();
    });
    this.getRoom().WindowGroup?.addHandleChangeCallback((handleChangeAction: HandleChangeAction): void => {
      this.getHeater().forEach((heater: iHeater) => {
        heater.onHandleChange(handleChangeAction);
      });
    });
  }

  /**
   * Sets all ACs to new desired Value
   * TODO: Migrate to new Command System
   * @param newDesiredState - The new desired (on/off) state
   * @param force - Whether this was a manual trigger, thus blocking automatic changes for 1 hour
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
      dev.blockAutomationHandler.disableAutomatic(
        new BlockAutomaticCommand(force ? CommandSource.Force : CommandSource.Unknown, 60 * 60 * 1000),
      );
    }
  }

  public deleteAutomaticPoint(name: string): void {
    this.settings.deleteAutomaticPoint(name, this);
  }

  public setAutomaticPoint(setting: TemperatureSettings): void {
    this.settings.setAutomaticPoint(setting, this);
  }

  public recalcRoomTemperatur(): void {
    const temp: number = this.temperature;
    if (temp == UNDEFINED_TEMP_VALUE) {
      return;
    }
    const usedIds: string[] = [];
    this.getHeater().forEach((heater) => {
      usedIds.push(heater.id);
      heater.onTemperaturChange(temp);
    });
    this.getTempSensors().forEach((sensor) => {
      if (usedIds.includes(sensor.id)) {
        return;
      }
      sensor.onTemperaturChange(temp);
    });
    this.getOwnAcDevices().forEach((ac) => {
      ac.onTemperaturChange(temp);
    });
  }
}
