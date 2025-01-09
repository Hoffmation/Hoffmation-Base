import { iLogSettings } from './iLogSettings.js';
import { iSonosSettings } from './iSonosSettings.js';
import { iRoomDefaultSettings } from '../../models/index.js';
import { iNewsSettings } from './iNewsSettings.js';
import { iIobrokerSettigns } from './iIobrokerSettigns.js';
import { iPollySettings } from './iPollySettings.js';
import { iTelegramSettings } from './iTelegramSettings.js';
import { iWeatherSettings } from './iWeatherSettings.js';
import { iMp3Settings } from './iMp3Settings.js';
import { iPersistenceSettings } from './iPersistenceSettings.js';
import { iTimeSettings } from './iTimeSettings.js';
import { iAsusConfig } from './iAsusConfig.js';
import { iTranslationSettings } from './iTranslationSettings.js';
import { iMuellSettings } from './iMuellSettings.js';
import { iDaikinSettings } from './iDaikinSettings.js';
import { iHeaterSettings } from './iHeaterSettings.js';
import { iBlueIrisSettings } from './iBlueIrisSettings.js';
import { iEspresenseSettings } from './iEspresenseSettings.js';
import { iTibberSettings } from './iTibberSettings.js';
import { iVictronSettings } from './iVictronSettings.js';
import { iDachsSettings } from './iDachsSettings.js';
import { iEnergyManagerSettings } from './iEnergyManagerSettings.js';
import { iUnifiSettings } from './iUnifiSettings.js';
import { iBlockAutomaticHandlerDefaults } from './iBlockAutomaticHandlerDefaults.js';
import { iRestSettings } from './iRestSettings.js';
import { iGoveeSettings } from './iGoveeSettings.js';

/**
 * The main configuration for Hoffmation normally stored in the `main-config.json` file.
 */
export interface iConfig {
  /**
   * @see iAsusConfig
   */
  asusConfig?: iAsusConfig;
  /**
   * @see i
   */
  blockAutomaticHandlerDefaults?: iBlockAutomaticHandlerDefaults;
  /**
   * @see iBlueIrisSettings
   */
  blueIris?: iBlueIrisSettings;
  /**
   * @see iDachsSettings
   */
  dachs?: iDachsSettings;
  /**
   * @see iDaikinSettings
   */
  daikin?: iDaikinSettings;
  /**
   * @see iEnergyManagerSettings
   */
  energyManager?: iEnergyManagerSettings;
  /**
   * @see iEspresenseSettings
   */
  espresense?: iEspresenseSettings;
  /**
   * @see iGoveeSettings
   */
  goveeSettings?: iGoveeSettings;
  /**
   * @see iHeaterSettings
   */
  heaterSettings?: iHeaterSettings;
  /**
   * The URL to the ioBroker instance.
   * @deprecated Please use the ioBroker property instead
   */
  ioBrokerUrl?: string;
  /**
   * @see iIobrokerSettigns
   */
  ioBroker?: iIobrokerSettigns;
  /**
   * @see iLogSettings
   */
  logSettings?: iLogSettings;
  /**
   * @see iMp3Settings
   */
  mp3Server?: iMp3Settings;
  /**
   * @see iMuellSettings
   */
  muell?: iMuellSettings;
  /**
   * @see iNewsSettings
   */
  news?: iNewsSettings;
  /**
   * @see iPersistenceSettings
   */
  persistence?: iPersistenceSettings;
  /**
   * @see iPollySettings
   */
  polly?: iPollySettings;
  /**
   * @see iRestSettings
   */
  restServer?: iRestSettings;
  /**
   * @see iRoomDefaultSettings
   */
  roomDefault: iRoomDefaultSettings;
  /**
   * @see iSonosSettings
   */
  sonos?: iSonosSettings;
  /**
   * @see iTelegramSettings
   */
  telegram?: iTelegramSettings;
  /**
   * @see iTibberSettings
   */
  tibber?: iTibberSettings;
  /**
   * @see iTimeSettings
   */
  timeSettings: iTimeSettings;
  /**
   * @see iTranslationSettings
   */
  translationSettings: iTranslationSettings;
  /**
   * @see iUnifiSettings
   */
  unifiSettings?: iUnifiSettings;
  /**
   * @see iVictronSettings
   */
  victron?: iVictronSettings;
  /**
   * @see iWeatherSettings
   */
  weather?: iWeatherSettings;
}
