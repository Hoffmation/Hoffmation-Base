import { iLogSettings } from './iLogSettings';
import { iSonosSettings } from './iSonosSettings';
import { iRoomDefaultSettings } from '../../models';
import { iNewsSettings } from './iNewsSettings';
import { iIobrokerSettigns } from './iIobrokerSettigns';
import { iPollySettings } from './iPollySettings';
import { iTelegramSettings } from './iTelegramSettings';
import { iWeatherSettings } from './iWeatherSettings';
import { iMp3Settings } from './iMp3Settings';
import { iPersistenceSettings } from './iPersistenceSettings';
import { iTimeSettings } from './iTimeSettings';
import { iAsusConfig } from './iAsusConfig';
import { iTranslationSettings } from './iTranslationSettings';
import { iMuellSettings } from './iMuellSettings';
import { iDaikinSettings } from './iDaikinSettings';
import { iHeaterSettings } from './iHeaterSettings';
import { iBlueIrisSettings } from './iBlueIrisSettings';
import { iRestSettings } from './iRestSettings';
import { iEspresenseSettings } from './iEspresenseSettings';
import { iTibberSettings } from './iTibberSettings';
import { iVictronSettings } from './iVictronSettings';
import { iDachsSettings } from './iDachsSettings';

export interface iConfig {
  asusConfig?: iAsusConfig;
  blueIris?: iBlueIrisSettings;
  daikin?: iDaikinSettings;
  dachs?: iDachsSettings;
  espresense?: iEspresenseSettings;
  // Earnigs per kWh injecting into the grid
  injectWattagePrice?: number;
  ioBrokerUrl: string;
  ioBroker?: iIobrokerSettigns;
  heaterSettings?: iHeaterSettings;
  logSettings?: iLogSettings;
  mp3Server?: iMp3Settings;
  muell?: iMuellSettings;
  news?: iNewsSettings;
  persistence?: iPersistenceSettings;
  polly?: iPollySettings;
  restServer?: iRestSettings;
  roomDefault: iRoomDefaultSettings;
  sonos?: iSonosSettings;
  telegram?: iTelegramSettings;
  tibber?: iTibberSettings;
  timeSettings: iTimeSettings;
  translationSettings: iTranslationSettings;
  // Price per kWh from the grid
  wattagePrice?: number;
  weather?: iWeatherSettings;
  victron?: iVictronSettings;
}
