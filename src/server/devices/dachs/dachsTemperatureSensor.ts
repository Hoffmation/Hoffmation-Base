import { iTemperatureSensor, UNDEFINED_TEMP_VALUE } from '../baseDeviceInterfaces';
import { API, LogDebugType, OwnSonosDevice, ServerLogService, Utils } from '../../services';
import { DeviceCapability } from '../DeviceCapability';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import _ from 'lodash';
import { DeviceSettings, LogLevel, RoomBase } from '../../../models';

export class DachsTemperatureSensor implements iTemperatureSensor {
  /** @inheritDoc */
  public settings: DeviceSettings | undefined = undefined;
  /** @inheritDoc */
  public readonly deviceType: DeviceType = DeviceType.DachsWarmWaterTemperature;
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [];

  /** @inheritDoc */
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

  public constructor(roomName: string, shortKey: string, longKey: string) {
    this.deviceCapabilities.push(DeviceCapability.temperatureSensor);
    this._info = new DeviceInfo();
    this._info.fullName = longKey;
    this._info.customName = `${longKey} ${roomName}`;
    this._info.allDevicesKey = `dachs-${shortKey}-${roomName}`;
    this._info.room = roomName;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    Devices.temperatureWarmWater = this;
    this.persistDeviceInfo();
    Utils.guardedTimeout(this.loadDeviceSettings, 200, this);
  }

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get info(): DeviceInfo {
    return this._info;
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `dachs-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
  }

  /** @inheritDoc */
  public get roomTemperature(): number {
    return this._roomTemperature;
  }

  /** @inheritDoc */
  public set roomTemperature(value: number) {
    this._roomTemperature = value;
  }

  /** @inheritDoc */
  public get iTemperature(): number {
    return this._temperature;
  }

  /** @inheritDoc */
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

  /** @inheritDoc */
  public addTempChangeCallback(pCallback: (pValue: number) => void): void {
    this._temperaturCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(this._temperature);
    }
  }

  /** @inheritDoc */
  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperature = newTemperatur;
  }

  /** @inheritDoc */
  public persistTemperaturSensor(): void {
    Utils.dbo?.persistTemperatureSensor(this);
  }

  /** @inheritDoc */
  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      deviceId: this.name,
      room: this._info.room,
      deviceName: this.name,
    });
  }

  /** @inheritDoc */
  public toJSON(): Partial<OwnSonosDevice> {
    return Utils.jsonFilter(_.omit(this, ['room', 'client', 'config', '_influxClient']));
  }

  /** @inheritDoc */
  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  /** @inheritDoc */
  public loadDeviceSettings(): void {
    this.settings?.initializeFromDb(this);
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this.persistTemperatureSensorInterval) {
      clearInterval(this.persistTemperatureSensorInterval);
    }
  }
}
