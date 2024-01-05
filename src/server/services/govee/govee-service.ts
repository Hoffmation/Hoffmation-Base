import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { OwnGoveeDevice } from './own-govee-device';
import {
  Device as GoveeDevice,
  DeviceStateInfo as GoveeDeviceStateInfo,
  Govee,
  GoveeDeviceEventTypes,
  GoveeEventTypes,
} from '@j3lte/govee-lan-controller';
import { DeviceState as GoveeDeviceState } from '@j3lte/govee-lan-controller/build/types/device';
import { GoveeDeviceData, GoveeDeviceStatusData } from '@j3lte/govee-lan-controller/build/types/types';

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
      discover: true,
      discoverInterval: 300_000,
    });
    this.goveeApi.on(GoveeEventTypes.Scan, (data: GoveeDeviceData) => {
      ServerLogService.writeLog(LogLevel.Info, `GoveeDevice ${data.ip} scanned`);
    });
    this.goveeApi.on(GoveeEventTypes.Ready, () => {
      ServerLogService.writeLog(LogLevel.Info, `Govee ready`);
    });
    this.goveeApi.on(GoveeEventTypes.Error, (err) => {
      ServerLogService.writeLog(LogLevel.Error, `Govee-Error: ${err}`);
    });
    this.goveeApi.on(GoveeEventTypes.NewDevice, (device: GoveeDevice) => {
      ServerLogService.writeLog(LogLevel.Trace, `GoveeDevice ${device.id} joined`);
      GooveeService.initializeDevice(device);
    });
    this.goveeApi.on(GoveeEventTypes.UnknownDevice, (_data: GoveeDeviceStatusData) => {
      ServerLogService.writeLog(LogLevel.Warn, `GoveeDevice unknown`);
    });
    this.goveeApi.discover();
  }

  private static initializeDevice(d: GoveeDevice) {
    this.devicesDict[d.id] = d;
    if (this.ownDevices[d.id] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unknown Govee Device "${d.id}"`);
      return;
    }
    const ownDevice = this.ownDevices[d.id];
    ownDevice.device = d;
    ownDevice.update(d.getState());

    d.on(GoveeDeviceEventTypes.StateChange, (data: GoveeDeviceState & GoveeDeviceStateInfo) => {
      ServerLogService.writeLog(LogLevel.Debug, `Govee ${d.id} state changed`);
      this.updateDevice(d, data);
    });
    ServerLogService.writeLog(LogLevel.Debug, `Govee ${d.id} found at address ${d.ipAddr}`);
  }

  private static updateDevice(device: GoveeDevice, data: GoveeDeviceState & GoveeDeviceStateInfo): void {
    if (this.ownDevices[device.id] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unknown Govee Device "${device.id}"`);
      return;
    }
    this.ownDevices[device.id].update(data);
  }
}
