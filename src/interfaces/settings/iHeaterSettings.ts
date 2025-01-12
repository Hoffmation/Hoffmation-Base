import { iDeviceSettings } from '../deviceSettings';

/**
 * Additional settings for the heating system (if present)
 */
export interface iHeaterSettings extends iDeviceSettings {
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
