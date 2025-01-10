import { iAsusConfig } from './iAsusConfig';
import { iBlockAutomaticHandlerDefaults } from './iBlockAutomaticHandlerDefaults';
import {
  iBlueIrisSettings,
  iDachsSettings,
  iDaikinSettings,
  iEnergyManagerSettings,
  iEspresenseSettings,
  iGoveeSettings,
  iHeaterSettings,
  iMp3Settings,
  iMuellSettings,
  iNewsSettings,
  iPersistenceSettings,
  iPollySettings,
  iRestSettings,
  iRoomDefaultSettings,
  iSonosSettings,
  iTelegramSettings,
  iTibberSettings,
  iTimeSettings,
  iTranslationSettings,
  iUnifiSettings,
  iVictronSettings,
  iWeatherSettings,
} from './settings';
import { iIobrokerSettigns } from './iIobrokerSettigns';
import { iLogSettings } from './iLogSettings';

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
