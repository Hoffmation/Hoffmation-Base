import { ServerLogService } from '../log-service/index.js';
import { LogLevel } from '../../../models/index.js';
import { OwnGoveeDevice } from './own-govee-device.js';

export class OwnGoveeDevices {
  /**
   * A Dictionary of all own Govee devices
   */
  public static ownDevices: { [name: string]: OwnGoveeDevice } = {};

  public static addDevice(device: OwnGoveeDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.info.room}" addded`);
    this.ownDevices[device.deviceId] = device;
  }
}
