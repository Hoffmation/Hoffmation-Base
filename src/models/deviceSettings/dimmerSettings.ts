import { ActuatorSettings } from './actuatorSettings';
import { iBaseDevice } from '../../server';

export class DimmerSettings extends ActuatorSettings {
  public nightBrightness: number = 50;
  public dawnBrightness: number = 75;
  public duskBrightness: number = 75;
  public dayBrightness: number = 100;
  public turnOnThreshhold: number = -1;

  public fromPartialObject(data: Partial<DimmerSettings>, device: iBaseDevice): void {
    this.nightBrightness = data.nightBrightness ?? this.nightBrightness;
    this.dawnBrightness = data.dawnBrightness ?? this.dawnBrightness;
    this.duskBrightness = data.duskBrightness ?? this.duskBrightness;
    this.dayBrightness = data.dayBrightness ?? this.dayBrightness;
    this.turnOnThreshhold = data.turnOnThreshhold ?? this.turnOnThreshhold;
    super.fromPartialObject(data, device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
