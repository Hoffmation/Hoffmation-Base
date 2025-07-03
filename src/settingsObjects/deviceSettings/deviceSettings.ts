import { iBlockAutomaticSettings, iDeviceSettings, iExcessEnergyConsumerSettings } from '../../interfaces';
import { Utils } from '../../utils';
import { BlockAutomaticSettings } from '../blockAutomaticSettings';
import { ObjectSettings } from '../objectSettings';
import { ExcessEnergyConsumerSettings } from '../excessEnergyConsumerSettings';
import { BlockAutomaticCommand, iBaseCommand } from '../../command';

export abstract class DeviceSettings extends ObjectSettings implements iDeviceSettings {
  buildBlockAutomaticCommand(c: iBaseCommand): BlockAutomaticCommand | null | undefined {
    if (this.blockAutomaticSettings?.dontBlockAutomaticIfNotProvided) {
      return null;
    }
    return new BlockAutomaticCommand(
      c,
      this.blockAutomaticSettings?.blockAutomaticDurationMS,
      '',
      this.blockAutomaticSettings?.defaultCollisionSolving,
      this.blockAutomaticSettings?.revertToAutomaticAtBlockLift,
    );
  }

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
