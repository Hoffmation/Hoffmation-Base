import { ServerLogService } from '../../../server/services/log-service';
import { LogLevel } from '../../logLevel';
import { RoomAddDeviceItem } from './roomAddDeviceItem';
import { DeviceType } from '../../../server/devices/deviceType';

export class RoomDeviceAddingSettings {
  public devices: Array<Array<RoomAddDeviceItem>> = [];

  constructor(public RoomName: string) {}

  public addDevice(
    deviceType: DeviceType,
    deviceTypeName: string,
    setID: (value: string) => void,
    index: number,
    customName: string | undefined = undefined,
  ): void {
    if (this.devices[deviceType] === undefined) {
      this.devices[deviceType] = [];
    }
    if (customName === undefined) {
      customName = `${this.RoomName} ${deviceTypeName}`;
    }
    this.devices[deviceType][index] = new RoomAddDeviceItem(setID, index, customName);
  }

  public checkMissing(): void {
    for (const type in this.devices) {
      const devs = this.devices[type];
      for (const index in devs) {
        const dev = devs[index];
        if (!dev.added) {
          ServerLogService.writeLog(LogLevel.Error, `${dev.customName} fehlt in der Device JSON`);
        }
      }
    }
  }
}
