import { ActuatorSettings } from './actuatorSettings';
import { Utils } from '../../server';

export class DimmerSettings extends ActuatorSettings {
  public nightBrightness: number = 50;
  public dawnBrightness: number = 75;
  public duskBrightness: number = 75;
  public dayBrightness: number = 100;
  public turnOnThreshhold: number = -1;

  public override fromPartialObject(data: Partial<DimmerSettings>): void {
    this.nightBrightness = data.nightBrightness ?? this.nightBrightness;
    this.dawnBrightness = data.dawnBrightness ?? this.dawnBrightness;
    this.duskBrightness = data.duskBrightness ?? this.duskBrightness;
    this.dayBrightness = data.dayBrightness ?? this.dayBrightness;
    this.turnOnThreshhold = data.turnOnThreshhold ?? this.turnOnThreshhold;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<DimmerSettings> {
    return Utils.jsonFilter(this);
  }
}
