import { DeviceInfo, DeviceType } from '../../devices';
import { LogLevel, RoomBase } from '../../../models';
import _ from 'lodash';
import { iTvDevice } from '../baseDeviceInterfaces';
import { TvSettings } from '../../../models/deviceSettings/tvSettings';
import { DeviceCapability } from '../DeviceCapability';
import { LogDebugType, ServerLogService, Utils } from '../../services';
import { TvDeviceType } from './tvDeviceType';

export abstract class TvDevice implements iTvDevice {
  public tvSettings: TvSettings = new TvSettings();
  public room: RoomBase | undefined;
  public deviceCapabilities: DeviceCapability[] = [DeviceCapability.tv];

  protected constructor(name: string, roomName: string, public ip: string, public tvDeviceType: TvDeviceType) {
    this._info = new DeviceInfo();
    this._info.fullName = `TV ${name}`;
    this._info.customName = `${roomName} ${name}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `tv-${roomName}-${name}`;
    Utils.guardedInterval(this.automaticCheck, 60000, this, false);
  }

  protected _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  public abstract get deviceType(): DeviceType;

  public get name(): string {
    return this.info.customName;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `ac-${this.info.room}-${this.info.customName}`;
  }

  public abstract get on(): boolean;

  public abstract volumeDown(): void;

  public abstract volumeUp(): void;

  public abstract turnOn(): void;

  public abstract turnOff(): void;

  public turnOffDueToMissingEnergy(): void {
    this.turnOff();
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public automaticCheck(): void {
    // TODO: Implement automatic turn off
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

  public toJSON(): Partial<TvDevice> {
    // eslint-disable-next-line
    const result: any = _.omit(this, ['room']);
    result['on'] = this.on;
    return Utils.jsonFilter(result);
  }
}
