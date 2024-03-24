import { DeviceInfo, Devices, DeviceType, iSpeaker } from '../../devices';
import { LogLevel, RoomBase, SonosDeviceSettings } from '../../../models';
import { SonosDevice } from '@svrooij/sonos/lib';
import { LogDebugType, ServerLogService } from '../log-service';
import { Utils } from '../utils';
import _ from 'lodash';
import { SonosService } from './sonos-service';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { SettingsService } from '../settings-service';
import { PlayNotificationTwoOptions } from '@svrooij/sonos/lib/models/notificationQueue';
import { PollyService } from './polly-service';
import { API } from '../api';

export class OwnSonosDevice implements iSpeaker {
  /** @inheritDoc */
  public settings: SonosDeviceSettings = new SonosDeviceSettings();
  /** @inheritDoc */
  public readonly deviceType: DeviceType = DeviceType.Sonos;
  /** @inheritDoc */
  public readonly discoveryName: string;
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.speaker];

  public get customName(): string {
    return this.info.customName;
  }

  public constructor(
    discoveryName: string,
    roomName: string,
    public device: SonosDevice | undefined,
  ) {
    this.discoveryName = discoveryName;
    this._info = new DeviceInfo();
    this._info.fullName = `Sonos ${roomName} ${discoveryName}`;
    this._info.customName = `Sonos ${discoveryName}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `sonos-${roomName}-${discoveryName}`;
    Devices.alLDevices[`sonos-${roomName}-${discoveryName}`] = this;
    this.persistDeviceInfo();
    this.loadDeviceSettings();
  }

  protected _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
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

  public playOnDevice(
    mp3Name: string,
    duration: number,
    volume: number | undefined = undefined,
    onlyWhenPlaying: boolean | undefined = undefined,
    resolveAfterRevert: boolean | undefined = false,
  ): void {
    if (SettingsService.settings.mp3Server?.serverAddress === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Sonos: Can't speak as we have no mp3Server`);
      return;
    }
    const specificTimeout: number = Math.ceil(duration / 1000) + 5;
    const options: PlayNotificationTwoOptions = {
      catchQueueErrors: true,
      trackUri: `${SettingsService.settings.mp3Server?.serverAddress}/file.mp3?fname=${mp3Name}`,
      delayMs: 750,
      onlyWhenPlaying: onlyWhenPlaying,
      resolveAfterRevert: resolveAfterRevert,
      volume: volume,
      specificTimeout: specificTimeout,
      notificationFired: (played) => {
        this.log(
          LogLevel.Trace,
          `Sonos Notification ("${mp3Name}") was${played ? '' : "n't"} played (duration: "${specificTimeout}")`,
        );
      },
    };
    try {
      if (this.device === undefined) {
        ServerLogService.writeLog(LogLevel.Alert, `Sonos Geräte ${this.name} ist nicht initialisiert`);
        Utils.guardedTimeout(
          () => {
            SonosService.initialize();
          },
          500,
          this,
        );
        return;
      }
      ServerLogService.writeLog(LogLevel.Trace, `Spiele nun die Ausgabe für "${mp3Name}" auf "${this.name}"`);
      this.device.PlayNotificationTwo(options).then((played) => {
        this.log(
          LogLevel.Debug,
          `Sonos Notification ("${mp3Name}") was${played ? '' : "n't"} played (duration: "${specificTimeout}")`,
        );
      });
    } catch (err) {
      ServerLogService.writeLog(LogLevel.Info, `Sonos Error ${(err as Error).message}: ${(err as Error).stack}`);
    }
  }

  public playTestMessage(): void {
    this.speakOnDevice(`Ich bin ${this.name}`);
  }

  public speakOnDevice(
    pMessage: string,
    volume: number | undefined = undefined,
    onlyWhenPlaying: boolean | undefined = undefined,
    resolveAfterRevert: boolean | undefined = undefined,
  ): void {
    PollyService.tts(pMessage, (networkPath: string, duration: number) => {
      this.playOnDevice(networkPath, duration, volume, onlyWhenPlaying, resolveAfterRevert);
    });
  }

  public stop(): void {
    this.device?.Stop();
  }

  public playUrl(url: string): void {
    this.device?.SetAVTransportURI(url);
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
