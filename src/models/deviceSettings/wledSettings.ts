import { DimmerSettings } from './dimmerSettings';
import { Utils } from '../../server';

export class WledSettings extends DimmerSettings {
  public override dayOn: boolean = false;
  public override dayBrightness: number = 100;
  public override dawnOn: boolean = true;
  public override dawnBrightness: number = 50;
  public override duskOn: boolean = true;
  public override duskBrightness: number = 50;
  public override nightOn: boolean = true;
  public override nightBrightness: number = 2;
  public dawnPreset?: number;
  public dayPreset?: number;
  public duskPreset?: number;
  public nightPreset?: number;

  public fromPartialObject(data: Partial<WledSettings>): void {
    this.dawnPreset = data.dawnPreset ?? this.dawnPreset;
    this.dayPreset = data.dayPreset ?? this.dayPreset;
    this.duskPreset = data.duskPreset ?? this.duskPreset;
    this.nightPreset = data.nightPreset ?? this.nightPreset;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<WledSettings> {
    return Utils.jsonFilter(this);
  }
}
