import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class HeaterSettings extends DeviceSettings {
  /**
   * Whether this device should be in automatic mode
   * @default true
   */
  public automaticMode: boolean = true;
  /**
   * Whether this device should use it's own temperature or just rely on the room temperature (e.g. for a floor heating system being in a different room)
   * @default true
   */
  public useOwnTemperatur: boolean = true;
  /**
   * Whether this devices temperature measurement should be included in the room temperature calculation.
   */
  public useOwnTemperatureForRoomTemperature: boolean = true;
  /**
   * Whether this device should be controlled using only valve position
   * @default false
   * @warning Only certain devices allow direct controlling of valve Position
   */
  public controlByPid: boolean = false;
  /**
   * Whether this device should be controlled by offsetting the device temperature and it's target temperature.
   * @default false
   * @remark This is mainly needed for devices not allowing a separate control of valve position or temperature.
   */
  public controlByTempDiff: boolean = false;

  /**
   * Whether this device should turn off at Start of summer season and only heat in winter
   * @default true
   */
  public seasonalTurnOffActive: boolean = true;

  /**
   * The day in a year after which SeasonalHeater should be turned off completly
   * @default 99 (Roughly in April)
   */
  public seasonTurnOffDay: number = 99;
  /**
   * The day in a year after which SeasonalHeater should be turned to automatic
   * @default 267 (Roughly in September)
   */
  public seasonTurnOnDay: number = 267;
  /**
   * In case of pid Control the forced minimum percentage for this heater valve
   * @default 1
   */
  public pidForcedMinimum: number = 1;

  /**
   * Whether this Heater should be turned off for some time manually
   * @default false
   */
  public manualDisabled: boolean = false;

  public fromPartialObject(data: Partial<HeaterSettings>): void {
    this.automaticMode = data.automaticMode ?? this.automaticMode;
    this.useOwnTemperatur = data.useOwnTemperatur ?? this.useOwnTemperatur;
    this.useOwnTemperatureForRoomTemperature =
      data.useOwnTemperatureForRoomTemperature ?? this.useOwnTemperatureForRoomTemperature;
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
