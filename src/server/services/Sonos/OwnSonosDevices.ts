import { ServerLogService } from '../log-service/index.js';
import { LogLevel } from '../../../models/index.js';
import { OwnSonosDevice } from './own-sonos-device.js';

export class OwnSonosDevices {
  /**
   * A Map containing all Sonos devices in the house identified by {@link OwnSonosDevice.discoveryName}
   */
  public static ownDevices: { [name: string]: OwnSonosDevice } = {};

  public static addDevice(device: OwnSonosDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.info.room}" addded`);
    this.ownDevices[device.discoveryName] = device;
  }
}
