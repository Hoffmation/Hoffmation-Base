import { iConfig } from './iConfig.js';

export const ExampleConfig = {
  timeSettings: {
    nightStart: {
      hours: 23,
      minutes: 45,
    },
    nightEnd: {
      hours: 6,
      minutes: 30,
    },
  },
  logSettings: {
    logLevel: 4,
    useTimestamp: true,
  },
  restServer: {
    active: true,
    expressPort: 4444,
  },
  roomDefault: {
    rolloHeatReduction: true,
    roomIsAlwaysDark: false,
    lampenBeiBewegung: true,
    lichtSonnenAufgangAus: true,
    sonnenUntergangRollos: true,
    sonnenAufgangRollos: true,
    movementResetTimer: 240,
    sonnenUntergangRolloDelay: 15,
    sonnenUntergangLampenDelay: 15,
    sonnenUntergangRolloMaxTime: {
      hours: 21,
      minutes: 30,
    },
    sonnenAufgangRolloMinTime: {
      hours: 7,
      minutes: 30,
    },
    sonnenAufgangRolloDelay: 35,
    sonnenAufgangLampenDelay: 15,
    sonnenUntergangRolloAdditionalOffsetPerCloudiness: 0.25,
    lightIfNoWindows: false,
    ambientLightAfterSunset: false,
    includeLampsInNormalMovementLightning: false,
  },
  telegram: {
    logLevel: 1,
    telegramToken: '15xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXU',
    allowedIDs: [111111111, 111111111],
    subscribedIDs: [111111111, 111111111],
  },
  mp3Server: {
    path: '//XXXXXXXXXX/XXXXX/XXXXXX/XXX/ttsMP3/',
    serverAddress: 'http://xxx.xxx.xxx.xxx:8081',
  },
  muell: {
    calendarURL: 'https://xxxxxxxxxxxxxxxxxxxxx.de/abfuhrkalender?format=ical&street=xxxxxxxx&number=xx',
  },
  news: {
    rssUrl: 'https://www1.wdr.de/mediathek/audio/wdr-aktuell-news/wdr-aktuell-152.podcast',
    requestInterval: 30,
    keepMaxAge: 120,
  },
  polly: {
    mp3Path: '//xxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx/ttsMP3/',
    region: 'eu-central-1',
    signatureVersion: 'v4',
    accessKeyId: 'xxxxxxxxxxxxxxxxxxxx',
    secretAccessKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    voiceID: 'Vicki',
  },
  sonos: {
    active: false,
  },
  translationSettings: {
    language: 'en',
  },
  weather: {
    lattitude: 'xx.xxxxxx',
    longitude: 'xx.xxxxx',
    appid: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  dachs: {
    connectionOptions: {
      host: 'dachs.hoffmation.com',
      port: 8080,
      username: 'glt',
      resultConfig: {
        addRawValue: true,
        addKeyObject: true,
        flatten: true,
      },
    },
    refreshInterval: 30000,
    roomName: 'TestRoom',
  },
} as iConfig;
