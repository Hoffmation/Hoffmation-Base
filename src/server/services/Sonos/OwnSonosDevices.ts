import { OwnSonosDevice } from './sonos-service';
import { LogLevel } from '../../../models/logLevel';
import { ServerLogService } from '../log-service';


export class OwnSonosDevices {
  public static ownDevices: { [name: string]: OwnSonosDevice } = {};

  public static addDevice(device: OwnSonosDevice) {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.roomName}" addded`);
    this.ownDevices[device.name] = device;
  }
}
