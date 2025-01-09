import { ExcessEnergyConsumerSettings } from '../excessEnergyConsumerSettings';
import { ObjectSettings } from '../objectSettings';
import { Utils } from '../../server';
import { BlockAutomaticSettings } from '../blockAutomaticSettings';

export abstract class DeviceSettings extends ObjectSettings {
  /**
   * Any device could be an energy consumer, so we have to provide the settings for it
   * @default undefined
   */
  public energySettings: ExcessEnergyConsumerSettings | undefined = undefined;

  /**
   * Any device could be an {@link iTemporaryDisableAutomatic} device, so we have to provide the settings for it
   * @default undefined
   */
  public blockAutomaticSettings: BlockAutomaticSettings | undefined = undefined;
  /**
   * Whether to skip this device in Homebridge-Hoffmation
   * @default false
   */
  public skipInHomebridge: boolean = false;

  public override fromPartialObject(_obj: Partial<DeviceSettings>): void {
    if (_obj.energySettings) {
      if (this.energySettings === undefined) {
        this.energySettings = new ExcessEnergyConsumerSettings();
      }
      this.energySettings.fromPartialObject(_obj.energySettings);
    }
    if (_obj.blockAutomaticSettings) {
      if (this.blockAutomaticSettings === undefined) {
        this.blockAutomaticSettings = new BlockAutomaticSettings();
      }
      this.blockAutomaticSettings.fromPartialObject(_obj.blockAutomaticSettings);
    }
    this.skipInHomebridge = _obj.skipInHomebridge ?? this.skipInHomebridge;
    super.fromPartialObject(_obj);
  }

  protected toJSON(): Partial<DeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
