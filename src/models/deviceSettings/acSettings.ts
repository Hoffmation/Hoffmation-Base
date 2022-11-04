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

  public fromPartialObject(data: Partial<AcSettings>): void {
    this.minimumHours = data.minimumHours ?? this.minimumHours;
    this.minimumMinutes = data.minimumMinutes ?? this.minimumMinutes;
    this.maximumHours = data.maximumHours ?? this.maximumHours;
    this.maximumMinutes = data.maximumMinutes ?? this.maximumMinutes;
    this.stopCoolingTemperatur = data.stopCoolingTemperatur ?? this.stopCoolingTemperatur;
    this.stopHeatingTemperatur = data.stopHeatingTemperatur ?? this.stopHeatingTemperatur;
    this.heatingAllowed = data.heatingAllowed ?? this.heatingAllowed;
    super.fromPartialObject(data);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
