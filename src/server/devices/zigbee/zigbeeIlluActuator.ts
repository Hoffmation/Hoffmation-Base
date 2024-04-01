import { ZigbeeActuator } from './BaseDevices';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeIlluActuator extends ZigbeeActuator {
  protected readonly _stateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeIlluActuator) {
    super(pInfo, deviceType);
    this._stateIdState = `${pInfo.fullID}.state`;
  }
}
