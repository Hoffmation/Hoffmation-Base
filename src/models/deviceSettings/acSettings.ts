import { DeviceSettings } from './deviceSettings';

export class AcSettings extends DeviceSettings {
  public minimumHours: number = 0;
  public minimumMinutes: number = 0;
  public maximumHours: number = 24;
  public maximumMinutes: number = 0;
  /**
   * The temperatur below which cooling should be stopped
   * @type {number}
   */
  public stopCoolingTemperatur: number = 22;
  /**
   * The temperatur above which heating should be stopped
   * @type {number}
   */
  public stopHeatingTemperatur: number = 21.0;
  /**
   * Heating can be forbidden completly e.g. for summer season
   * @type {boolean}
   */
  public heatingAllowed: boolean = false;
}
