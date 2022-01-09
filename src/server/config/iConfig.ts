import { LogLevel } from '../../models/logLevel';
import { iRoomDefaultSettings } from '../../models/rooms/RoomSettings/iRoomDefaultSettings';

interface iSonosSettings {
  active: boolean;
}

export interface iRestSettings {
  active: boolean;
  port?: number;
}

export interface iConfig {
  cacheDir?: string;
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
  appid: string;
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
