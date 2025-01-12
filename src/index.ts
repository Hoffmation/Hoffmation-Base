import '@iobroker/types';
import { SettingsService } from './settings-service';
import { ServerLogService } from './logging';
import { LogLevel } from './enums';
import {
  AsusRouter,
  DaikinService,
  MP3Server,
  MuellService,
  NewsService,
  OwnAcDevices,
  OwnSonosDevices,
  Persistence,
  PollyService,
  PostgreSqlPersist,
  SonosService,
  TelegramCommands,
  TelegramService,
  TibberService,
  TimeCallbackService,
  UnifiRouter,
} from './services';
import { iConfig, iSpeaker } from './interfaces';
import { ioBrokerMain } from './ioBroker';
import {
  Dachs,
  Devices,
  DeviceUpdater,
  GooveeService,
  OwnGoveeDevices,
  Trilateration,
  UnifiProtect,
  VictronService,
} from './devices';
import { Utils } from './utils';
import { WeatherService } from './services/weather';
import { Res } from './i18n';

export * from './enums';
export * from './action';
export * from './command';
export * from './interfaces';
export * from './settings-service';
export * from './ioBroker';
export * from './i18n';
export * from './models';
export * from './logging';
export * from './server';
export * from './services';
export * from './utils';
export * from './settingsObjects';
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
      ServerLogService.initialize(initObject.config.logSettings, SettingsService.instance);
    }
    ServerLogService.writeLog(LogLevel.Info, 'Hoffmation-Base Startup');
    if (initObject.config.persistence) {
      if (initObject.config.persistence.postgreSql) {
        Persistence.dbo = new PostgreSqlPersist(initObject.config.persistence.postgreSql);
      }
      await Persistence.dbo?.initialize();
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
    Utils.guardedFunction(() => {
      if (SettingsService.settings.unifiSettings?.nvrOptions) {
        ServerLogService.writeLog(LogLevel.Info, 'Unifi Protect settings detected --> initializing');
        Devices.unifiProtect = new UnifiProtect(SettingsService.settings.unifiSettings.nvrOptions);
      }
    }, this);
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

export { PIDOptions } from './interfaces/p-i-d-options';
export { iDeviceList } from './interfaces/iDeviceList';
export { SettingsServiceInstance } from './settings-service-instance';
