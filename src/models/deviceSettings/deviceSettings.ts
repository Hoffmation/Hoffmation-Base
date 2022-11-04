import { iBaseDevice, Utils } from '../../server';
import { LogLevel } from '../logLevel';

export abstract class DeviceSettings {
  public persist(device: iBaseDevice) {
    Utils.dbo?.persistDeviceSettings(device, this.toJSON());
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
      this.fromJsonObject(obj);
    });
  }

  public abstract fromJsonObject(obj: Partial<DeviceSettings>): void;

  protected abstract toJSON(): string;
}
