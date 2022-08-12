import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { AcDevice } from './ac-device';
import { Devices } from '../../devices';

export class OwnAcDevices {
  public static ownDevices: { [name: string]: AcDevice } = {};

  public static addDevice(device: AcDevice): void {
    ServerLogService.writeLog(LogLevel.Info, `Device ${device.name} for room "${device.info.room}" addded`);
    this.ownDevices[device.name] = device;
    Devices.alLDevices[device.id] = device;
  }
}
