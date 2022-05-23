import { HeaterSettings } from './heaterSettings';

export class SeasonalHeaterSettings extends HeaterSettings {
  /**
   * Whether this device should turn off at Start of summer season and only heat in winter
   * @type {boolean}
   */
  seasonalTurnOffActive: boolean = true;

  /**
   *
   * The day in a year after which SeasonalHeater should be turned off completly
   * @type {number}
   */
  seasonTurnOffDay: number = 99;
  /**
   * The day in a year after which SeasonalHeater should be turned to automatic
   * @type {number}
   */
  seasonTurnOnDay: number = 267;
}
