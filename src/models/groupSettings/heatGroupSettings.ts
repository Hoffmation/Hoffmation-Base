import { Utils } from '../../utils';
import { iHeatGroupSettings, iIdHolder, iTemperatureSettings } from '../../interfaces';
import { GroupSettings } from './groupSettings';

export class HeatGroupSettings extends GroupSettings implements iHeatGroupSettings {
  /**
   * The automatic points to use for the temperature calculation in automatic mode
   */
  public automaticPoints: iTemperatureSettings[] = [];
  /**
   * Whether the temperature should be calculated automatically, or the manualTemperature should be used
   * @default true
   */
  public automaticMode: boolean = true;
  /**
   * The temperature to fall back to when automaticMode is enabled and no automaticPoint is found
   * @default 20 Degrees Celsius
   */
  public automaticFallBackTemperatur: number = 20;
  /**
   * Target temperature when automaticMode is disabled
   * @default 20
   */
  public manualTemperature: number = 20;

  public fromPartialObject(data: Partial<HeatGroupSettings>): void {
    this.automaticPoints = data.automaticPoints ?? this.automaticPoints;
    this.automaticMode = data.automaticMode ?? this.automaticMode;
    this.manualTemperature = data.manualTemperature ?? this.manualTemperature;
    this.automaticFallBackTemperatur = data.automaticFallBackTemperatur ?? this.automaticFallBackTemperatur;
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<HeatGroupSettings> {
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

  public setAutomaticPoint(setting: iTemperatureSettings, device: iIdHolder): void {
    const currentIndex = this.automaticPoints.findIndex((v) => v.name === setting.name);
    if (currentIndex === -1) {
      this.automaticPoints.push(setting);
    } else {
      this.automaticPoints[currentIndex] = setting;
    }
    this.persist(device);
  }
}
