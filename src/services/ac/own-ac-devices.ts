import { AcDevice } from './ac-device';
import { ServerLogService } from '../../logging';
import { LogLevel } from '../../enums';
import { Devices } from '../../devices';

export class OwnAcDevices {
  /**
   * A dict containing the AC-Devices
   */
  public static ownDevices: { [name: string]: AcDevice } = {};

  public static addDevice(device: AcDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.info.room}" addded`);
    this.ownDevices[device.name] = device;
    Devices.alLDevices[device.id] = device;
  }
}
