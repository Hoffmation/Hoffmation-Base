import { deviceConfig, LogLevel } from '../../../models';
import { ServerLogService } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { Devices } from '../devices';
import { VeluxDeviceRegistrationInfo } from './veluxDeviceRegistrationInfo';
import { VeluxShutter } from './veluxShutter';
import { VeluxDevice } from './veluxDevice';

export class VeluxService {
  private static readonly _registeredDevices: Map<string, VeluxDeviceRegistrationInfo> = new Map();

  public static preRegisterDevice(id: string, registrationInfo: VeluxDeviceRegistrationInfo): void {
    this._registeredDevices.set(id, registrationInfo);
  }

  public static processVeluxDevice(cDevConf: deviceConfig): void {
    const devName = cDevConf.common?.name;
    if (!devName || typeof devName !== 'string') {
      return;
    }
    const registrationInfo: VeluxDeviceRegistrationInfo | undefined = this._registeredDevices.get(devName);
    if (!registrationInfo) {
      ServerLogService.writeLog(LogLevel.Error, `SmartGarden Device ${devName} not registered`);
      return;
    }

    const ioBrokerDeviceInfo: IoBrokerDeviceInfo = new IoBrokerDeviceInfo(
      cDevConf,
      registrationInfo.deviceId,
      DeviceType[registrationInfo.deviceType],
      registrationInfo.room,
      registrationInfo.roomIndex,
    );
    const fullName: string = `${Devices.IDENTIFIER_VELUX}-${ioBrokerDeviceInfo.devID}`;
    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }
    ioBrokerDeviceInfo.allDevicesKey = fullName;
    let d: VeluxDevice;
    switch (registrationInfo.deviceType) {
      case DeviceType.VeluxShutter:
        d = new VeluxShutter(ioBrokerDeviceInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No Velux Device Type for ${registrationInfo.deviceType} defined`);
        return;
    }
    Devices.alLDevices[fullName] = d;
  }
}
