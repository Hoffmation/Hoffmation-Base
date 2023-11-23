import { ExcessEnergyConsumerSettings } from '../excessEnergyConsumerSettings';
import { ObjectSettings } from '../objectSettings';
import { Utils } from '../../server';

export abstract class DeviceSettings extends ObjectSettings {
  public energySettings: ExcessEnergyConsumerSettings | undefined = undefined;

  public override fromPartialObject(_obj: Partial<DeviceSettings>): void {
    if (_obj.energySettings) {
      if (this.energySettings === undefined) {
        this.energySettings = new ExcessEnergyConsumerSettings();
      }
      this.energySettings.fromPartialObject(_obj.energySettings);
    }
    super.fromPartialObject(_obj);
  }

  protected toJSON(): Partial<DeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
