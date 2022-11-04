import { iBaseDevice, Utils } from '../../server';

export abstract class DeviceSettings {
  public persist(device: iBaseDevice) {
    Utils.dbo?.persistDeviceSettings(device, this.toJSON());
  }

  public initializeFromDb(device: iBaseDevice) {
    Utils.dbo?.loadDeviceSettings(device).then((data) => {
      if (!data) {
        return;
      }
      this.fromJSON(data);
    });
  }

  public abstract fromJSON(data: string): void;

  protected abstract toJSON(): string;
}
