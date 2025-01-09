import { ZigbeeActuator } from './BaseDevices/index.js';
import { DeviceType } from '../deviceType.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';

export class ZigbeeIlluActuator extends ZigbeeActuator {
  protected readonly _actuatorOnStateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeIlluActuator) {
    super(pInfo, deviceType);
    this._actuatorOnStateIdState = `${pInfo.fullID}.state`;
  }
}
