import { ZigbeeActuator } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../../enums';

export class ZigbeeIlluActuator extends ZigbeeActuator {
  protected readonly _actuatorOnStateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeIlluActuator) {
    super(pInfo, deviceType);
    this._actuatorOnStateIdState = `${pInfo.fullID}.state`;
  }
}
