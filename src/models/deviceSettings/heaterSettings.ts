import { DeviceSettings } from './deviceSettings';

export class HeaterSettings extends DeviceSettings {
  public automaticMode: boolean = true;
  public automaticFallBackTemperatur: number = 20;
  public useOwnTemperatur: boolean = true;
  /**
   * Whether this device should be controlled using only valve position
   * !! Only certain devices allow direct controlling of valve Position !!
   * @type {boolean}
   */
  public controlByPid: boolean = false;
  public controlByTempDiff: boolean = false;

  /**
   * Whether this device should turn off at Start of summer season and only heat in winter
   * @type {boolean}
   */
  public seasonalTurnOffActive: boolean = true;

  /**
   *
   * The day in a year after which SeasonalHeater should be turned off completly
   * @type {number}
   */
  public seasonTurnOffDay: number = 99;
  /**
   * The day in a year after which SeasonalHeater should be turned to automatic
   * @type {number}
   */
  public seasonTurnOnDay: number = 267;
}
