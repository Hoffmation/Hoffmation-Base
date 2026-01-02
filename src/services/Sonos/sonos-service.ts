import TelegramBot from 'node-telegram-bot-api';
import { LogLevel, TimeCallbackType, TimeOfDay } from '../../enums';
import { ServerLogService } from '../../logging';
import { SonosDevice, SonosManager } from '@svrooij/sonos/lib';
import { OwnSonosDevice } from './own-sonos-device';
import { TimeCallback } from '../../models';
import { iRoomBase, iSonosSettings } from '../../interfaces';
import { SettingsService } from '../../settings-service';
import { TimeCallbackService } from '../time-callback-service';
import { TelegramMessageCallback, TelegramService } from '../Telegram';
import { PollyService } from './polly-service';

export class SonosService {
  private static sonosManager: SonosManager;
  private static ownDevices: { [name: string]: OwnSonosDevice } = {};
  private static isInitialized: boolean;
  private static checkTimeCallback: TimeCallback;
  private static reinitializationDevice: OwnSonosDevice | undefined;

  private static get config(): iSonosSettings | undefined {
    return SettingsService.settings.sonos;
  }

  public static addOwnDevices(
    snDevices: { [name: string]: OwnSonosDevice },
    reinitializationDevice?: OwnSonosDevice,
  ): void {
    this.ownDevices = snDevices;
    this.reinitializationDevice = reinitializationDevice;
  }

  public static initialize(reinitialize: boolean = false): void {
    if (SettingsService.settings.mp3Server?.serverAddress === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, 'SonosService needs properly configured mp3Server.');
    }
    ServerLogService.writeLog(LogLevel.Debug, 'Initialisiere Sonos Service');
    if (!reinitialize) {
      this.checkTimeCallback = new TimeCallback(
        'SonosFunctionallityChecker',
        TimeCallbackType.TimeOfDay,
        () => {
          void this.checkAll();
        },
        0,
        23,
        30,
      );
      TimeCallbackService.addCallback(this.checkTimeCallback);

      TelegramService.addMessageCallback(
        new TelegramMessageCallback(
          'SonosTest',
          /\/perform_sonos_test/,
          async (m: TelegramBot.Message): Promise<boolean> => {
            if (m.from === undefined) return false;
            SonosService.speakTestMessageOnEachDevice();
            TelegramService.sendMessage([m.chat.id], 'Testnachricht gesprochen --> Führe weiteren Test durch');
            await SonosService.checkAll();
            return true;
          },
          'Spiele eine kurze Nachricht auf allen Sonos Geräten um diese zu identifizieren',
        ),
      );
    }
    this.sonosManager = new SonosManager();
    this.sonosManager.OnNewDevice((d: SonosDevice) => {
      ServerLogService.writeLog(LogLevel.Info, `SonosDevice ${d.Name} joined`);
      SonosService.initializeDevice(d);
    });

    const initialHost: string | undefined = this.config?.initialHost;
    (initialHost === undefined
      ? this.sonosManager.InitializeWithDiscovery(10)
      : this.sonosManager.InitializeFromDevice(initialHost)
    )
      .then(() => {
        ServerLogService.writeLog(LogLevel.Debug, `${this.sonosManager.Devices.length} Sonos Geräte gefunden.`);
        this.sonosManager.Devices.forEach((d: SonosDevice) => {
          SonosService.initializeDevice(d);
        });
        this.isInitialized = true;
        if (!reinitialize) {
          this.reinitializationDevice?.speakOnDevice('Sonos System initialisiert und bereit für Sprachausgaben.', 30);
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
          // noinspection ExceptionCaughtLocallyJS
          throw `${currentDevice?.name} is missing`;
        }
        await currentDevice.device.GetState();
      }
      if (currentDevice !== undefined) {
        ServerLogService.writeLog(LogLevel.Info, `Alle Geräte okay --> Last checked ${currentDevice.name}`);
      }
    } catch (_e) {
      ServerLogService.writeLog(
        LogLevel.Error,
        `Atleast one device failed --> Last checked ${currentDevice?.name ?? 'undefined'}`,
      );
      TelegramService.inform('Sonos device is failing --> Reinitialize whole system');
      this.initialize(true);
    }
  }

  public static speakOnAll(pMessage: string, volumeOverride: number = -1): void {
    if (!this.isInitialized) {
      ServerLogService.writeLog(LogLevel.Alert, 'SonosService noch nicht initialisiert.');
    }
    PollyService.tts(pMessage, (networkPath: string, duration: number) => {
      for (const deviceName in this.ownDevices) {
        const snDevice: OwnSonosDevice = this.ownDevices[deviceName];
        const room: iRoomBase = snDevice.room;
        const timeOfDay: TimeOfDay = TimeCallbackService.dayType(
          room.settings.rolloOffset,
          new Date(),
          room.settings.nightStart,
          room.settings.nightEnd,
        );
        const volume: number =
          timeOfDay == TimeOfDay.Night
            ? snDevice.settings.defaultNightAnounceVolume
            : snDevice.settings.defaultDayAnounceVolume;
        this.ownDevices[deviceName].playOnDevice(
          networkPath,
          duration,
          volumeOverride > -1
            ? volumeOverride
            : Math.min(volume, this.ownDevices[deviceName].settings.maxPlayOnAllVolume),
        );
      }
    });
  }

  public static speakTestMessageOnEachDevice(): void {
    for (const deviceName in this.ownDevices) {
      this.ownDevices[deviceName].playTestMessage();
    }
  }

  private static initializeDevice(d: SonosDevice) {
    if (this.ownDevices[d.Name] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unbekanntes Sonos Gerät "${d.Name}"`);
      return;
    }
    this.ownDevices[d.Name].device = d;
    ServerLogService.writeLog(LogLevel.Debug, `Sonos ${d.Uuid} für ${d.Name} gefunden`);
  }
}
