import { iBlockAutomaticSettings, iDeviceSettings, iExcessEnergyConsumerSettings } from '../../interfaces';
import { BlockAutomaticSettings, ExcessEnergyConsumerSettings, ObjectSettings } from '../../models';
import { Utils } from '../../utils';

export abstract class DeviceSettings extends ObjectSettings implements iDeviceSettings {
  /**
   * Any device could be an energy consumer, so we have to provide the settings for it
   * @default undefined
   */
  public energySettings: iExcessEnergyConsumerSettings | undefined = undefined;

  /**
   * Any device could be an {@link iTemporaryDisableAutomatic} device, so we have to provide the settings for it
   * @default undefined
   */
  public blockAutomaticSettings: iBlockAutomaticSettings | undefined = undefined;
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

  public toJSON(): Partial<DeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
