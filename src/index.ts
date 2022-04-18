import { LogLevel } from './models';
import {
  Devices,
  DeviceUpdater,
  iConfig,
  ioBrokerMain,
  MongoPersistance,
  MP3Server,
  MuellService,
  NewsService,
  OwnSonosDevice,
  OwnSonosDevices,
  PollyService,
  PostgreSqlPersist,
  Res,
  ServerLogService,
  SettingsService,
  SonosService,
  TelegramCommands,
  TelegramService,
  TimeCallbackService,
  Utils,
  WeatherService,
} from './server';

export * from './models/index';
export * from './server/index';

export class HoffmationInitializationObject {
  public constructor(public config: iConfig) {}
}

export class HoffmationBase {
  public static ioMain: ioBrokerMain;

  public static async initializeBeforeIoBroker(initObject: HoffmationInitializationObject): Promise<void> {
    SettingsService.initialize(initObject.config);
    Res.initialize(initObject.config.translationSettings);
    if (initObject.config.logSettings) {
      ServerLogService.initialize(initObject.config.logSettings);
    }
    ServerLogService.writeLog(LogLevel.Info, `Hoffmation-Base Startup`);
    if (initObject.config.persistence) {
      if (initObject.config.persistence.mongo) {
        Utils.dbo = new MongoPersistance(initObject.config.persistence);
      } else if (initObject.config.persistence.postgreSql) {
        Utils.dbo = new PostgreSqlPersist(initObject.config.persistence);
      }
      await Utils.dbo?.initialize();
    }
    if (SettingsService.settings.mp3Server) {
      ServerLogService.writeLog(LogLevel.Info, `Mp3Server settings detected --> initializing`);
      new MP3Server(SettingsService.settings.mp3Server);
    }
    if (SettingsService.settings.telegram) {
      ServerLogService.writeLog(LogLevel.Info, `Telegram settings detected --> initializing`);
      TelegramService.initialize(SettingsService.settings.telegram);
    }
    if (SettingsService.settings.polly) {
      ServerLogService.writeLog(LogLevel.Info, `Amazon Polly settings detected --> initializing`);
      PollyService.initialize(SettingsService.settings.polly);
    }
    TimeCallbackService.init();
    ServerLogService.writeLog(LogLevel.Info, `Hoffmation-Base First Initializations finished`);
  }

  public static initializePostIoBroker(defaultMuellSonos?: OwnSonosDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Hoffmation-Base Post ioBrokerInitializations`);
    if (SettingsService.TelegramActive) TelegramCommands.initialize();

    if (SettingsService.settings.sonos?.active) {
      SonosService.addOwnDevices(OwnSonosDevices.ownDevices);
      SonosService.initialize();
    }

    Utils.guardedNewThread(() => {
      if (SettingsService.settings.muell) {
        ServerLogService.writeLog(LogLevel.Info, `Muell settings detected --> initializing`);
        MuellService.intialize(SettingsService.settings.muell, defaultMuellSonos);
      }
    });

    Utils.guardedNewThread(() => {
      ServerLogService.writeLog(LogLevel.Info, `News settings detected --> initializing`);
      NewsService.initialize(SettingsService.settings.news);
    });

    Utils.guardedNewThread(() => {
      if (SettingsService.settings.weather) {
        ServerLogService.writeLog(LogLevel.Info, `Weather settings detected --> initializing`);
        WeatherService.initialize(SettingsService.settings.weather);
      }
    });
    if (SettingsService.TelegramActive) TelegramService.publishCommands();
    ServerLogService.writeLog(LogLevel.Info, `Hoffmation-Base Post ioBrokerInitializations finished`);
  }

  public static startIoBroker(devices: Devices): void {
    ServerLogService.writeLog(LogLevel.Info, `Hoffmation-Base: Starting ioBroker Connection`);
    this.ioMain = new ioBrokerMain(new DeviceUpdater(devices));
    ServerLogService.writeLog(LogLevel.Info, `Hoffmation-Base: ioBroker Connection established`);
  }
}
