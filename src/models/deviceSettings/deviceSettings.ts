import { iBaseDevice, Utils } from '../../server';
import { LogLevel } from '../logLevel';
import { ExcessEnergyConsumerSettings } from '../excessEnergyConsumerSettings';

export abstract class DeviceSettings {
  public energySettings: ExcessEnergyConsumerSettings | undefined = undefined;

  public persist(device: iBaseDevice) {
    Utils.dbo?.persistDeviceSettings(device, JSON.stringify(this));
  }

  public initializeFromDb(device: iBaseDevice) {
    Utils.dbo?.loadDeviceSettings(device).then((data) => {
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
      if (this.toJSON() !== data) {
        this.persist(device);
      }
    });
  }

  public fromPartialObject(_obj: Partial<DeviceSettings>): void {
    if (_obj.energyConsumerSettings) {
      if (this.energyConsumerSettings === undefined) {
        this.energyConsumerSettings = new ExcessEnergyConsumerSettings();
      }
      this.energyConsumerSettings.fromPartialObject(_obj.energyConsumerSettings);
    }
  }

  protected toJSON(): Partial<DeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
