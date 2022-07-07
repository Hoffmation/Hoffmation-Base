import { OwnDaikinDevice } from './own-daikin-device';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';

export class OwnDaikinDevices {
  public static ownDevices: { [name: string]: OwnDaikinDevice } = {};

  public static addDevice(device: OwnDaikinDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.roomName}" addded`);
    this.ownDevices[device.name] = device;
  }
}
