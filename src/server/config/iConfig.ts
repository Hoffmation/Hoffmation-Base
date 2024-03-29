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
import { iEspresenseSettings } from './iEspresenseSettings';
import { iTibberSettings } from './iTibberSettings';
import { iVictronSettings } from './iVictronSettings';
import { iDachsSettings } from './iDachsSettings';
import { iEnergyManagerSettings } from './iEnergyManagerSettings';
import { iUnifiSettings } from './iUnifiSettings';
import { iBlockAutomaticHandlerDefaults } from './iBlockAutomaticHandlerDefaults';
import { iRestSettings } from './iRestSettings';

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
   * Whether any Govee devices are present in the house and should be included in Hoffmation.
   */
  goveeDevicesPresent?: boolean;
  /**
   * @see iHeaterSettings
   */
  heaterSettings?: iHeaterSettings;
  /**
   * The URL to the ioBroker instance.
   * @deprecated Please use the ioBroker property instead
   */
  ioBrokerUrl: string;
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
