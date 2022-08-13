import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { OwnSonosDevice } from './own-sonos-device';

export class OwnSonosDevices {
  public static ownDevices: { [name: string]: OwnSonosDevice } = {};

  public static addDevice(device: OwnSonosDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.info.room}" addded`);
    this.ownDevices[device.discoveryName] = device;
  }
}
