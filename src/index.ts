import { LogLevel, ServerLogService } from './logging';
import '@iobroker/types';
import { ioBrokerMain } from './ioBroker';
import { Dachs, Devices, DeviceUpdater, iSpeaker, Trilateration } from './devices';
import { iConfig } from './server';
import { Utils } from './utils/utils';
import { Res } from './services/Translation';
import { PostgreSqlPersist } from './services/dbo';
import { SettingsService } from './services/settings-service';
import { TelegramCommands, TelegramService } from './services/Telegram';
import { MP3Server, OwnSonosDevices, PollyService, SonosService } from './services/Sonos';
import { TibberService } from './services/tibber-service';
import { AsusRouter, UnifiRouter } from './services/network';
import { UnifiProtect } from './services/unifi';
import { TimeCallbackService } from './services/time-callback-service';
import { GooveeService, OwnGoveeDevices } from './services/govee';
import { DaikinService, OwnAcDevices } from './services/ac';
import { MuellService } from './services/calendar';
import { NewsService } from './services/news-service';
import { WeatherService } from './services/weather';
import { VictronService } from './services/victron';

export * from './models';
export * from './logging';
export * from './server';
export * from './services';
export * from './utils';
export * from './devices';
export * from './liquid-pid';

export class HoffmationInitializationObject {
  public constructor(public config: iConfig) {}
}

export class HoffmationBase {
  /**
   * The iobroker Instance to interact with an ioBroker server
   * @deprecated To ensure Hoffmation being capable of running without ioBroker, this property will be removed in the future.
   */
  public static ioMain: ioBrokerMain;

  public static async initializeBeforeIoBroker(initObject: HoffmationInitializationObject): Promise<void> {
    SettingsService.initialize(initObject.config);
    Res.initialize(initObject.config.translationSettings);
    if (initObject.config.logSettings) {
      ServerLogService.initialize(initObject.config.logSettings);
    }
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base Startup');
    if (initObject.config.persistence) {
      if (initObject.config.persistence.postgreSql) {
        Utils.dbo = new PostgreSqlPersist(initObject.config.persistence.postgreSql);
      }
      await Utils.dbo?.initialize();
    }
    if (SettingsService.settings.mp3Server) {
      ServerLogService.writeLog(LogLevel.Info, 'Mp3Server settings detected --> initializing');
      new MP3Server(SettingsService.settings.mp3Server);
    }
    if (SettingsService.settings.telegram) {
      ServerLogService.writeLog(LogLevel.Info, 'Telegram settings detected --> initializing');
      TelegramService.initialize(SettingsService.settings.telegram);
    }
    if (SettingsService.settings.tibber) {
      ServerLogService.writeLog(LogLevel.Info, 'Tibber settings detected --> initializing');
      TibberService.initialize(SettingsService.settings.tibber);
    }
    if (SettingsService.settings.polly) {
      ServerLogService.writeLog(LogLevel.Info, 'Amazon Polly settings detected --> initializing');
      PollyService.initialize(SettingsService.settings.polly);
    }
    if (SettingsService.settings.asusConfig) {
      ServerLogService.writeLog(LogLevel.Info, 'Asus Router settings detected --> initializing');
      new AsusRouter(SettingsService.settings.asusConfig);
    } else if (SettingsService.settings.unifiSettings?.loginOptions) {
      ServerLogService.writeLog(LogLevel.Info, 'Unifi Router settings detected --> initializing');
      new UnifiRouter(SettingsService.settings.unifiSettings.loginOptions);
    }
    if (SettingsService.settings.unifiSettings?.nvrOptions) {
      ServerLogService.writeLog(LogLevel.Info, 'Unifi Protect settings detected --> initializing');
      new UnifiProtect(SettingsService.settings.unifiSettings.nvrOptions);
    }
    TimeCallbackService.init();
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base First Initializations finished');
  }

  public static initializePostRoomCreationBeforeIoBroker(): void {
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base Post Room Creation');
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base Post Room Creation finished');
  }

  public static initializePostIoBroker(defaultMuellSonos?: iSpeaker): void {
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base Post ioBrokerInitializations');
    Trilateration.initialize();
    if (SettingsService.TelegramActive) TelegramCommands.initialize();

    if (SettingsService.settings.sonos?.active) {
      SonosService.addOwnDevices(OwnSonosDevices.ownDevices);
      SonosService.initialize();
    }

    if (SettingsService.settings.goveeSettings) {
      GooveeService.addOwnDevices(OwnGoveeDevices.ownDevices);
      GooveeService.initialize(SettingsService.settings.goveeSettings);
    }

    if (SettingsService.settings.daikin?.active) {
      DaikinService.addOwnDevices(OwnAcDevices.ownDevices);
      DaikinService.initialize();
    }

    Utils.guardedNewThread(() => {
      if (SettingsService.settings.muell) {
        ServerLogService.writeLog(LogLevel.Info, 'Muell settings detected --> initializing');
        MuellService.intialize(SettingsService.settings.muell, defaultMuellSonos);
      }
    });

    Utils.guardedNewThread(() => {
      ServerLogService.writeLog(LogLevel.Info, 'News settings detected --> initializing');
      NewsService.initialize(SettingsService.settings.news);
    });

    Utils.guardedNewThread(() => {
      if (SettingsService.settings.weather) {
        ServerLogService.writeLog(LogLevel.Info, 'Weather settings detected --> initializing');
        WeatherService.initialize(SettingsService.settings.weather);
      }
    });
    Utils.guardedNewThread(() => {
      if (SettingsService.settings.victron) {
        ServerLogService.writeLog(LogLevel.Info, 'Victron settings detected --> initializing');
        VictronService.initialize(SettingsService.settings.victron);
      }
    });

    Utils.guardedNewThread(() => {
      if (SettingsService.settings.dachs !== undefined) {
        ServerLogService.writeLog(LogLevel.Info, 'Dachs settings detected --> initializing');
        Devices.dachs = new Dachs(SettingsService.settings.dachs);
      }
    });

    if (SettingsService.TelegramActive) TelegramService.publishCommands();
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base Post ioBrokerInitializations finished');
  }

  public static startIoBroker(_devices: Devices): void {
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base: Starting ioBroker Connection');
    this.ioMain = new ioBrokerMain(new DeviceUpdater());
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base: ioBroker Connection established');
  }
}
