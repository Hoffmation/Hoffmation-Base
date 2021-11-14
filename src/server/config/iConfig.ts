import { LogLevel } from 'index';
import { iRoomDefaultSettings } from 'index';

export interface iConfig {
  roomDefault: iRoomDefaultSettings;
  timeSettings: iTimeSettings;
  ioBrokerUrl: string;
  telegram?: iTelegramSettings;
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
