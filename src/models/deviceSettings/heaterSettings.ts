import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class HeaterSettings extends DeviceSettings {
  public automaticMode: boolean = true;
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
  /**
   * In case of pid Control the forced minimum percentage for this heater valve
   * @type {number}
   */
  public pidForcedMinimum: number = 1;

  /**
   * Whether this AC should be turned off for some time manually
   * @type {boolean}
   */
  public manualDisabled: boolean = false;

  public fromPartialObject(data: Partial<HeaterSettings>): void {
    this.automaticMode = data.automaticMode ?? this.automaticMode;
    this.useOwnTemperatur = data.useOwnTemperatur ?? this.useOwnTemperatur;
    this.controlByPid = data.controlByPid ?? this.controlByPid;
    this.controlByTempDiff = data.controlByTempDiff ?? this.controlByTempDiff;
    this.seasonalTurnOffActive = data.seasonalTurnOffActive ?? this.seasonalTurnOffActive;
    this.seasonTurnOffDay = data.seasonTurnOffDay ?? this.seasonTurnOffDay;
    this.seasonTurnOnDay = data.seasonTurnOnDay ?? this.seasonTurnOnDay;
    this.pidForcedMinimum = data.pidForcedMinimum ?? this.pidForcedMinimum;
    this.manualDisabled = data.manualDisabled ?? this.manualDisabled;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<HeaterSettings> {
    return Utils.jsonFilter(this);
  }
}
