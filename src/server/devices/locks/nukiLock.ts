import { iLock } from '../baseDeviceInterfaces';
import { DeviceCapability } from '../DeviceCapability';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel, RoomBase } from '../../../models';
import { API, LogDebugType, ServerLogService, Utils } from '../../services';
import _ from 'lodash';
import { LockSettings } from '../../../models/deviceSettings/lockSettings';

export class NukiLock implements iLock {
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.lock];
  public deviceType: DeviceType = DeviceType.NukiLock;
  public readonly settings: LockSettings = new LockSettings();
  private _info: DeviceInfo;
  private _locked: boolean = false;

  public constructor(name: string, roomName: string) {
    this._info = new DeviceInfo();
    this._info.fullName = `AC ${name}`;
    this._info.customName = `${roomName} ${name}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `ac-${roomName}-${name}`;
    this.persistDeviceInfo();
    this.loadDeviceSettings();
  }

  public get info(): DeviceInfo {
    return this._info;
  }

  public get customName(): string {
    return this.info.customName;
  }

  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `sonos-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public lock(): void {
  }

  public open(): void {
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<NukiLock> {
    return Utils.jsonFilter(_.omit(this, ['room']));
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
    this.settings.initializeFromDb(this);
  }
}
