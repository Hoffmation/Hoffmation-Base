import { DeviceInfo, Devices, DeviceType, IBaseDevice } from '../../devices';
import { LogLevel, RoomBase } from '../../../models';
import { SonosDevice } from '@svrooij/sonos/lib';
import { LogDebugType, ServerLogService } from '../log-service';
import { Utils } from '../utils';
import _ from 'lodash';
import { SonosService } from './sonos-service';

export class OwnSonosDevice implements IBaseDevice {
  public maxPlayOnAllVolume: number = 80;
  public room: RoomBase | undefined;
  public readonly deviceType: DeviceType = DeviceType.Sonos;
  public readonly discoveryName: string;

  public constructor(discoveryName: string, roomName: string, public device: SonosDevice | undefined) {
    this.discoveryName = discoveryName;
    this._info = new DeviceInfo();
    this._info.fullName = `Sonos ${roomName} ${discoveryName}`;
    this._info.customName = `Sonos ${discoveryName}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `sonos-${roomName}-${discoveryName}`;
    Devices.alLDevices[`sonos-${roomName}-${discoveryName}`] = this;
  }

  protected _info: DeviceInfo;

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

  public playTestMessage(): void {
    SonosService.speakOnDevice(`Ich bin ${this.name}`, this);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<OwnSonosDevice> {
    return Utils.jsonFilter(_.omit(this, ['room']));
  }
}
