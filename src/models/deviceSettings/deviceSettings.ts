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
      this.fromPartialObject(obj);
      if (this.toJSON() !== data) {
        this.persist(device);
      }
    });
  }

  public fromPartialObject(_obj: Partial<DeviceSettings>): void {
    // Nothing
  }

  protected abstract toJSON(): string;
}
