import { iTemperatureCollector } from '../../interfaces';
import { DeviceCapability, DeviceType } from '../../enums';
import { TemperatureSensor } from '../sharedFunctions';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import { TemperatureSensorChangeAction } from '../../action';
import { RoomBaseDevice } from '../RoomBaseDevice';

export class DachsTemperatureSensor extends RoomBaseDevice implements iTemperatureCollector {
  /** @inheritDoc */
  public temperatureSensor: TemperatureSensor = new TemperatureSensor(this);

  public constructor(roomName: string, shortKey: string, longKey: string) {
    const info = new DeviceInfo();
    info.fullName = longKey;
    info.customName = `${longKey} ${roomName}`;
    const allDevicesKey = `dachs-${shortKey}-${roomName}`;
    info.allDevicesKey = allDevicesKey;
    info.room = roomName;
    super(info, DeviceType.DachsWarmWaterTemperature);
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this.jsonOmitKeys.push(...['client', 'config', '_influxClient']);
    Devices.alLDevices[allDevicesKey] = this;
    Devices.temperatureWarmWater = this;
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `dachs-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this.temperatureSensor.roomTemperature;
  }

  /** @inheritDoc */
  public set roomTemperature(value: number) {
    this.temperatureSensor.roomTemperature = value;
  }

  /** @inheritDoc */
  public get iTemperature(): number {
    return this.temperatureSensor.temperature;
  }

  /** @inheritDoc */
  public get sTemperature(): string {
    return `${this.temperatureSensor.temperature}°C`;
  }

  public update(newTemp: number): void {
    this.temperatureSensor.temperature = newTemp;
  }

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (action: TemperatureSensorChangeAction) => void): void {
    this.temperatureSensor.addTempChangeCallback(pCallback);
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public dispose(): void {
    this.temperatureSensor.dispose();
  }
}
