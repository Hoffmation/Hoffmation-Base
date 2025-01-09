import { ServerLogService } from '../log-service/index.js';
import { LogLevel } from '../../../models/index.js';
import { AcDevice } from './ac-device.js';
import { Devices } from '../../devices/index.js';

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
