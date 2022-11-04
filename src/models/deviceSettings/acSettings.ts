import { DeviceSettings } from './deviceSettings';

export class AcSettings extends DeviceSettings {
  public minimumHours: number = 0;
  public minimumMinutes: number = 0;
  public maximumHours: number = 24;
  public maximumMinutes: number = 0;
  /**
   * The temperature below which cooling should be stopped
   * @type {number}
   */
  public stopCoolingTemperatur: number = 22;
  /**
   * The temperature above which heating should be stopped
   * @type {number}
   */
  public stopHeatingTemperatur: number = 21.0;
  /**
   * Heating can be forbidden completly e.g. for summer season
   * @type {boolean}
   */
  public heatingAllowed: boolean = false;

  public fromJsonObject(data: Partial<AcSettings>): void {
    this.minimumHours = data.minimumHours ?? 0;
    this.minimumMinutes = data.minimumMinutes ?? 0;
    this.maximumHours = data.maximumHours ?? 24;
    this.maximumMinutes = data.maximumMinutes ?? 0;
    this.stopCoolingTemperatur = data.stopCoolingTemperatur ?? 22;
    this.stopHeatingTemperatur = data.stopHeatingTemperatur ?? 21;
    this.heatingAllowed = data.heatingAllowed ?? false;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
