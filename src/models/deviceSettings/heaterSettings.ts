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

  public fromJsonObject(data: Partial<HeaterSettings>): void {
    this.automaticMode = data.automaticMode ?? true;
    this.automaticFallBackTemperatur = data.automaticFallBackTemperatur ?? 20;
    this.useOwnTemperatur = data.useOwnTemperatur ?? true;
    this.controlByPid = data.controlByPid ?? false;
    this.controlByTempDiff = data.controlByTempDiff ?? false;
    this.seasonalTurnOffActive = data.seasonalTurnOffActive ?? true;
    this.seasonTurnOffDay = data.seasonTurnOffDay ?? 99;
    this.seasonTurnOnDay = data.seasonTurnOnDay ?? 267;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
