import { iBaseDevice, Utils } from '../../server';
import { LogLevel } from '../logLevel';
import { ExcessEnergyConsumerSettings } from '../excessEnergyConsumerSettings';

export abstract class DeviceSettings {
  public energySettings: ExcessEnergyConsumerSettings | undefined = undefined;

  public persist(device: iBaseDevice) {
    Utils.dbo?.persistSettings(device.id, JSON.stringify(this), device.info.customName);
  }

  public initializeFromDb(device: iBaseDevice) {
    Utils.dbo?.loadSettings(device.id).then((data) => {
      if (!data) {
        // Nothing in db yet
        return;
      }
      let obj: Partial<DeviceSettings> | null = null;
      try {
        obj = JSON.parse(data);
      } catch (e: any) {
        device.log(LogLevel.Error, `Failed to parse Device Setting JSON (${e})`);
      }
      if (!obj) {
        return;
      }
      this.fromPartialObject(obj);
      if (JSON.stringify(this) !== data) {
        this.persist(device);
      }
    });
  }

  public fromPartialObject(_obj: Partial<DeviceSettings>): void {
    if (_obj.energySettings) {
      if (this.energySettings === undefined) {
        this.energySettings = new ExcessEnergyConsumerSettings();
      }
      this.energySettings.fromPartialObject(_obj.energySettings);
    }
  }

  protected toJSON(): Partial<DeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
