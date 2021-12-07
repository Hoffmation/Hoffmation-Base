import { OwnSonosDevice } from './sonos-service';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models/logLevel';

export class OwnSonosDevices {
  public static ownDevices: { [name: string]: OwnSonosDevice } = {};

  public static addDevice(device: OwnSonosDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.roomName}" addded`);
    this.ownDevices[device.name] = device;
  }
}
