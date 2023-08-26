import { iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { API, LogDebugType, OwnSonosDevice, ServerLogService, Utils } from '../../services';
import { DeviceCapability } from '../DeviceCapability';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import _ from 'lodash';
import { DeviceSettings, LogLevel, RoomBase } from '../../../models';

export class DachsWarmWaterTemperature implements iTemperatureSensor {
  public settings: DeviceSettings | undefined = undefined;
  public readonly deviceType: DeviceType = DeviceType.DachsWarmWaterTemperature;
  public readonly deviceCapabilities: DeviceCapability[] = [];

  public readonly persistTemperatureSensorInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistTemperaturSensor();
    },
    5 * 60 * 1000,
    this,
    false,
  );

  private _temperaturCallbacks: ((pValue: number) => void)[] = [];
  private _roomTemperature: number = UNDEFINED_TEMP_VALUE;
  protected _info: DeviceInfo;

  public constructor(roomName: string) {
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this._info = new DeviceInfo();
    this._info.fullName = `Water Temperature`;
    this._info.customName = `Water Temperature ${roomName}`;
    this._info.allDevicesKey = `dachs-ww-${roomName}`;
    this._info.room = roomName;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    Devices.temperatureWarmWater = this;
    this.persistDeviceInfo();
    Utils.guardedTimeout(this.loadDeviceSettings, 200, this);
  }

  public get customName(): string {
    return this.info.customName;
  }

  public get info(): DeviceInfo {
    return this._info;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `sonos-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
  }

  public get roomTemperature(): number {
    return this._roomTemperature;
  }

  public set roomTemperature(value: number) {
    this._roomTemperature = value;
  }

  public get iTemperature(): number {
    return this._temperature;
  }

  public get sTemperature(): string {
    return `${this._temperature}°C`;
  }

  private _temperature: number = UNDEFINED_TEMP_VALUE;

  private set temperature(val: number) {
    this._temperature = val;
    for (const cb of this._temperaturCallbacks) {
      cb(val);
    }
  }

  public update(newTemp: number): void {
    this.temperature = newTemp;
  }

  public addTempChangeCallback(pCallback: (pValue: number) => void): void {
    this._temperaturCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(this._temperature);
    }
  }

  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  public persistTemperaturSensor(): void {
    Utils.dbo?.persistTemperatureSensor(this);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      deviceId: this.name,
      room: this._info.room,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<OwnSonosDevice> {
    return Utils.jsonFilter(_.omit(this, ['room', 'client', 'config', '_influxClient']));
  }

  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  public loadDeviceSettings(): void {
    this.settings?.initializeFromDb(this);
  }

  public dispose(): void {
    if (this.persistTemperatureSensorInterval) {
      clearInterval(this.persistTemperatureSensorInterval);
    }
  }
}
