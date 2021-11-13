import {
  Devices,
  DeviceUpdater,
  iConfig,
  ioBrokerMain,
  MP3Server,
  MuellService,
  NewsService,
  OwnSonosDevice,
  OwnSonosDevices,
  Persist,
  PollyService,
  ServerLogService,
  SettingsService,
  SonosService,
  TelegramCommands,
  TelegramService,
  TimeCallbackService,
  Utils,
  WeatherService,
} from './server/';
import { LogLevel } from './models';

export * from './models/index';
export * from './server/index';

export class HoffmationInitializationObject {
  public constructor(
    public config: iConfig,
    public meteorBound: (callback: any) => void,
    public mongo: { Collection: Mongo.CollectionStatic },
  ) {}
}

export class HoffmationBase {
  public static ioMain: ioBrokerMain;
  public static initializeBeforeIoBroker(initObject: HoffmationInitializationObject): void {
    SettingsService.initialize(initObject.config);
    ServerLogService.writeLog(LogLevel.Info, `Hoffmation-Base Startup`);
    Persist.initialize(initObject.meteorBound, initObject.mongo);
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

    SonosService.addOwnDevices(OwnSonosDevices.ownDevices);
    SonosService.initialize();

    Utils.guardedNewThread(() => {
      if (SettingsService.settings.muell) {
        ServerLogService.writeLog(LogLevel.Info, `Muell settings detected --> initializing`);
        MuellService.intialize(SettingsService.settings.muell, defaultMuellSonos);
      }
    });
    Utils.guardedNewThread(NewsService.initialize);

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
