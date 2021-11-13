import { SonosDevice, SonosManager } from '@svrooij/sonos/lib';
import { PlayNotificationOptions } from '@svrooij/sonos/lib/models';
import { ServerLogService } from '../log-service';
import { PollyService } from './polly-service';
import { LogLevel } from '../../../models/logLevel';
import { Utils } from '../utils/utils';
import { TelegramService } from '../Telegram/telegram-service';
import { TimeCallback, TimeCallbackType } from '../../../models/timeCallback';
import { TimeCallbackService } from '../time-callback-service';

export class OwnSonosDevice {
  public maxPlayOnAllVolume: number = 80;
  public playTestMessage() {
    SonosService.speakOnDevice(`Ich bin ${this.name}`, this);
  }
  public constructor(public name: string, public roomName: string, public device: SonosDevice | undefined) {}
}

export class SonosService {
  private static sonosManager: SonosManager;
  private static ownDevices: { [name: string]: OwnSonosDevice } = {};

  private static isInitialized: boolean;
  public static all: SonosDevice[] = [];
  public static devicesDict: { [name: string]: SonosDevice } = {};
  private static checkTimeCallback: TimeCallback;
  private static reinitializationDevice: OwnSonosDevice | undefined;

  public static addOwnDevices(
    snDevices: { [name: string]: OwnSonosDevice },
    reinitializationDevice?: OwnSonosDevice,
  ): void {
    this.ownDevices = snDevices;
    this.reinitializationDevice = reinitializationDevice;
  }

  public static initialize(reinitialize: boolean = false): void {
    ServerLogService.writeLog(LogLevel.Debug, `Initialisiere Sonos Service`);
    if (!reinitialize) {
      this.checkTimeCallback = new TimeCallback(
        'SonosFunctionallityChecker',
        TimeCallbackType.TimeOfDay,
        () => {
          this.checkAll();
        },
        0,
        23,
        30,
      );
      TimeCallbackService.addCallback(this.checkTimeCallback);
    }
    this.all = [];
    this.sonosManager = new SonosManager();
    this.sonosManager
      .InitializeWithDiscovery(10)
      .then(() => {
        this.sonosManager.OnNewDevice((d: SonosDevice) => {
          ServerLogService.writeLog(LogLevel.Info, `SonosDevice ${d.Name} joined`);
          SonosService.initializeDevice(d);
        });
        ServerLogService.writeLog(LogLevel.Debug, `${this.sonosManager.Devices.length} Sonos Geräte gefunden.`);
        this.sonosManager.Devices.forEach((d: SonosDevice) => {
          SonosService.initializeDevice(d);
        });
        this.isInitialized = true;
        if (!reinitialize && this.reinitializationDevice !== undefined) {
          this.speakOnDevice(
            `Sonos System initialisiert und bereit für Sprachausgaben.`,
            this.reinitializationDevice,
            30,
          );
        }
      })
      .catch(console.error);
  }

  public static async checkAll(): Promise<void> {
    let currentDevice: OwnSonosDevice | undefined;
    try {
      for (const deviceName in this.ownDevices) {
        currentDevice = this.ownDevices[deviceName];
        if (currentDevice?.device === undefined) {
          throw `${currentDevice?.name} is missing`;
        }
        await currentDevice.device.GetState();
      }
      if (currentDevice !== undefined) {
        ServerLogService.writeLog(LogLevel.Info, `Alle Geräte okay --> Last checked ${currentDevice.name}`);
      }
    } catch (e) {
      ServerLogService.writeLog(
        LogLevel.Error,
        `Atleast one device failed --> Last checked ${currentDevice?.name ?? 'undefined'}`,
      );
      TelegramService.inform(`Sonos device is failing --> Reinitialize whole system`);
      this.initialize(true);
    }
  }

  public static speakOnAll(pMessage: string, volumeOverride: number = -1): void {
    if (!this.isInitialized) {
      ServerLogService.writeLog(LogLevel.Alert, `SonosService noch nicht initialisiert.`);
    }
    PollyService.tts(pMessage, (networkPath: string, duration: number) => {
      const hours: number = new Date().getHours();
      const volume: number = hours < 10 || hours > 22 ? 40 : 80;

      for (const deviceName in this.ownDevices) {
        SonosService.playOnDevice(
          this.ownDevices[deviceName],
          networkPath,
          duration,
          volumeOverride > -1 ? volumeOverride : Math.min(volume, this.ownDevices[deviceName].maxPlayOnAllVolume),
        );
      }
    });
  }

  public static playOnDevice(
    ownSnDevice: OwnSonosDevice,
    mp3Name: string,
    duration: number,
    volume: number | undefined = undefined,
    onlyWhenPlaying: boolean | undefined = undefined,
    resolveAfterRevert: boolean | undefined = false,
  ): void {
    const specificTimeout: number = Math.ceil(duration / 1000) + 5;
    const options: PlayNotificationOptions = {
      trackUri: `http://192.168.178.13:8081/file.mp3?fname=${mp3Name}`,
      delayMs: 750,
      onlyWhenPlaying: onlyWhenPlaying,
      resolveAfterRevert: resolveAfterRevert,
      volume: volume,
      specificTimeout: specificTimeout,
      notificationFired: (played) => {
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Sonos Notification ("${mp3Name}") was${played ? '' : "n't"} played in ${
            ownSnDevice.roomName
          } (duration: "${specificTimeout}")`,
        );
      },
    };
    try {
      const device: SonosDevice | undefined = ownSnDevice.device;
      if (device === undefined) {
        ServerLogService.writeLog(LogLevel.Alert, `Sonos Geräte ${ownSnDevice.name} ist nicht initialisiert`);
        Utils.guardedTimeout(
          () => {
            this.initialize();
          },
          500,
          this,
        );
        return;
      }
      ServerLogService.writeLog(LogLevel.Trace, `Spiele nun die Ausgabe für "${mp3Name}" auf "${ownSnDevice.name}"`);
      device.PlayNotificationTwo(options).then((played) => {
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Sonos Notification ("${mp3Name}") was${played ? '' : "n't"} played in ${
            ownSnDevice.roomName
          } (duration: "${specificTimeout}")`,
        );
      });
    } catch (err) {
      ServerLogService.writeLog(LogLevel.Info, `Sonos Error ${(err as Error).message}: ${(err as Error).stack}`);
    }
  }

  public static speakOnDevice(
    pMessage: string,
    ownSnDevice: OwnSonosDevice,
    volume: number | undefined = undefined,
    onlyWhenPlaying: boolean | undefined = undefined,
    resolveAfterRevert: boolean | undefined = undefined,
  ): void {
    PollyService.tts(pMessage, (networkPath: string, duration: number) => {
      SonosService.playOnDevice(ownSnDevice, networkPath, duration, volume, onlyWhenPlaying, resolveAfterRevert);
    });
  }

  public static speakTestMessageOnEachDevice(): void {
    for (const deviceName in this.ownDevices) {
      this.ownDevices[deviceName].playTestMessage();
    }
  }

  private static initializeDevice(d: SonosDevice) {
    this.devicesDict[d.Name] = d;
    if (this.ownDevices[d.Name] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unbekanntes Sonos Gerät "${d.Name}"`);
      return;
    }
    this.ownDevices[d.Name].device = d;
    ServerLogService.writeLog(LogLevel.Debug, `Sonos ${d.Uuid} für ${d.Name} gefunden`);
  }
}
