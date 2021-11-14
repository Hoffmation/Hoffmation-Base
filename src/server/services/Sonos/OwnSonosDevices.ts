import { OwnSonosDevice } from 'index';
import { LogLevel } from 'index';
import { ServerLogService } from 'index';

export class OwnSonosDevices {
  public static ownDevices: { [name: string]: OwnSonosDevice } = {};

  public static addDevice(device: OwnSonosDevice) {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.roomName}" addded`);
    this.ownDevices[device.name] = device;
  }
}
