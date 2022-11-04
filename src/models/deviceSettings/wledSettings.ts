import { DimmerSettings } from './dimmerSettings';
import { iBaseDevice } from '../../server';

export class WledSettings extends DimmerSettings {
  public dayOn: boolean = false;
  public dayBrightness: number = 100;
  public dawnOn: boolean = true;
  public dawnBrightness: number = 50;
  public duskOn: boolean = true;
  public duskBrightness: number = 50;
  public nightOn: boolean = true;
  public nightBrightness: number = 2;
  public dawnPreset?: number;
  public dayPreset?: number;
  public duskPreset?: number;
  public nightPreset?: number;

  public fromPartialObject(data: Partial<WledSettings>, device: iBaseDevice): void {
    super.fromPartialObject(data, device, true);
    this.dayOn = data.dayOn ?? this.dayOn;
    this.dayBrightness = data.dayBrightness ?? this.dayBrightness;
    this.dawnOn = data.dawnOn ?? this.dawnOn;
    this.dawnBrightness = data.dawnBrightness ?? this.dawnBrightness;
    this.duskOn = data.duskOn ?? this.duskOn;
    this.duskBrightness = data.duskBrightness ?? this.duskBrightness;
    this.nightOn = data.nightOn ?? this.nightOn;
    this.nightBrightness = data.nightBrightness ?? this.nightBrightness;
    this.dawnPreset = data.dawnPreset ?? this.dawnPreset;
    this.dayPreset = data.dayPreset ?? this.dayPreset;
    this.duskPreset = data.duskPreset ?? this.duskPreset;
    this.nightPreset = data.nightPreset ?? this.nightPreset;
    this.persist(device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
