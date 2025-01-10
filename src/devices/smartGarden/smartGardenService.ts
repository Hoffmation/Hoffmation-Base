import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { Devices } from '../devices';
import { SmartGardenDevice } from './smartGardenDevice';
import { SmartGardenSensor } from './smartGardenSensor';
import { SmartGardenMower } from './smartGardenMower';
import { SmartGardenValve } from './smartGardenValve';
import { SmartGardenDeviceRegistrationInfo } from './smartGardenDeviceRegistrationInfo';
import { LogLevel, ServerLogService } from '../../logging';
import { deviceConfig } from '../../models/deviceConfig';

export class SmartGardenService {
  private static readonly _registeredDevices: Map<string, SmartGardenDeviceRegistrationInfo> = new Map();

  public static preRegisterDevice(id: string, registrationInfo: SmartGardenDeviceRegistrationInfo): void {
    this._registeredDevices.set(id, registrationInfo);
  }

  public static processSmartGardenDevice(cDevConf: deviceConfig): void {
    const devName = cDevConf.common?.name;
    if (!devName || typeof devName !== 'string') {
      return;
    }
    const registrationInfo: SmartGardenDeviceRegistrationInfo | undefined = this._registeredDevices.get(devName);
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
    const fullName: string = `${Devices.IDENTIFIER_SMART_GARDEN}-${ioBrokerDeviceInfo.devID}`;
    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }
    ioBrokerDeviceInfo.allDevicesKey = fullName;
    let d: SmartGardenDevice;
    switch (registrationInfo.deviceType) {
      case DeviceType.SmartGardenSensor:
        d = new SmartGardenSensor(ioBrokerDeviceInfo);
        break;
      case DeviceType.SmartGardenMower:
        d = new SmartGardenMower(ioBrokerDeviceInfo);
        break;
      case DeviceType.SmartGardenValve:
        d = new SmartGardenValve(ioBrokerDeviceInfo);
        break;
      default:
        ServerLogService.writeLog(
          LogLevel.Warn,
          `No SmartGarden Device Type for ${registrationInfo.deviceType} defined`,
        );
        return;
    }
    Devices.alLDevices[fullName] = d;
  }
}
