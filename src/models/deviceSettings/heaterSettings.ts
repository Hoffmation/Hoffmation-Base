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

  public fromPartialObject(data: Partial<HeaterSettings>): void {
    this.automaticMode = data.automaticMode ?? this.automaticMode;
    this.automaticFallBackTemperatur = data.automaticFallBackTemperatur ?? this.automaticFallBackTemperatur;
    this.useOwnTemperatur = data.useOwnTemperatur ?? this.useOwnTemperatur;
    this.controlByPid = data.controlByPid ?? this.controlByPid;
    this.controlByTempDiff = data.controlByTempDiff ?? this.controlByTempDiff;
    this.seasonalTurnOffActive = data.seasonalTurnOffActive ?? this.seasonalTurnOffActive;
    this.seasonTurnOffDay = data.seasonTurnOffDay ?? this.seasonTurnOffDay;
    this.seasonTurnOnDay = data.seasonTurnOnDay ?? this.seasonTurnOnDay;
    super.fromPartialObject(data);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
