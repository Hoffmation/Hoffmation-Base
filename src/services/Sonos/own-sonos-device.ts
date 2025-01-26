import { DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { iSpeaker } from '../../interfaces';
import { DeviceInfo, Devices, RoomBaseDevice, SonosDeviceSettings } from '../../devices';
import { SonosDevice } from '@svrooij/sonos/lib';
import { SettingsService } from '../../settings-service';
import { ServerLogService } from '../../logging';
import { PlayNotificationTwoOptions } from '@svrooij/sonos/lib/models/notificationQueue';
import { Utils } from '../../utils';
import { SonosService } from './sonos-service';
import { PollyService } from './polly-service';

export class OwnSonosDevice extends RoomBaseDevice implements iSpeaker {
  /** @inheritDoc */
  public settings: SonosDeviceSettings = new SonosDeviceSettings();
  /** @inheritDoc */
  public readonly deviceType: DeviceType = DeviceType.Sonos;
  /** @inheritDoc */
  public readonly discoveryName: string;

  public constructor(
    discoveryName: string,
    roomName: string,
    public device: SonosDevice | undefined,
  ) {
    const info: DeviceInfo = new DeviceInfo();
    info.fullName = `Sonos ${roomName} ${discoveryName}`;
    info.customName = `Sonos ${discoveryName}`;
    info.room = roomName;
    info.allDevicesKey = `sonos-${roomName}-${discoveryName}`;
    super(info, DeviceType.Sonos);
    this.deviceCapabilities.push(DeviceCapability.speaker);
    this.discoveryName = discoveryName;
    Devices.alLDevices[`sonos-${roomName}-${discoveryName}`] = this;
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
      ServerLogService.writeLog(LogLevel.Alert, "Sonos: Can't speak as we have no mp3Server");
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
}
