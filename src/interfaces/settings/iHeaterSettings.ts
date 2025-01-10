import { HeatingMode } from '../../enums';
import { iDeviceSettings } from '../deviceSettings';

/**
 * Additional settings for the heating system (if present)
 */
export interface iHeaterSettings extends iDeviceSettings {
  /**
   * Whether heating with ac is allowed
   * This normally depends on the cost difference between ac heating and conventional heating
   */
  allowAcHeating?: boolean;
  /**
   * The desired Heating mode of the house.
   * As of today you have to manually switch between summer and winter.
   * TODO: Add heating Mode change to persisted settings and allow controlling it via the app
   */
  mode?: HeatingMode;
  /**
   *
   */
  automaticMode: boolean;
  /**
   *
   */
  useOwnTemperatur: boolean;
  /**
   *
   */
  useOwnTemperatureForRoomTemperature: boolean;
  /**
   *
   */
  controlByPid: boolean;
  /**
   *
   */
  controlByTempDiff: boolean;
  /**
   *
   */
  seasonalTurnOffActive: boolean;
  /**
   *
   */
  seasonTurnOffDay: number;
  /**
   *
   */
  seasonTurnOnDay: number;
  /**
   *
   */
  pidForcedMinimum: number;
  /**
   *
   */
  manualDisabled: boolean;

  /**
   *
   */
  fromPartialObject(_obj: Partial<iHeaterSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iHeaterSettings>;
}
