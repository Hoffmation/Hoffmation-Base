import { iRoomDefaultSettings, LogLevel } from '../../models';
import { PoolConfig } from 'pg';

interface iDaikinSettings {
  active: boolean;
  activateTracingLogger?: boolean;
  useGetToPost?: boolean;
  // Whether Room Default Callbacks should be added to start ac on Bottom Right short and stop on long button press.
  buttonBotRightForAc?: boolean;
}

interface iSonosSettings {
  active: boolean;
  // Whether Room Default Callbacks should be added to start Radio on Bottom Right long button press.
  buttonBotRightForRadio?: boolean;
}

export interface iAsusConfig {
  address: string;
  ignoreSSL?: boolean;
  password: string;
  username: string;
}

export interface iRestSettings {
  active: boolean;
  port?: number;
}

export interface iEspresenseSettings {
  mqttInstance: number;
  deviceNaming: { [folderId: string]: string };
}

export interface iConfig {
  asusConfig?: iAsusConfig;
  daikin?: iDaikinSettings;
  espresense?: iEspresenseSettings;
  // Price per kWh from the grid
  wattagePrice?: number;
  // Earnigs per kWh injecting into the grid
  injectWattagePrice?: number;
  ioBrokerUrl: string;
  logSettings?: iLogSettings;
  translationSettings: iTranslationSettings;
  mp3Server?: iMp3Settings;
  muell?: iMuellSettings;
  news?: iNewsSettings;
  persistence?: iPersistenceSettings;
  polly?: iPollySettings;
  restServer?: iRestSettings;
  roomDefault: iRoomDefaultSettings;
  sonos?: iSonosSettings;
  telegram?: iTelegramSettings;
  timeSettings: iTimeSettings;
  weather?: iWeatherSettings;
}

export interface iLogSettings {
  logLevel: number;
  useTimestamp: boolean;
  debugNewMovementState?: boolean;
  debugShutterPositionChange?: boolean;
  debugActuatorChange?: boolean;
  debugUchangedShutterPosition?: boolean;
  debugUnchangedActuator?: boolean;
  debugDaikinSuccessfullControlInfo?: boolean;
}

export interface iTimePair {
  hours: number;
  minutes: number;
}

export interface iTimeSettings {
  nightStart: iTimePair;
  nightEnd: iTimePair;
}

export interface iTelegramSettings {
  logLevel: LogLevel;
  telegramToken: string;
  allowedIDs: number[];
  subscribedIDs: number[];
}

export interface iPersistenceSettings {
  mongo?: iMongoSettings;
  postgreSql?: PoolConfig;
}

export interface iMongoSettings {
  mongoConnection: string;
  mongoDbName: string;
}

export interface iPollySettings {
  mp3Path: string;
  region: string;
  signatureVersion: string;
  accessKeyId: string;
  secretAccessKey: string;
  voiceID: string;
}

export interface iMp3Settings {
  // local path for the mp3 files to store/load
  path: string;
  // external reachable adress to access those mp3 files
  serverAddress: string;
}

export interface iWeatherSettings {
  lattitude: string;
  longitude: string;
  // App-ID from OpenWeatherMap
  appid?: string;
}

export interface iMuellSettings {
  calendarURL: string;
}

export interface iNewsSettings {
  // rss feed url that contains the news information and audio file
  rssUrl?: string;
  // request interval in minutes
  requestInterval?: number;
  // maximum age in minutes of files cached for playback before they get deleted
  keepMaxAge?: number;
}

export interface iTranslationSettings {
  language: string;
}
