import { LogLevel } from '../../models/logLevel';
import { iRoomDefaultSettings } from '../../models/rooms/RoomSettings/iRoomDefaultSettings';

export interface iConfig {
  roomDefault: iRoomDefaultSettings;
  timeSettings: iTimeSettings;
  ioBrokerUrl: string;
  telegram?: iTelegramSettings;
  persistence: iPersistenceSettings;
  polly?: iPollySettings;
  mp3Server?: iMp3Settings;
  weather?: iWeatherSettings;
  muell?: iMuellSettings;
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
  path: string;
}

export interface iWeatherSettings {
  lattitude: string;
  longitude: string;
  appid: string;
}

export interface iMuellSettings {
  calendarURL: string;
}
