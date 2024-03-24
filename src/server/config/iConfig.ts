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

export interface iConfig {
  /**
   * The configuration for the Asus Router (if present)
   */
  asusConfig?: iAsusConfig;
  /**
   * The configuration for the Blue-Iris Instance (if present)
   * Blue-Iris is a software to manage IP-Cameras
   */
  blueIris?: iBlueIrisSettings;
  /**
   * The configuration for Daikin Air-Conditioning devices (if present)
   */
  daikin?: iDaikinSettings;
  /**
   * The configuration for the Dachs CHP (if present)
   * CHP = Combined Heat and Power (in german Block-Heiz-Kraftwerk)
   */
  dachs?: iDachsSettings;
  /**
   * The configuration for an Energy-Manager (if present).
   * This can be used to make proper use of excess energy (e.g. from solar panels)
   */
  energyManager?: iEnergyManagerSettings;
  /**
   * The configuration for Espresense devices (if present)
   * This can be used to monitor/tack/locate the position of certain bluetooth devices within the house.
   */
  espresense?: iEspresenseSettings;
  /**
   * The URL to the ioBroker instance.
   * @deprecated Please use the ioBroker property instead
   */
  ioBrokerUrl: string;
  /**
   * The settings for the ioBroker instance
   * Currently Hoffmation needs an ioBroker instance, but we might make it independent of it in the future.
   */
  ioBroker?: iIobrokerSettigns;
  /**
   * Whether any Govee devices are present in the house and should be included in Hoffmation.
   */
  goveeDevicesPresent?: boolean;
  /**
   * Additional settings for the heating system (if present)
   */
  heaterSettings?: iHeaterSettings;
  /**
   * The settings for the logging system.
   * There are different log-levels which can be set and debug-logging can be granular enabled
   */
  logSettings?: iLogSettings;
  /**
   * The settings for the mp3-server (if needed).
   * A mp3-server is mainly needed for playing text-to-speech messages on speakers (e.g. Sonos)
   */
  mp3Server?: iMp3Settings;
  /**
   * The settings for the Müll-Service (if needed).
   * Müll-Service is a service to remind you of the different waste collections.
   */
  muell?: iMuellSettings;
  /**
   * The settings for the news-service (if needed).
   * The news-service is used to download news-podcasts and play them on speakers (e.g. Sonos)
   */
  news?: iNewsSettings;
  /**
   * The settings for the persistence system.
   * The persistence system is used mainly for following things:
   * 1. To persists settings/configuration
   * 2. To persists the state of devices (e.g. to remember the last state of a light)
   * 3. To persists device data for Statistics
   */
  persistence?: iPersistenceSettings;
  /**
   * The settings for the polly-service (if needed).
   * This service is used to convert text to speech.
   */
  polly?: iPollySettings;
  /**
   * The default settings for rooms.
   */
  roomDefault: iRoomDefaultSettings;
  /**
   * The settings for the Sonos-Service (if present).
   */
  sonos?: iSonosSettings;
  /**
   * The settings for the telegram-service (if needed).
   * Telegram can be used to have a communication channel to the house and to receive notifications.
   */
  telegram?: iTelegramSettings;
  /**
   * The settings for the Tibber-Service (if needed).
   * Tibber is an energy provider which can be used to have hourly energy prices.
   */
  tibber?: iTibberSettings;
  /**
   * The settings for the time-service.
   */
  timeSettings: iTimeSettings;
  /**
   * The settings for the translation-service.
   * The translation-service is used to provide certain messages in the desired language.
   * Currently only german and english are supported.
   * @warning The translation-service is not yet fully implemented and only used in some cases.
   */
  translationSettings: iTranslationSettings;
  /**
   * The settings for the Unifi-Service (if needed).
   * Unifi is a network management system which can be used to monitor and control the network and devices.
   * Within Hoffmation it is mainly used to reconnect devices if they are not reachable.
   */
  unifiSettings?: iUnifiSettings;
  /**
   * The settings for the weather-service (if needed).
   * The weather-service is used to get weather data for the house location.
   */
  weather?: iWeatherSettings;
  /**
   * The settings for the Victron-Service (if present).
   * Victron is a energy management system which provides solar or battery power.
   */
  victron?: iVictronSettings;
}
