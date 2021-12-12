import { LogLevel } from '../../models/logLevel';
import { iRoomDefaultSettings } from '../../models/rooms/RoomSettings/iRoomDefaultSettings';

interface iSonosSettings {
  active: boolean;
}

export interface iConfig {
  expressPort?: number;
  ioBrokerUrl: string;
  mp3Server?: iMp3Settings;
  muell?: iMuellSettings;
  persistence?: iPersistenceSettings;
  polly?: iPollySettings;
  roomDefault: iRoomDefaultSettings;
  sonos?: iSonosSettings;
  telegram?: iTelegramSettings;
  timeSettings: iTimeSettings;
  weather?: iWeatherSettings;
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
