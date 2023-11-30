import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import Govee, { Device as GoveeDevice, DeviceState as GoveeDeviceState } from 'theimo1221-govee-lan-control';
import { OwnGoveeDevice } from './own-govee-device';

export class GooveeService {
  public static all: GoveeDevice[] = [];
  public static devicesDict: { [name: string]: GoveeDevice } = {};
  private static goveeApi: Govee;
  private static ownDevices: { [name: string]: OwnGoveeDevice } = {};

  public static addOwnDevices(gvDevice: { [name: string]: OwnGoveeDevice }): void {
    this.ownDevices = gvDevice;
  }

  public static initialize(): void {
    ServerLogService.writeLog(LogLevel.Debug, `Initializing Goovee-Service`);
    this.all = [];
    this.goveeApi = new Govee({
      discoverInterval: 10 * 60 * 1000, // 10 minutes is enough
      logger: (message) => {
        ServerLogService.writeLog(LogLevel.Debug, `Govee: ${message}`);
      },
      errorLogger: (message) => {
        if (message.startsWith('UDP Socket was not')) {
          return;
        }
        ServerLogService.writeLog(LogLevel.Error, `Govee: ${message}`);
      },
    });
    this.goveeApi.on('deviceAdded', (device: GoveeDevice) => {
      ServerLogService.writeLog(LogLevel.Info, `GoveeDevice ${device.deviceID} joined`);
      GooveeService.initializeDevice(device);
    });
    this.goveeApi.on('updatedStatus', (device: GoveeDevice, data: GoveeDeviceState, _stateChanged: unknown) => {
      GooveeService.updateDevice(device, data);
    });
  }

  private static initializeDevice(d: GoveeDevice) {
    this.devicesDict[d.deviceID] = d;
    if (this.ownDevices[d.deviceID] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unknown Govee Device "${d.deviceID}"`);
      return;
    }
    this.ownDevices[d.deviceID].device = d;
    ServerLogService.writeLog(LogLevel.Debug, `Govee ${d.deviceID} found at address ${d.ip}`);
  }

  private static updateDevice(device: GoveeDevice, data: GoveeDeviceState): void {
    if (this.ownDevices[device.deviceID] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unknown Govee Device "${device.deviceID}"`);
      return;
    }
    this.ownDevices[device.deviceID].update(data);
  }
}
