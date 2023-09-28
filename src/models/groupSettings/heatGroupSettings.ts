import { Utils } from '../../server';
import { TemperatureSettings } from '../temperatureSettings';
import { iIdHolder } from '../iIdHolder';
import { GroupSettings } from './groupSettings';

export class HeatGroupSettings extends GroupSettings {
  public automaticPoints: TemperatureSettings[] = [];
  public automaticMode: boolean = true;

  /**
   * Target temperature when automaticMode is disabled
   * @type {number}
   */
  public manualTemperature: number = 20;

  public fromPartialObject(data: Partial<HeatGroupSettings>): void {
    this.automaticPoints = data.automaticPoints ?? this.automaticPoints;
    this.automaticMode = data.automaticMode ?? this.automaticMode;
    this.manualTemperature = data.manualTemperature ?? this.manualTemperature;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<HeatGroupSettings> {
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
