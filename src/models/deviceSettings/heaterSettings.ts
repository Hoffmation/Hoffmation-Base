import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';
import { TemperatureSettings } from '../temperatureSettings';
import { iIdHolder } from '../iIdHolder';

export class HeaterSettings extends DeviceSettings {
  public automaticPoints: TemperatureSettings[] = [];
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
  /**
   * In case of pid Control the forced minimum percentage for this heater valve
   * @type {number}
   */
  public pidForcedMinimum: number = 1;

  public fromPartialObject(data: Partial<HeaterSettings>): void {
    this.automaticPoints = data.automaticPoints ?? this.automaticPoints;
    this.automaticMode = data.automaticMode ?? this.automaticMode;
    this.automaticFallBackTemperatur = data.automaticFallBackTemperatur ?? this.automaticFallBackTemperatur;
    this.useOwnTemperatur = data.useOwnTemperatur ?? this.useOwnTemperatur;
    this.controlByPid = data.controlByPid ?? this.controlByPid;
    this.controlByTempDiff = data.controlByTempDiff ?? this.controlByTempDiff;
    this.seasonalTurnOffActive = data.seasonalTurnOffActive ?? this.seasonalTurnOffActive;
    this.seasonTurnOffDay = data.seasonTurnOffDay ?? this.seasonTurnOffDay;
    this.seasonTurnOnDay = data.seasonTurnOnDay ?? this.seasonTurnOnDay;
    this.pidForcedMinimum = data.pidForcedMinimum ?? this.pidForcedMinimum;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<HeaterSettings> {
    return Utils.jsonFilter(this);
  }

  public deleteAutomaticPoint(name: string, device: iIdHolder): void {
    const currentIndex = this.automaticPoints.findIndex((v) => v.name === name);
    if (currentIndex === -1) {
      return;
    }
    this.automaticPoints.splice(currentIndex, 1);
    this.persist(device);
  }

  public setAutomaticPoint(setting: TemperatureSettings, device: iIdHolder): void {
    const currentIndex = this.automaticPoints.findIndex((v) => v.name === setting.name);
    if (currentIndex === -1) {
      this.automaticPoints.push(setting);
    } else {
      this.automaticPoints[currentIndex] = setting;
    }
    this.persist(device);
  }
}
