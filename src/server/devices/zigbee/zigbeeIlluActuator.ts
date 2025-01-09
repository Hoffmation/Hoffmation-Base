import { ZigbeeActuator } from './BaseDevices';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeIlluActuator extends ZigbeeActuator {
  protected readonly _actuatorOnStateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeIlluActuator) {
    super(pInfo, deviceType);
    this._actuatorOnStateIdState = `${pInfo.fullID}.state`;
  }
}
